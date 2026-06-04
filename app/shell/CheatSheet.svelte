<script lang="ts">
    import Icon from "../controls/Icon.svelte";
    import { cheatSheetVisible, repoStatusEvent, repoConfigEvent, ignoreToggled } from "../stores.js";
    import { mutate, getInput, query } from "../ipc.js";
    import type { UndoOperation } from "../messages/UndoOperation";
    import type { GitFetch } from "../messages/GitFetch";
    import type { GitPush } from "../messages/GitPush";
    import type { CreateRevision } from "../messages/CreateRevision";
    import type { CheckoutRevision } from "../messages/CheckoutRevision";
    import type { AbandonRevisions } from "../messages/AbandonRevisions";
    import type { DescribeRevision } from "../messages/DescribeRevision";
    import type { MoveChanges } from "../messages/MoveChanges";
    import type { DuplicateRevisions } from "../messages/DuplicateRevisions";
    import type { CreateRef } from "../messages/CreateRef";
    import type { DeleteRef } from "../messages/DeleteRef";
    import type { RenameBookmark } from "../messages/RenameBookmark";
    import type { TrackBookmark } from "../messages/TrackBookmark";
    import type { StoreRef } from "../messages/StoreRef";
    import type { RevId } from "../messages/RevId";

    // Build a RevId for the working copy using the @ synthetic change id pattern
    function wcRevId(): RevId | null {
        const status = $repoStatusEvent;
        if (!status) return null;
        return {
            change: {
                type: "ChangeId",
                hex: "@",
                prefix: "@",
                rest: "",
                offset: null,
                is_divergent: false,
            },
            commit: status.working_copy,
        };
    }

    function remotes(): string[] {
        return $repoConfigEvent?.type === "Workspace" ? $repoConfigEvent.git_remotes : [];
    }

    // ── Navigation ──────────────────────────────────────────────────────────────

    async function runLog() {
        cheatSheetVisible.set(false);
    }

    // ── Working Copy ─────────────────────────────────────────────────────────────

    async function runNew() {
        const id = wcRevId();
        if (!id) return;
        mutate<CreateRevision>("create_revision", { set: { from: id, to: id } },
            { ignoreImmutable: $ignoreToggled });
    }

    async function runEdit() {
        const response = await getInput("jj edit", "Enter the change/commit id to edit", ["Revision"]);
        if (!response) return;
        const rev = response["Revision"].trim();
        const id: RevId = {
            change: { type: "ChangeId", hex: rev, prefix: rev, rest: "", offset: null, is_divergent: false },
            commit: { type: "CommitId", hex: "", prefix: "", rest: "" },
        };
        mutate<CheckoutRevision>("checkout_revision", { id }, { ignoreImmutable: $ignoreToggled });
    }

    async function runDescribe() {
        const id = wcRevId();
        if (!id) return;
        const response = await getInput("jj describe", "Set description for the working copy", ["Description"]);
        if (!response) return;
        mutate<DescribeRevision>("describe_revision", {
            id,
            new_description: response["Description"],
            reset_author: false,
        }, { ignoreImmutable: $ignoreToggled });
    }

    async function runSquash() {
        const id = wcRevId();
        if (!id) return;
        const result = await query<any>("query_revisions", { set: { from: id, to: id } });
        if (result.type !== "data") return;
        const headers = result.value?.headers ?? [];
        if (!headers.length) return;
        const parentId = headers[0].parent_ids?.[0];
        if (!parentId) return;
        mutate<MoveChanges>("move_changes", {
            from: { from: id, to: id },
            to_id: parentId,
            paths: [],
        }, { ignoreImmutable: $ignoreToggled });
    }

    async function runAbandon() {
        const id = wcRevId();
        if (!id) return;
        mutate<AbandonRevisions>("abandon_revisions", { set: { from: id, to: id } },
            { ignoreImmutable: $ignoreToggled });
    }

    async function runDuplicate() {
        const id = wcRevId();
        if (!id) return;
        mutate<DuplicateRevisions>("duplicate_revisions", { set: { from: id, to: id } },
            { ignoreImmutable: $ignoreToggled });
    }

    // ── History ──────────────────────────────────────────────────────────────────

    function runUndo() {
        mutate<UndoOperation>("undo_operation", null);
    }

    // ── Bookmarks ────────────────────────────────────────────────────────────────

    async function runBookmarkCreate() {
        const id = wcRevId();
        if (!id) return;
        const response = await getInput("jj bookmark create", "Create bookmark on working copy", ["Bookmark Name"]);
        if (!response) return;
        const ref: StoreRef = {
            type: "LocalBookmark",
            bookmark_name: response["Bookmark Name"],
            has_conflict: false,
            is_synced: false,
            potential_remotes: 0,
            available_remotes: 0,
            tracking_remotes: [],
        };
        mutate<CreateRef>("create_ref", { ref, id }, { ignoreImmutable: $ignoreToggled });
    }

    async function runBookmarkDelete() {
        const response = await getInput("jj bookmark delete", "Delete a local bookmark", ["Bookmark Name"]);
        if (!response) return;
        const ref: StoreRef = {
            type: "LocalBookmark",
            bookmark_name: response["Bookmark Name"],
            has_conflict: false,
            is_synced: false,
            potential_remotes: 0,
            available_remotes: 0,
            tracking_remotes: [],
        };
        mutate<DeleteRef>("delete_ref", { ref });
    }

    async function runBookmarkRename() {
        const response = await getInput("jj bookmark rename", "Rename a local bookmark", ["Old Name", "New Name"]);
        if (!response) return;
        const ref: StoreRef = {
            type: "LocalBookmark",
            bookmark_name: response["Old Name"],
            has_conflict: false,
            is_synced: false,
            potential_remotes: 0,
            available_remotes: 0,
            tracking_remotes: [],
        };
        mutate<RenameBookmark>("rename_bookmark", { ref, new_name: response["New Name"] });
    }

    async function runBookmarkTrack() {
        const allRemotes = await query<string[]>("query_remotes", { tracking_bookmark: null });
        if (allRemotes.type !== "data") return;
        const response = await getInput("jj bookmark track", "Track a remote bookmark", [
            { label: "Bookmark Name", choices: [] },
            { label: "Remote", choices: allRemotes.value },
        ]);
        if (!response) return;
        const ref: StoreRef = {
            type: "RemoteBookmark",
            bookmark_name: response["Bookmark Name"],
            remote_name: response["Remote"],
            has_conflict: false,
            is_synced: false,
            is_tracked: false,
            is_absent: false,
        };
        mutate<TrackBookmark>("track_bookmark", { ref });
    }

    // ── Git ──────────────────────────────────────────────────────────────────────

    async function runGitFetch() {
        const rs = remotes();
        const response = await getInput("jj git fetch", "Fetch from remote", [
            { label: "Remote", choices: rs },
        ]);
        if (!response) return;
        mutate<GitFetch>("git_fetch", {
            refspec: { type: "AllBookmarks", remote_name: response["Remote"] },
            input: null,
        }, { operation: `Fetching from ${response["Remote"]}...` });
    }

    async function runGitPush() {
        const rs = remotes();
        const response = await getInput("jj git push", "Push all bookmarks to remote", [
            { label: "Remote", choices: rs },
        ]);
        if (!response) return;
        mutate<GitPush>("git_push", {
            refspec: { type: "AllBookmarks", remote_name: response["Remote"] },
            input: null,
        }, { operation: `Pushing to ${response["Remote"]}...` });
    }

    // ── Data model ───────────────────────────────────────────────────────────────

    interface Command {
        cmd: string;
        desc: string;
        run?: () => void;
    }

    interface Group {
        label: string;
        icon: string;
        accent: string;
        commands: Command[];
    }

    const groups: Group[] = [
        {
            label: "Navigation",
            icon: "compass",
            accent: "#00b4d8",
            commands: [
                { cmd: "jj log",        desc: "Close cheat sheet, use graph pane", run: runLog },
                { cmd: "jj show",       desc: "Diff shown in selection panel",     run: undefined },
                { cmd: "jj diff",       desc: "Diff shown in selection panel",     run: undefined },
            ],
        },
        {
            label: "Working Copy",
            icon: "edit-3",
            accent: "#ffd700",
            commands: [
                { cmd: "jj new",        desc: "Create new child change",          run: runNew },
                { cmd: "jj edit <rev>", desc: "Edit an existing change",          run: runEdit },
                { cmd: "jj describe",   desc: "Set working-copy description",     run: runDescribe },
                { cmd: "jj squash",     desc: "Squash into parent",               run: runSquash },
                { cmd: "jj abandon",    desc: "Abandon working copy",             run: runAbandon },
                { cmd: "jj duplicate",  desc: "Duplicate working-copy change",    run: runDuplicate },
            ],
        },
        {
            label: "History",
            icon: "git-commit",
            accent: "#ff6b9d",
            commands: [
                { cmd: "jj undo",       desc: "Undo last operation",              run: runUndo },
                { cmd: "jj op log",     desc: "View-only — see operation log",    run: undefined },
            ],
        },
        {
            label: "Bookmarks",
            icon: "bookmark",
            accent: "#c77dff",
            commands: [
                { cmd: "jj bookmark create", desc: "Create bookmark on working copy", run: runBookmarkCreate },
                { cmd: "jj bookmark delete", desc: "Delete a local bookmark",         run: runBookmarkDelete },
                { cmd: "jj bookmark rename", desc: "Rename a local bookmark",         run: runBookmarkRename },
                { cmd: "jj bookmark track",  desc: "Track a remote bookmark",         run: runBookmarkTrack },
            ],
        },
        {
            label: "Git Interop",
            icon: "git-pull-request",
            accent: "#ff8c42",
            commands: [
                { cmd: "jj git fetch",  desc: "Fetch from remote",                run: runGitFetch },
                { cmd: "jj git push",   desc: "Push bookmarks to remote",         run: runGitPush },
            ],
        },
    ];

    let activeGroup: string = groups[0].label;
    $: current = groups.find((g) => g.label === activeGroup) ?? groups[0];
    $: hasWorkspace = $repoConfigEvent?.type === "Workspace";
