<script lang="ts">
    import { rightActiveActivity, rightPanelVisible, repoConfigEvent, selectionHeaders, revisionSelectEvent, ignoreToggled } from "../stores";
    import Icon from "../controls/Icon.svelte";
    import { mutate } from "../ipc";
    import type { GitFetch } from "../messages/GitFetch";
    import type { GitPush } from "../messages/GitPush";
    import type { UndoOperation } from "../messages/UndoOperation";
    import type { StoreRef } from "../messages/StoreRef";
    import type { RevHeader } from "../messages/RevHeader";
    import RefMutator from "../mutators/RefMutator";
    import ActionWidget from "../controls/ActionWidget.svelte";
    import RevisionMutator from "../mutators/RevisionMutator";

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

    function onUndo() {
        mutate<UndoOperation>("undo_operation", null);
    }

    $: workspace = $repoConfigEvent?.type === "Workspace" ? $repoConfigEvent : null;
    $: localBranches = allLocalBookmarks($selectionHeaders);
    $: tags = allTags($selectionHeaders);

    function isRevisionEnabled(headers: RevHeader[], ignoreImmutable: boolean = false) {
        const isSingleton = headers.length == 1;
        const anyImmutable = !ignoreImmutable && headers.some((h) => h.is_immutable);
        const hasSingleParent = headers[headers.length - 1]?.parent_ids.length == 1;

        return {
            new_child: true,
            new_parent: !anyImmutable && hasSingleParent,
            edit: isSingleton && !anyImmutable && !headers[0]?.is_working_copy,
            revert: true,
            duplicate: true,
            abandon: !anyImmutable,
            squash: !anyImmutable && hasSingleParent,
            restore: isSingleton && !anyImmutable && hasSingleParent,
            bookmark: isSingleton,
        };
    }

    $: mutator = $selectionHeaders.length > 0 ? new RevisionMutator($selectionHeaders, $ignoreToggled) : null;
    $: revisionEnabled = $selectionHeaders.length > 0 ? isRevisionEnabled($selectionHeaders, $ignoreToggled) : null;
</script>

