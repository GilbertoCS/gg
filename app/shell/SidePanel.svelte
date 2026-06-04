<script lang="ts">
    import { activeActivity, sidePanelVisible, repoConfigEvent, selectionHeaders, revisionSelectEvent, ignoreToggled } from "../stores";
    import Icon from "../controls/Icon.svelte";
    import { mutate } from "../ipc";
    import type { GitFetch } from "../messages/GitFetch";
    import type { GitPush } from "../messages/GitPush";
    import type { StoreRef } from "../messages/StoreRef";
    import type { RevHeader } from "../messages/RevHeader";
    import RefMutator from "../mutators/RefMutator";

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

    $: workspace = $repoConfigEvent?.type === "Workspace" ? $repoConfigEvent : null;
    $: localBranches = allLocalBookmarks($selectionHeaders);
    $: tags = allTags($selectionHeaders);
</script>

{#if $sidePanelVisible}
    <aside class="side-panel" data-activity={$activeActivity}>
        <div class="panel-header">
            <div class="header-accent"></div>
            <span class="panel-title">
                {#if $activeActivity === "graph"}
                    <span class="title-icon">◈</span> Graph
                {:else if $activeActivity === "branches"}
                    <span class="title-icon">⚡</span> Branches
                {:else if $activeActivity === "changes"}
                    <span class="title-icon">◉</span> Changes
                {:else if $activeActivity === "remotes"}
                    <span class="title-icon">◐</span> Remotes
                {:else if $activeActivity === "tags"}
                    <span class="title-icon">★</span> Tags
                {:else if $activeActivity === "settings"}
                    <span class="title-icon">◆</span> Settings
                {/if}
            </span>
            <button type="button" class="panel-close" on:click={() => sidePanelVisible.set(false)} title="Close panel">
                <Icon name="x" />
            </button>
        </div>

        <div class="panel-body">

            {#if $activeActivity === "graph"}
                {#if workspace}
                    <p class="hint">Repository</p>
                    <div class="info-row"><Icon name="folder" /><span class="info-text">{workspace.absolute_path}</span></div>
                    <div class="info-row"><Icon name="git-branch" /><span class="info-text">{localBranches.length} branches</span></div>
                    <div class="info-row"><Icon name="tag" /><span class="info-text">{tags.length} tags</span></div>
                    <div class="info-row"><Icon name="cloud" /><span class="info-text">{workspace.git_remotes.length} remotes</span></div>
                {:else}
                    <p class="hint">No workspace loaded.</p>
                {/if}

            {:else if $activeActivity === "branches"}
                {#if localBranches.length === 0}
                    <p class="hint">No local bookmarks found.</p>
                {:else}
                    <ul class="item-list">
                        {#each localBranches as { ref, header }}
                            <li class="item" class:wc={header.is_working_copy}>
                                <button type="button" class="item-main" title={shortDesc(header)} on:click={() => checkout(header)}>
                                    <Icon name="git-branch" />
                                    <span class="item-label">{ref.bookmark_name}</span>
                                    {#if !ref.is_synced}<span class="badge badge-warn" title="not synced">+</span>{/if}
                                    {#if ref.has_conflict}<span class="badge badge-error" title="conflict">!</span>{/if}
                                    {#if header.is_working_copy}<span class="badge badge-active" title="current">*</span>{/if}
                                </button>
                                <div class="item-id">{shortId(header)}</div>
                            </li>
                        {/each}
                    </ul>
                {/if}

            {:else if $activeActivity === "changes"}
                {#if $selectionHeaders.length === 0}
                    <p class="hint">Select a commit in the graph to view changes.</p>
                {:else}
                    {#each $selectionHeaders as header}
                        <div class="change-commit">
                            <div class="change-id">{shortId(header)}</div>
                            <div class="change-desc">{shortDesc(header)}</div>
                            <div class="change-author">{header.author.name}</div>
                        </div>
                    {/each}
                {/if}

            {:else if $activeActivity === "remotes"}
                {#if !workspace || workspace.git_remotes.length === 0}
                    <p class="hint">No git remotes configured.</p>
                {:else}
                    <ul class="item-list">
                        {#each workspace.git_remotes as remote}
                            <li class="item remote-item">
                                <div class="item-main no-click">
                                    <Icon name="cloud" />
                                    <span class="item-label">{remote}</span>
                                </div>
                                <div class="remote-actions">
                                    <button type="button" class="action-btn" title="Fetch from {remote}" on:click={() => onFetch(remote)}>
                                        <Icon name="download-cloud" /> Fetch
                                    </button>
                                    <button type="button" class="action-btn" title="Push to {remote}" on:click={() => onPush(remote)}>
                                        <Icon name="upload-cloud" /> Push
                                    </button>
                                </div>
                            </li>
                        {/each}
                    </ul>
                {/if}

            {:else if $activeActivity === "tags"}
                {#if tags.length === 0}
                    <p class="hint">No tags found in visible commits.</p>
                {:else}
                    <ul class="item-list">
                        {#each tags as { ref, header }}
                            <li class="item">
                                <button type="button" class="item-main" title={shortDesc(header)} on:click={() => checkout(header)}>
                                    <Icon name="tag" />
                                    <span class="item-label">{ref.tag_name}</span>
                                </button>
                                <div class="item-id">{shortId(header)}</div>
                            </li>
                        {/each}
                    </ul>
                {/if}

            {:else if $activeActivity === "settings"}
                {#if workspace}
                    <p class="hint">Workspace settings</p>
                    <div class="setting-row">
                        <span class="setting-label">Ignore immutable</span>
                        <span class="setting-value">{workspace.ignore_immutable ? "on" : "off"}</span>
                    </div>
                    <div class="setting-row">
                        <span class="setting-label">Mark unpushed</span>
                        <span class="setting-value">{workspace.mark_unpushed_bookmarks ? "on" : "off"}</span>
                    </div>
                    <div class="setting-row">
                        <span class="setting-label">External diff</span>
                        <span class="setting-value">{workspace.has_external_diff_tool ? "yes" : "no"}</span>
                    </div>
                    <div class="setting-row">
                        <span class="setting-label">External merge</span>
                        <span class="setting-value">{workspace.has_external_merge_tool ? "yes" : "no"}</span>
                    </div>
                {:else}
                    <p class="hint">No workspace loaded.</p>
                {/if}
            {/if}

        </div>
    </aside>
{/if}

<style>
    /* Activity-specific accent colors */
    .side-panel { --accent: #ff6b9d; }
    .side-panel[data-activity="branches"] { --accent: #00d4aa; }
    .side-panel[data-activity="changes"] { --accent: #ffd700; }
    .side-panel[data-activity="remotes"] { --accent: #ff8c42; }
    .side-panel[data-activity="tags"] { --accent: #c77dff; }
    .side-panel[data-activity="settings"] { --accent: #00b4d8; }

    .side-panel {
        width: 240px;
        min-width: 240px;
        display: flex;
        flex-direction: column;
        background:
            linear-gradient(180deg, var(--ctp-base) 0%, var(--ctp-mantle) 100%);
        border-right: 2px solid var(--ctp-overlay0);
        overflow: hidden;
        user-select: none;
        position: relative;
    }

    /* Subtle grid pattern overlay */
    .side-panel::before {
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
        transform: translateX(2px);
    }

    .item.wc {
        background: linear-gradient(90deg, rgba(0, 212, 170, 0.1) 0%, var(--ctp-surface0) 100%);
        border-left-color: #00d4aa;
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

    .change-commit {
        padding: 10px 12px;
        border-radius: 10px;
        border-left: 3px solid var(--accent);
        background: var(--ctp-surface0);
        margin-bottom: 6px;
        pointer-events: none;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
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