</script>

<div class="cs-window">
    <div class="cs-header">
        <span class="cs-title">
            <Icon name="terminal" />
            jj Cheat Sheet
        </span>
        <button type="button" class="cs-close" on:click={() => cheatSheetVisible.set(false)} title="Close">
            <Icon name="x" />
        </button>
    </div>

    <div class="cs-body">
        <nav class="cs-groups">
            {#each groups as group}
                <button
                    type="button"
                    class="cs-group-btn"
                    class:active={activeGroup === group.label}
                    style="--accent: {group.accent}"
                    on:click={() => (activeGroup = group.label)}
                    title={group.label}>
                    <Icon name={group.icon} />
                    <span>{group.label}</span>
                </button>
            {/each}
        </nav>

        <div class="cs-commands">
            <div class="cs-group-header" style="--accent: {current.accent}">
                <Icon name={current.icon} />
                <span>{current.label}</span>
            </div>
            <ul class="cs-list">
                {#each current.commands as item}
                    <li class="cs-row">
                        <code class="cs-cmd">{item.cmd}</code>
                        <span class="cs-desc">{item.desc}</span>
                        {#if item.run}
                            <button
                                type="button"
                                class="cs-run"
                                title="Run: {item.cmd}"
                                disabled={!hasWorkspace}
                                on:click={item.run}>
                                <Icon name="play" />
                            </button>
                        {:else}
                            <span class="cs-run-placeholder" title="View-only in the graph/selection pane">
                                <Icon name="eye" />
                            </span>
                        {/if}
                    </li>
                {/each}
            </ul>
        </div>
    </div>
</div>

<style>
    .cs-window {
        --accent: #00b4d8;

        position: absolute;
        bottom: 42px;
        left: 64px;
        width: 500px;
        max-width: calc(100vw - 80px);
        max-height: calc(100vh - 80px);
        background:
            linear-gradient(180deg, var(--ctp-base) 0%, var(--ctp-mantle) 100%);
        border: 2px solid var(--ctp-overlay0);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 60;
        font-size: 12px;
        position: relative;
    }

    /* Subtle grid pattern overlay */
    .cs-window::before {
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

    .cs-header {
        height: 48px;
        min-height: 48px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 12px;
        background: linear-gradient(180deg, var(--ctp-surface0) 0%, var(--ctp-surface1) 100%);
        border-bottom: 2px solid var(--ctp-overlay0);
        user-select: none;
        position: relative;
        z-index: 1;
    }

    .cs-header::after {
        content: '';
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

    .cs-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 800;
        color: var(--ctp-text);
        pointer-events: none;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-family: var(--stack-industrial);
    }

    .cs-close {
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
        flex-shrink: 0;
        transition: all 120ms ease;
        z-index: 2;
    }

    .cs-close:hover {
        border-color: var(--accent);
        color: var(--accent);
        box-shadow: 0 0 8px var(--accent);
        transform: translateY(-1px);
    }

    .cs-close:active {
        transform: translateY(0);
    }

    .cs-body {
        display: flex;
        flex: 1;
        overflow: hidden;
    }

    .cs-groups {
        display: flex;
        flex-direction: column;
        width: 124px;
        min-width: 124px;
        border-right: 1px solid var(--ctp-overlay0);
        background: var(--ctp-surface0);
        padding: 6px 0;
        gap: 2px;
        overflow-y: auto;
    }

    .cs-group-btn {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 7px 10px;
        border: none;
        border-left: 3px solid transparent;
        background: transparent;
        color: var(--ctp-subtext0);
        cursor: pointer;
        font-size: 11.5px;
        text-align: left;
        transition: all 100ms ease;
        white-space: nowrap;
    }

    .cs-group-btn:hover {
        background: var(--ctp-surface1);
        color: var(--ctp-text);
        border-left-color: var(--ctp-overlay0);
    }

    .cs-group-btn.active {
        color: var(--accent);
        border-left-color: var(--accent);
        background: var(--ctp-surface1);
        font-weight: 600;
    }

    .cs-commands {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .cs-group-header {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 8px 12px;
        border-bottom: 1px solid var(--ctp-overlay0);
        font-size: 12px;
        font-weight: 700;
        color: var(--accent);
        background: var(--ctp-surface0);
        pointer-events: none;
        user-select: none;
    }

    .cs-list {
        list-style: none;
        overflow-y: auto;
        padding: 4px 0;
        flex: 1;
    }

    .cs-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 5px 10px 5px 12px;
        border-bottom: 1px solid color-mix(in srgb, var(--ctp-overlay0) 35%, transparent);
    }

    .cs-row:last-child {
        border-bottom: none;
    }

    .cs-row:hover {
        background: var(--ctp-surface0);
    }

    .cs-cmd {
        font-family: var(--stack-code);
        font-size: 11px;
        color: var(--ctp-blue);
        white-space: nowrap;
        min-width: 150px;
        flex-shrink: 0;
    }

    .cs-desc {
        color: var(--ctp-subtext1);
        font-size: 11.5px;
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .cs-run {
        width: 24px;
        height: 24px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid var(--ctp-overlay0);
        border-radius: var(--radius-sm);
        background: transparent;
        color: var(--ctp-green);
        cursor: pointer;
        padding: 0;
        transition: all 100ms ease;
    }

    .cs-run:hover:not(:disabled) {
        background: var(--ctp-green);
        color: var(--ctp-base);
        border-color: var(--ctp-green);
    }

    .cs-run:disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }

    .cs-run-placeholder {
        width: 24px;
        height: 24px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--ctp-overlay0);
        pointer-events: none;
    }
</style>