{#if $rightPanelVisible}
    <aside class="right-side-panel" data-activity={$rightActiveActivity}>
        <div class="panel-header">
            <div class="header-accent"></div>
            <button type="button" class="panel-close" on:click={() => rightPanelVisible.set(false)} title="Close panel">
                <Icon name="x" />
            </button>
            <span class="panel-title">
                {#if $rightActiveActivity === "repository"}
                    <span class="title-icon">◐</span> Repository
                {:else if $rightActiveActivity === "revision"}
                    <span class="title-icon">◉</span> Revision
                {/if}
            </span>
        </div>

        <div class="panel-body">

            {#if $rightActiveActivity === "repository"}
                <div class="actions-container">
                    <div class="action-section">
                        <div class="section-header"><Icon name="folder" /> Repository</div>
                        <button class="sidebar-btn" on:click={() => {}}>
                            <Icon name="folder-plus" /> Init...
                        </button>
                        <button class="sidebar-btn" on:click={() => {}}>
                            <Icon name="download-cloud" /> Clone...
                        </button>
                        <button class="sidebar-btn" on:click={() => {}}>
                            <Icon name="folder" /> Open...
                        </button>
                        <button class="sidebar-btn" on:click={() => {}} disabled={!workspace}>
                            <Icon name="refresh-cw" /> Reopen
                        </button>
                    </div>
                    {#if workspace}
                        <div class="action-section">
                            <div class="section-header"><Icon name="git-pull-request" /> Git</div>
                            <button class="sidebar-btn" on:click={onUndo} disabled={!workspace}>
                                <Icon name="rotate-ccw" /> Undo
                            </button>
                            {#each workspace.git_remotes as remote}
                                <button class="sidebar-btn" on:click={() => onFetch(remote)}>
                                    <Icon name="download-cloud" /> Fetch {remote}
                                </button>
                                <button class="sidebar-btn" on:click={() => onPush(remote)}>
                                    <Icon name="upload-cloud" /> Push {remote}
                                </button>
                            {/each}
                        </div>
                    {/if}
                </div>

            {:else if $rightActiveActivity === "revision"}
                {#if $selectionHeaders.length === 0}
                    <p class="hint">Select a commit in the graph to view revision actions.</p>
                {:else}
                    <div class="actions-container">
                        <div class="action-section">
                            <div class="section-header"><Icon name="plus-circle" /> Create</div>
                            <button class="sidebar-btn" on:click={() => mutator?.handle("new_child")} disabled={!revisionEnabled?.new_child} title="New child">
                                <Icon name="corner-down-right" /> New child
                            </button>
                            <button class="sidebar-btn" on:click={() => mutator?.handle("new_parent")} disabled={!revisionEnabled?.new_parent} title="New inserted parent">
                                <Icon name="corner-up-left" /> New parent
                            </button>
                        </div>
                        <div class="action-section">
                            <div class="section-header"><Icon name="edit-2" /> Modify</div>
                            <button class="sidebar-btn" on:click={() => mutator?.handle("edit")} disabled={!revisionEnabled?.edit} title="Edit as working copy">
                                <Icon name="edit-3" /> Edit
                            </button>
                            <button class="sidebar-btn" on:click={() => mutator?.handle("revert")} disabled={!revisionEnabled?.revert} title="Revert into working copy">
                                <Icon name="refresh-cw" /> Revert
                            </button>
                            <button class="sidebar-btn" on:click={() => mutator?.handle("duplicate")} disabled={!revisionEnabled?.duplicate} title="Duplicate">
                                <Icon name="copy" /> Duplicate
                            </button>
                            <button class="sidebar-btn danger" on:click={() => mutator?.handle("abandon")} disabled={!revisionEnabled?.abandon} title="Abandon">
                                <Icon name="trash-2" /> Abandon
                            </button>
                        </div>
                        <div class="action-section">
                            <div class="section-header"><Icon name="git-merge" /> Combine</div>
                            <button class="sidebar-btn" on:click={() => mutator?.handle("squash")} disabled={!revisionEnabled?.squash} title="Squash into parent">
                                <Icon name="arrow-up" /> Squash
                            </button>
                            <button class="sidebar-btn" on:click={() => mutator?.handle("restore")} disabled={!revisionEnabled?.restore} title="Restore from parent">
                                <Icon name="arrow-down" /> Restore
                            </button>
                        </div>
                        <div class="action-section">
                            <div class="section-header"><Icon name="bookmark" /> Bookmark</div>
                            <button class="sidebar-btn" on:click={() => mutator?.handle("bookmark")} disabled={!revisionEnabled?.bookmark} title="Create bookmark">
                                <Icon name="plus" /> Create bookmark
                            </button>
                        </div>
                    </div>
                    <div class="selection-divider"></div>
                    <div class="selection-header">
                        <span class="sh-count">{$selectionHeaders.length} selected</span>
                    </div>
                    {#each $selectionHeaders as header}
                        <div class="change-commit compact">
                            <div class="change-id">{shortId(header)}</div>
                            <div class="change-desc">{shortDesc(header)}</div>
                        </div>
                    {/each}
                {/if}
            {/if}

        </div>
    </aside>
{/if}

<style>
    /* Activity-specific accent colors */
    .right-side-panel { --accent: #ff6b9d; }
    .right-side-panel[data-activity="repository"] { --accent: #ff8c42; }
    .right-side-panel[data-activity="revision"] { --accent: #00d4aa; }

    .right-side-panel {
        width: 240px;
        min-width: 240px;
        display: flex;
        flex-direction: column;
        background:
            linear-gradient(180deg, var(--ctp-base) 0%, var(--ctp-mantle) 100%);
        border-left: 2px solid var(--ctp-overlay0);
        overflow: hidden;
        user-select: none;
        position: relative;
    }

    /* Subtle grid pattern overlay */
    .right-side-panel::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image:
            linear-gradient(var(--ctp-overlay0) 1px, transparent 1px),
            linear-gradient(90deg, var(--ctp-overlay0) 1px, transparent 1px);
        background-size: 20px 20px;
        opacity: 0.05;
        pointer-events: none;
        z-index: 0;
    }

    .panel-header {
        height: 48px;
        min-height: 48px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 12px;
        background: linear-gradient(180deg, var(--ctp-surface0) 0%, var(--ctp-surface1) 100%);
        border-bottom: 2px solid var(--ctp-overlay0);
        position: relative;
        z-index: 1;
    }

    .header-accent {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg,
            transparent 0%,
            var(--accent) 20%,
            var(--accent) 80%,
            transparent 100%
        );
        box-shadow: 0 2px 8px var(--accent);
    }

    .panel-title {
        font-size: 12px;
        font-weight: 800;
        color: var(--ctp-text);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        display: flex;
        align-items: center;
        gap: 6px;
        font-family: var(--stack-industrial);
    }

    .title-icon {
        color: var(--accent);
        font-size: 14px;
        filter: drop-shadow(0 0 4px var(--accent));
    }

    .panel-close {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid var(--ctp-overlay0);
        border-radius: 8px;
        background: var(--ctp-surface1);
        color: var(--ctp-subtext0);
        cursor: pointer;
        padding: 0;
        transition: all 120ms ease;
        order: -1;
    }

    .panel-close:hover {
        border-color: var(--accent);
        color: var(--accent);
        box-shadow: 0 0 8px var(--accent);
        transform: translateY(-1px);
    }

    .panel-close:active {
        transform: translateY(0);
    }

    .panel-body {
        flex: 1;
        overflow-y: auto;
        padding: 10px 8px;
        scrollbar-width: thin;
        scrollbar-color: var(--accent) transparent;
        z-index: 1;
    }

    .panel-body::-webkit-scrollbar {
        width: 6px;
    }

    .panel-body::-webkit-scrollbar-thumb {
        background: var(--accent);
        border-radius: 3px;
    }

    .hint {
        font-size: 11px;
        color: var(--ctp-subtext0);
        padding: 6px 10px;
        margin: 0 0 8px 0;
        pointer-events: none;
        font-style: italic;
        border-left: 2px solid var(--ctp-overlay0);
    }

    .info-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        font-size: 12px;
        color: var(--ctp-text);
        pointer-events: none;
        background: var(--ctp-surface0);
        border-radius: 8px;
        margin-bottom: 4px;
        border: 1px solid transparent;
    }

    .info-row:hover {
        border-color: var(--ctp-overlay0);
    }

    .info-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .item-list {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-radius: 10px;
        font-size: 12px;
        color: var(--ctp-text);
        background: var(--ctp-surface0);
        border: 2px solid transparent;
        transition: all 120ms ease;
        overflow: hidden;
    }

    .item:hover {
        border-color: var(--accent);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        transform: translateX(-2px);
    }

    .item.wc {
        background: linear-gradient(90deg, var(--ctp-surface0) 0%, rgba(0, 212, 170, 0.1) 100%);
        border-right-color: #00d4aa;
        border-left-color: transparent;
    }

    .item.wc > .item-main { color: #00d4aa; }

    .item-main {
        flex: 1;
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 10px;
        background: transparent;
        border: none;
        cursor: pointer;
        color: inherit;
        font-size: inherit;
        text-align: left;
        overflow: hidden;
        min-width: 0;
    }

    .item-main.no-click { cursor: default; }

    .item-main:not(.no-click):hover {
        color: var(--accent);
    }

    .item-label {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        pointer-events: none;
        font-weight: 500;
    }

    .item-id {
        font-size: 10px;
        font-family: var(--stack-code);
        color: var(--ctp-subtext0);
        padding: 0 8px 0 0;
        flex-shrink: 0;
        pointer-events: none;
    }

    .badge {
        font-size: 10px;
        font-weight: 800;
        flex-shrink: 0;
        pointer-events: none;
        min-width: 16px;
        height: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
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
        background: var(--ctp-green);
        color: var(--ctp-base);
    }

    .actions-container {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 4px;
    }

    .action-section {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 4px;
        background: var(--ctp-surface0);
        border-radius: 8px;
        margin-bottom: 4px;
    }

    .section-header {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 8px;
        font-size: 11px;
        font-weight: 700;
        font-family: var(--stack-industrial);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--accent);
        border-bottom: 1px solid var(--ctp-overlay0);
        margin-bottom: 2px;
    }

    .sidebar-btn {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 10px;
        background: transparent;
        border: 1px solid transparent;
        border-radius: 6px;
        color: var(--ctp-text);
        font-size: 13px;
        font-family: inherit;
        cursor: pointer;
        transition: all 120ms ease;
        text-align: left;
    }

    .sidebar-btn:hover:not(:disabled) {
        background: var(--ctp-surface1);
        border-color: var(--ctp-overlay0);
    }

    .sidebar-btn:hover:not(:disabled) :global(svg) {
        color: var(--accent);
        filter: drop-shadow(0 0 3px var(--accent));
    }

    .sidebar-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    .sidebar-btn.danger:hover:not(:disabled) {
        background: var(--ctp-red);
        border-color: var(--ctp-red);
        color: white;
    }

    .sidebar-btn.danger:hover:not(:disabled) :global(svg) {
        color: white;
        filter: none;
    }

    .action-bar.vertical {
        flex-direction: column;
        align-items: stretch;
    }

    .action-bar.vertical > :global(button) {
        justify-content: flex-start;
        gap: 8px;
    }

    .selection-divider {
        height: 2px;
        background: var(--ctp-overlay0);
        margin: 8px 4px;
        border-radius: 1px;
    }

    .selection-header {
        padding: 6px 4px;
        margin: 4px 0;
        text-align: center;
    }

    .sh-count {
        font-size: 11px;
        font-weight: 600;
        color: var(--ctp-subtext0);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .change-commit {
        padding: 10px 12px;
        border-radius: 10px;
        border-right: 3px solid var(--accent);
        border-left: none;
        background: var(--ctp-surface0);
        margin-bottom: 6px;
        pointer-events: none;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .change-commit.compact {
        padding: 6px 10px;
        margin-bottom: 4px;
    }

    .change-id {
        font-size: 10px;
        font-family: var(--stack-code);
        color: var(--ctp-subtext0);
    }

    .change-desc {
        font-size: 12px;
        color: var(--ctp-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        font-weight: 500;
    }

    .change-author {
        font-size: 11px;
        color: var(--ctp-subtext0);
        margin-top: 4px;
    }

    .remote-item {
        flex-direction: column;
        align-items: stretch;
        padding: 6px;
    }

    .remote-actions {
        display: flex;
        gap: 6px;
        padding: 6px 8px 4px;
    }

    .action-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 5px 10px;
        border: 2px solid var(--ctp-overlay0);
        border-radius: 6px;
        background: var(--ctp-surface1);
        color: var(--ctp-text);
        font-size: 11px;
        cursor: pointer;
        font-weight: 600;
        transition: all 120ms ease;
    }

    .action-btn:hover {
        background: var(--accent);
        border-color: var(--accent);
        color: var(--ctp-base);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }

    .action-btn:active {
        transform: translateY(0);
    }

    .setting-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        font-size: 12px;
        background: var(--ctp-surface0);
        border-radius: 10px;
        margin-bottom: 6px;
        border: 2px solid transparent;
        transition: all 120ms ease;
        pointer-events: none;
    }

    .setting-row:hover {
        border-color: var(--ctp-overlay0);
    }

    .setting-label {
        color: var(--ctp-subtext1);
        font-weight: 500;
    }

    .setting-value {
        color: var(--accent);
        font-family: var(--stack-code);
        font-size: 11px;
        font-weight: 700;
        background: rgba(0,0,0,0.2);
        padding: 2px 8px;
        border-radius: 4px;
    }
</style>
