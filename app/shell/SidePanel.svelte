<script lang="ts">
    import { sidePanelVisible, repoConfigEvent, selectionHeaders, revisionSelectEvent, highlightedBranch, ignoreToggled } from "../stores";
    import Icon from "../controls/Icon.svelte";
    import { mutate } from "../ipc";
    import type { GitFetch } from "../messages/GitFetch";
    import type { GitPush } from "../messages/GitPush";
    import type { UndoOperation } from "../messages/UndoOperation";
    import type { StoreRef } from "../messages/StoreRef";
    import type { RevHeader } from "../messages/RevHeader";
    import RevisionMutator from "../mutators/RevisionMutator";

    let collapsed: Record<string, boolean> = {};

    function toggle(section: string) {
        collapsed[section] = !collapsed[section];
    }

    function allLocalBookmarks(headers: RevHeader[]): { ref: Extract<StoreRef, { type: "LocalBookmark" }>, header: RevHeader }[] {
        const seen = new Set<string>();
        const result: { ref: Extract<StoreRef, { type: "LocalBookmark" }>, header: RevHeader }[] = [];
        for (const header of headers) {
            for (const ref of header.refs) {
                if (ref.type === "LocalBookmark" && !seen.has(ref.bookmark_name)) {
                    seen.add(ref.bookmark_name);
                    result.push({ ref: ref as Extract<StoreRef, { type: "LocalBookmark" }>, header });
                }
            }
        }
        return result.sort((a, b) => a.ref.bookmark_name.localeCompare(b.ref.bookmark_name));
    }

    function allTags(headers: RevHeader[]): { ref: Extract<StoreRef, { type: "Tag" }>, header: RevHeader }[] {
        const seen = new Set<string>();
        const result: { ref: Extract<StoreRef, { type: "Tag" }>, header: RevHeader }[] = [];
        for (const header of headers) {
            for (const ref of header.refs) {
                if (ref.type === "Tag" && !seen.has(ref.tag_name)) {
                    seen.add(ref.tag_name);
                    result.push({ ref: ref as Extract<StoreRef, { type: "Tag" }>, header });
                }
            }
        }
        return result.sort((a, b) => a.ref.tag_name.localeCompare(b.ref.tag_name));
    }

    function shortDesc(header: RevHeader): string {
        return header.description.lines[0] || "(no description)";
    }

    function shortId(header: RevHeader): string {
        return header.id.commit.hex.slice(0, 8);
    }

    function checkout(header: RevHeader) {
        revisionSelectEvent.set({ from: header.id, to: header.id });
    }

    function onFetch(remote_name: string) {
        mutate<GitFetch>("git_fetch", {
            refspec: { type: "AllBookmarks", remote_name },
            input: null,
        }, { operation: `Fetching from ${remote_name}...` });
    }

    function onPush(remote_name: string) {
        mutate<GitPush>("git_push", {
            refspec: { type: "AllBookmarks", remote_name },
            input: null,
        }, { operation: `Pushing to ${remote_name}...` });
    }

    // Resizable panel
    let panelWidth = 240;
    let resizing = false;

    function startResize(e: MouseEvent) {
        e.preventDefault();
        resizing = true;
        const startX = e.clientX;
        const startW = panelWidth;
        function onMove(e: MouseEvent) {
            panelWidth = Math.max(180, Math.min(400, startW + e.clientX - startX));
        }
        function onUp() {
            resizing = false;
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
        }
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
    }

    function onUndo() {
        mutate<UndoOperation>("undo_operation", null);
    }

    function isRevisionEnabled(headers: RevHeader[], ignoreImmutable: boolean = false) {
        const isSingleton = headers.length == 1;
        const anyImmutable = !ignoreImmutable && headers.some((h) => h.is_immutable);
        const hasSingleParent = headers[headers.length - 1]?.parent_ids.length == 1;
        return {
            new_child: true,
            new_parent: !anyImmutable && hasSingleParent,
            edit: isSingleton && !anyImmutable && !headers[0]?.is_working_copy,
            duplicate: true,
            abandon: !anyImmutable,
            squash: !anyImmutable && hasSingleParent,
            restore: isSingleton && !anyImmutable && hasSingleParent,
            bookmark: isSingleton,
        };
    }

    $: workspace = $repoConfigEvent?.type === "Workspace" ? $repoConfigEvent : null;
    $: localBranches = allLocalBookmarks($selectionHeaders);
    $: tags = allTags($selectionHeaders);
    $: mutator = $selectionHeaders.length > 0 ? new RevisionMutator($selectionHeaders, $ignoreToggled) : null;
    $: revisionEnabled = $selectionHeaders.length > 0 ? isRevisionEnabled($selectionHeaders, $ignoreToggled) : null;
