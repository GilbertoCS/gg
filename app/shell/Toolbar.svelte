<script lang="ts">
    import Icon from "../controls/Icon.svelte";
    import { mutate } from "../ipc";
    import { repoConfigEvent, ignoreToggled, selectionHeaders } from "../stores";
    import type { GitFetch } from "../messages/GitFetch";
    import type { GitPush } from "../messages/GitPush";
    import type { UndoOperation } from "../messages/UndoOperation";
    import RevisionMutator from "../mutators/RevisionMutator";

    $: workspace = $repoConfigEvent?.type === "Workspace" ? $repoConfigEvent : null;
    $: hasSelection = $selectionHeaders.length > 0;

    function onUndo() {
        mutate<UndoOperation>("undo_operation", null);
    }

    function onFetch() {
        if (!workspace) return;
        for (const remote of workspace.git_remotes) {
            mutate<GitFetch>("git_fetch", {
                refspec: { type: "AllBookmarks", remote_name: remote },
                input: null,
            }, { operation: `Fetching from ${remote}...` });
        }
    }

    function onPush() {
        if (!workspace) return;
        for (const remote of workspace.git_remotes) {
            mutate<GitPush>("git_push", {
                refspec: { type: "AllBookmarks", remote_name: remote },
                input: null,
            }, { operation: `Pushing to ${remote}...` });
        }
    }

    function onNewChild() {
        if ($selectionHeaders.length > 0) {
            new RevisionMutator($selectionHeaders, $ignoreToggled).onNewChild();
        }
    }

    function onEdit() {
        if ($selectionHeaders.length === 1) {
            new RevisionMutator($selectionHeaders, $ignoreToggled).onEdit();
        }
    }
</script>

<div class="toolbar" class:disabled={!workspace}>
    <div class="toolbar-group">
        <button class="toolbar-btn" title="Undo (Ctrl+Z)" on:click={onUndo} disabled={!workspace}>
            <Icon name="rotate-ccw" />
            <span class="btn-label">Undo</span>
        </button>
    </div>

    <div class="toolbar-sep"></div>

    <div class="toolbar-group">
        <button class="toolbar-btn" title="Fetch all remotes" on:click={onFetch} disabled={!workspace || !workspace.git_remotes.length}>
            <Icon name="download-cloud" />
            <span class="btn-label">Pull</span>
        </button>
        <button class="toolbar-btn" title="Push all remotes" on:click={onPush} disabled={!workspace || !workspace.git_remotes.length}>
            <Icon name="upload-cloud" />
            <span class="btn-label">Push</span>
        </button>
    </div>

    <div class="toolbar-sep"></div>

    <div class="toolbar-group">
        <button class="toolbar-btn" title="New child revision" on:click={onNewChild} disabled={!hasSelection}>
            <Icon name="git-branch" />
            <span class="btn-label">Branch</span>
        </button>
        <button class="toolbar-btn" title="Edit selected revision" on:click={onEdit} disabled={!hasSelection || $selectionHeaders.length !== 1 || $selectionHeaders[0]?.is_working_copy}>
            <Icon name="edit-3" />
            <span class="btn-label">Edit</span>
        </button>
    </div>

    <div class="toolbar-spacer"></div>

    <div class="toolbar-group repo-info">
        {#if workspace}
            <span class="repo-name">{workspace.absolute_path.split(/[\\/]/).pop()}</span>
        {/if}
    </div>
</div>

<style>
    .toolbar {
        grid-area: toolbar;
        height: 40px;
        display: flex;
        align-items: center;
        padding: 0 10px;
        gap: 4px;
        background: linear-gradient(180deg, var(--ctp-surface0) 0%, var(--ctp-base) 100%);
        border-bottom: 1px solid var(--ctp-overlay0);
        user-select: none;
        z-index: 10;
    }

    .toolbar-group {
        display: flex;
        align-items: center;
        gap: 2px;
    }

    .toolbar-sep {
        width: 1px;
        height: 22px;
        background: var(--ctp-overlay0);
        margin: 0 6px;
        flex-shrink: 0;
    }

    .toolbar-spacer {
        flex: 1;
    }

    .toolbar-btn {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        height: 30px;
        border: 1px solid transparent;
        border-radius: 6px;
        background: transparent;
        color: var(--ctp-text);
        font-size: 12px;
        font-family: var(--stack-industrial);
        cursor: pointer;
        transition: all 100ms ease;
        white-space: nowrap;
    }

    .toolbar-btn:not(:disabled):hover {
        background: var(--ctp-surface1);
        border-color: var(--ctp-overlay0);
    }

    .toolbar-btn:not(:disabled):active {
        background: var(--ctp-surface2);
    }

    .toolbar-btn:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }

    .toolbar-btn :global(svg) {
        width: 15px;
        height: 15px;
        flex-shrink: 0;
    }

    .btn-label {
        pointer-events: none;
    }

    .repo-info {
        pointer-events: none;
    }

    .repo-name {
        font-size: 12px;
        font-family: var(--stack-code);
        color: var(--ctp-subtext0);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 200px;
    }
</style>