</script>

{#if $sidePanelVisible}
    <aside class="side-panel" style="width: {panelWidth}px; min-width: {panelWidth}px">
        <div class="panel-header">
            <span class="panel-title">
                <Icon name="git-branch" />
                {#if workspace}
                    {workspace.absolute_path.split(/[\\/]/).pop()}
                {:else}
                    GG
                {/if}
            </span>
            <button type="button" class="panel-close" on:click={() => sidePanelVisible.set(false)} title="Close panel">
                <Icon name="x" />
            </button>
        </div>

        <div class="panel-body">
            <!-- LOCAL BRANCHES -->
            <div class="section">
                <button type="button" class="section-header" on:click={() => toggle("local")}>
                    <Icon name={collapsed["local"] ? "chevron-right" : "chevron-down"} />
                    <span class="section-label">Local</span>
                    <span class="section-count">{localBranches.length}</span>
                </button>
                {#if !collapsed["local"]}
                    <ul class="section-list">
                        {#each localBranches as { ref, header }}
                            <li>
                                <button
                                    type="button"
                                    class="branch-item"
                                    class:wc={header.is_working_copy}
                                    title={shortDesc(header)}
                                    on:click={() => checkout(header)}
                                    on:mouseenter={() => highlightedBranch.set(ref.bookmark_name)}
                                    on:mouseleave={() => highlightedBranch.set(null)}>
                                    <Icon name="git-branch" />
                                    <span class="branch-name">{ref.bookmark_name}</span>
                                    {#if !ref.is_synced}<span class="badge badge-warn">+</span>{/if}
                                    {#if ref.has_conflict}<span class="badge badge-error">!</span>{/if}
                                    {#if header.is_working_copy}<span class="badge badge-active">●</span>{/if}
                                </button>
                            </li>
                        {/each}
                    </ul>
                {/if}
            </div>

            <!-- REMOTES -->
            {#if workspace && workspace.git_remotes.length > 0}
                <div class="section">
                    <button type="button" class="section-header" on:click={() => toggle("remotes")}>
                        <Icon name={collapsed["remotes"] ? "chevron-right" : "chevron-down"} />
                        <span class="section-label">Remotes</span>
                        <span class="section-count">{workspace.git_remotes.length}</span>
                    </button>
                    {#if !collapsed["remotes"]}
                        <ul class="section-list">
                            {#each workspace.git_remotes as remote}
                                <li>
                                    <div class="remote-row">
                                        <span class="remote-name"><Icon name="cloud" /> {remote}</span>
                                        <div class="remote-btns">
                                            <button type="button" class="mini-btn" title="Fetch" on:click={() => onFetch(remote)}>
                                                <Icon name="download-cloud" />
                                            </button>
                                            <button type="button" class="mini-btn" title="Push" on:click={() => onPush(remote)}>
                                                <Icon name="upload-cloud" />
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            {/each}
                        </ul>
                    {/if}
                </div>
            {/if}

            <!-- TAGS -->
            <div class="section">
                <button type="button" class="section-header" on:click={() => toggle("tags")}>
                    <Icon name={collapsed["tags"] ? "chevron-right" : "chevron-down"} />
                    <span class="section-label">Tags</span>
                    <span class="section-count">{tags.length}</span>
                </button>
                {#if !collapsed["tags"]}
                    <ul class="section-list">
                        {#if tags.length === 0}
                            <li class="empty-hint">No tags</li>
                        {:else}
                            {#each tags as { ref, header }}
                                <li>
                                    <button type="button" class="branch-item" title={shortDesc(header)} on:click={() => checkout(header)}>
                                        <Icon name="tag" />
                                        <span class="branch-name">{ref.tag_name}</span>
                                    </button>
                                </li>
                            {/each}
                        {/if}
                    </ul>
                {/if}
            </div>

            <!-- REVISION ACTIONS -->
            {#if $selectionHeaders.length > 0}
                <div class="section">
                    <button type="button" class="section-header" on:click={() => toggle("actions")}>
                        <Icon name={collapsed["actions"] ? "chevron-right" : "chevron-down"} />
                        <span class="section-label">Actions</span>
                        <span class="section-count">{$selectionHeaders.length} sel</span>
                    </button>
                    {#if !collapsed["actions"]}
                        <div class="action-buttons">
                            <button class="action-btn" on:click={() => mutator?.handle("new_child")} disabled={!revisionEnabled?.new_child} title="New child">
                                <Icon name="plus" /> New child
                            </button>
                            <button class="action-btn" on:click={() => mutator?.handle("edit")} disabled={!revisionEnabled?.edit} title="Edit as working copy">
                                <Icon name="edit-3" /> Edit
                            </button>
                            <button class="action-btn" on:click={() => mutator?.handle("duplicate")} disabled={!revisionEnabled?.duplicate} title="Duplicate">
                                <Icon name="copy" /> Duplicate
                            </button>
                            <button class="action-btn" on:click={() => mutator?.handle("squash")} disabled={!revisionEnabled?.squash} title="Squash into parent">
                                <Icon name="minimize-2" /> Squash
                            </button>
                            <button class="action-btn" on:click={() => mutator?.handle("restore")} disabled={!revisionEnabled?.restore} title="Restore from parent">
                                <Icon name="maximize-2" /> Restore
                            </button>
                            <button class="action-btn" on:click={() => mutator?.handle("bookmark")} disabled={!revisionEnabled?.bookmark} title="Create bookmark">
                                <Icon name="bookmark" /> Bookmark
                            </button>
                            <button class="action-btn danger" on:click={() => mutator?.handle("abandon")} disabled={!revisionEnabled?.abandon} title="Abandon">
                                <Icon name="trash-2" /> Abandon
                            </button>
                        </div>
                    {/if}
                </div>
            {/if}

            <!-- UNDO -->
            {#if workspace}
                <div class="section">
                    <div class="action-buttons">
                        <button class="action-btn" on:click={onUndo} title="Undo last operation">
                            <Icon name="rotate-ccw" /> Undo
                        </button>
                    </div>
                </div>
            {/if}
        </div>

        <!-- Resize handle -->
        <div class="resize-handle" class:active={resizing} on:mousedown={startResize} role="separator" aria-orientation="vertical"></div>
    </aside>
{/if}

<style>
    .side-panel {
        display: flex;
        flex-direction: column;
        background: var(--ctp-mantle);
        border-right: 1px solid var(--ctp-overlay0);
        overflow: hidden;
        user-select: none;
        position: relative;
    }

    .panel-header {
        height: 38px;
        min-height: 38px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 10px;
        background: var(--ctp-surface0);
        border-bottom: 1px solid var(--ctp-overlay0);
    }

    .panel-title {
        font-size: 12px;
        font-weight: 700;
        color: var(--ctp-text);
        display: flex;
        align-items: center;
        gap: 6px;
        font-family: var(--stack-industrial);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .panel-title :global(svg) {
        flex-shrink: 0;
        width: 14px;
        height: 14px;
        color: var(--ctp-blue);
    }

    .panel-close {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid transparent;
        border-radius: 4px;
        background: transparent;
        color: var(--ctp-subtext0);
        cursor: pointer;
        padding: 0;
        transition: all 100ms ease;
    }

    .panel-close:hover {
        background: var(--ctp-surface1);
        color: var(--ctp-text);
    }

    .panel-body {
        flex: 1;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: var(--ctp-overlay0) transparent;
    }

    .panel-body::-webkit-scrollbar {
        width: 6px;
    }

    .panel-body::-webkit-scrollbar-thumb {
        background: var(--ctp-overlay0);
        border-radius: 3px;
    }

    /* Collapsible sections */
    .section {
        border-bottom: 1px solid var(--ctp-surface0);
    }

    .section-header {
        display: flex;
        align-items: center;
        gap: 4px;
        width: 100%;
        padding: 8px 10px;
        border: none;
        background: var(--ctp-base);
        color: var(--ctp-text);
        font-size: 11px;
        font-weight: 700;
        font-family: var(--stack-industrial);
        text-transform: uppercase;
        letter-spacing: 0.04em;
        cursor: pointer;
        transition: background 80ms ease;
    }

    .section-header:hover {
        background: var(--ctp-surface0);
    }

    .section-header :global(svg) {
        width: 12px;
        height: 12px;
        flex-shrink: 0;
        color: var(--ctp-subtext0);
    }

    .section-label {
        flex: 1;
        text-align: left;
    }

    .section-count {
        font-size: 10px;
        color: var(--ctp-subtext0);
        font-weight: 600;
        min-width: 16px;
        text-align: right;
    }

    .section-list {
        list-style: none;
        padding: 2px 0;
        margin: 0;
    }

    .branch-item {
        display: flex;
        align-items: center;
        gap: 6px;
        width: 100%;
        padding: 4px 10px 4px 26px;
        border: none;
        background: transparent;
        color: var(--ctp-text);
        font-size: 12px;
        font-family: inherit;
        cursor: pointer;
        text-align: left;
        transition: background 80ms ease;
        overflow: hidden;
    }

    .branch-item:hover {
        background: var(--ctp-surface0);
    }

    .branch-item :global(svg) {
        width: 13px;
        height: 13px;
        flex-shrink: 0;
        color: var(--ctp-subtext0);
    }

    .branch-item.wc {
        color: var(--ctp-green);
    }

    .branch-item.wc :global(svg) {
        color: var(--ctp-green);
    }

    .branch-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        pointer-events: none;
    }

    .badge {
        font-size: 9px;
        font-weight: 700;
        flex-shrink: 0;
        pointer-events: none;
        padding: 0 4px;
        height: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 3px;
    }

    .badge-warn {
        background: var(--ctp-yellow);
        color: var(--ctp-base);
    }

    .badge-error {
        background: var(--ctp-red);
        color: white;
    }

    .badge-active {
        color: var(--ctp-green);
        background: transparent;
        font-size: 10px;
    }

    .empty-hint {
        font-size: 11px;
        color: var(--ctp-subtext0);
        padding: 6px 26px;
        font-style: italic;
        pointer-events: none;
    }

    /* Remote rows */
    .remote-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 10px 4px 26px;
        font-size: 12px;
        pointer-events: none;
    }

    .remote-name {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--ctp-text);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .remote-name :global(svg) {
        width: 13px;
        height: 13px;
        flex-shrink: 0;
        color: var(--ctp-subtext0);
    }

    .remote-btns {
        display: flex;
        gap: 2px;
        pointer-events: auto;
    }

    .mini-btn {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: 4px;
        background: transparent;
        color: var(--ctp-subtext0);
        cursor: pointer;
        padding: 0;
        transition: all 80ms ease;
    }

    .mini-btn:hover {
        background: var(--ctp-surface1);
        color: var(--ctp-text);
    }

    .mini-btn :global(svg) {
        width: 13px;
        height: 13px;
    }

    /* Action buttons */
    .action-buttons {
        padding: 4px 10px 8px;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .action-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        width: 100%;
        padding: 5px 8px;
        border: none;
        border-radius: 4px;
        background: transparent;
        color: var(--ctp-text);
        font-size: 11px;
        font-family: var(--stack-industrial);
        cursor: pointer;
        text-align: left;
        transition: background 80ms ease;
    }

    .action-btn:hover:not(:disabled) {
        background: var(--ctp-surface0);
    }

    .action-btn:disabled {
        color: var(--ctp-overlay0);
        cursor: not-allowed;
    }

    .action-btn :global(svg) {
        width: 13px;
        height: 13px;
        flex-shrink: 0;
    }

    .action-btn.danger:not(:disabled) {
        color: var(--ctp-red);
    }

    /* Resize handle */
    .resize-handle {
        position: absolute;
        top: 0;
        right: -2px;
        width: 4px;
        height: 100%;
        cursor: col-resize;
        z-index: 10;
        pointer-events: auto;
    }

    .resize-handle:hover,
    .resize-handle.active {
        background: var(--ctp-blue);
        opacity: 0.5;
    }
</style>
