<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import Icon from "../controls/Icon.svelte";
    import { selectionHeaders, graphHeaders, graphRevset, graphPresets, presetActions, revisionSelectEvent, repoConfigEvent, ignoreToggled } from "../stores";
    import { mutate, getInput } from "../ipc";
    import RevisionMutator from "../mutators/RevisionMutator";
    import type { RevHeader } from "../messages/RevHeader";
    import type { GitFetch } from "../messages/GitFetch";
    import type { GitPush } from "../messages/GitPush";
    import type { UndoOperation } from "../messages/UndoOperation";

    let expanded = false;
    let query = "";
    let inputEl: HTMLInputElement;
    let selectedIdx = 0;

    type Result = {
        type: "commit" | "bookmark" | "tag" | "revset" | "preset" | "command";
        label: string;
        sublabel: string;
        header?: RevHeader;
        revset?: string;
        run?: () => void;
    };

    // ── command palette actions ───────────────────────────────────────────────
    $: remotes = $repoConfigEvent?.type === "Workspace" ? $repoConfigEvent.git_remotes : [];
    $: hasWorkspace = $repoConfigEvent?.type === "Workspace";
    $: mutator = $selectionHeaders.length > 0 ? new RevisionMutator($selectionHeaders, $ignoreToggled) : null;

    function doPush() {
        for (const remote of remotes) {
            mutate<GitPush>("git_push", { refspec: { type: "AllBookmarks", remote_name: remote }, input: null }, { operation: `Pushing to ${remote}...` });
        }
    }
    function doFetch() {
        for (const remote of remotes) {
            mutate<GitFetch>("git_fetch", { refspec: { type: "AllBookmarks", remote_name: remote }, input: null }, { operation: `Fetching from ${remote}...` });
        }
    }
    function doUndo() {
        mutate<UndoOperation>("undo_operation", null);
    }
    async function doDescribe() {
        if (!mutator || $selectionHeaders.length !== 1) return;
        const current = $selectionHeaders[0].description.lines.join("\n");
        const response = await getInput("Describe Revision", "code:" + current, ["Description"]);
        if (response) mutator.onDescribe(response["Description"], false);
    }

    type Command = { key: string; aliases?: string[]; label: string; icon: string; enabled: () => boolean; run: () => void };
    $: commands = [
        { key: "push", label: "Push all remotes", icon: "upload-cloud", enabled: () => remotes.length > 0, run: doPush },
        { key: "fetch", aliases: ["pull"], label: "Fetch all remotes", icon: "download-cloud", enabled: () => remotes.length > 0, run: doFetch },
        { key: "new", aliases: ["child"], label: "New child of selection", icon: "plus", enabled: () => !!mutator, run: () => mutator?.onNewChild() },
        { key: "edit", label: "Edit selected revision", icon: "edit-3", enabled: () => $selectionHeaders.length === 1 && !$selectionHeaders[0].is_working_copy, run: () => mutator?.onEdit() },
        { key: "describe", label: "Describe selected revision", icon: "edit-3", enabled: () => $selectionHeaders.length === 1, run: doDescribe },
        { key: "squash", label: "Squash selection into parent", icon: "minimize-2", enabled: () => !!mutator, run: () => mutator?.onSquash() },
        { key: "duplicate", label: "Duplicate selection", icon: "copy", enabled: () => !!mutator, run: () => mutator?.onDuplicate() },
        { key: "abandon", label: "Abandon selection", icon: "trash-2", enabled: () => !!mutator, run: () => mutator?.onAbandon() },
        { key: "undo", label: "Undo last operation", icon: "rotate-ccw", enabled: () => hasWorkspace, run: doUndo },
        { key: "save-preset", aliases: ["preset"], label: "Save current revset as preset", icon: "save", enabled: () => !!$presetActions?.isCustom, run: () => $presetActions?.saveCurrent() },
        { key: "delete-preset", aliases: ["preset"], label: "Delete current revset preset", icon: "x-square", enabled: () => !!$presetActions?.isDeletable, run: () => $presetActions?.deleteCurrent() },
    ] satisfies Command[];

    $: results = computeResults(query, $graphHeaders, commands, $graphPresets);

    function computeResults(q: string, headers: RevHeader[], cmds: Command[], presets: { label: string; value: string }[]): Result[] {
        const trimmed = q.trim();

        // command mode: "/" or ">" prefix
        if (trimmed[0] === "/" || trimmed[0] === ">") {
            const term = trimmed.slice(1).trim().toLowerCase();
            return cmds
                .filter((c) => c.enabled())
                .filter((c) => !term || c.key.includes(term) || (c.aliases ?? []).some((a) => a.includes(term)) || c.label.toLowerCase().includes(term))
                .map((c) => ({ type: "command" as const, label: c.label, sublabel: "/" + c.key, run: c.run }));
        }

        // empty input: offer preset revsets as quick switches
        if (!trimmed) {
            return presets.map((p) => ({ type: "preset" as const, label: p.label, sublabel: p.value, revset: p.value }));
        }

        const lq = trimmed.toLowerCase();
        const out: Result[] = [];
        const seen = new Set<string>();

        // matching presets first
        for (const p of presets) {
            if (p.label.toLowerCase().includes(lq) || p.value.toLowerCase().includes(lq)) {
                out.push({ type: "preset", label: p.label, sublabel: p.value, revset: p.value });
            }
        }

        for (const h of headers) {
            if (out.length >= 15) break;
            // match on bookmarks
            for (const ref of h.refs) {
                if (ref.type === "LocalBookmark" && ref.bookmark_name.toLowerCase().includes(lq) && !seen.has("b:" + ref.bookmark_name)) {
                    seen.add("b:" + ref.bookmark_name);
                    out.push({ type: "bookmark", label: ref.bookmark_name, sublabel: h.id.commit.hex.slice(0, 8), header: h });
                }
                if (ref.type === "Tag" && ref.tag_name.toLowerCase().includes(lq) && !seen.has("t:" + ref.tag_name)) {
                    seen.add("t:" + ref.tag_name);
                    out.push({ type: "tag", label: ref.tag_name, sublabel: h.id.commit.hex.slice(0, 8), header: h });
                }
            }
            // match on description
            if (h.description.lines[0]?.toLowerCase().includes(lq) && !seen.has("c:" + h.id.commit.hex)) {
                seen.add("c:" + h.id.commit.hex);
                out.push({ type: "commit", label: h.description.lines[0] || "(no description)", sublabel: h.id.commit.hex.slice(0, 8), header: h });
            }
            // match on commit/change id
            if (h.id.commit.hex.startsWith(lq) || h.id.change.hex.startsWith(lq)) {
                const key = "c:" + h.id.commit.hex;
                if (!seen.has(key)) {
                    seen.add(key);
                    out.push({ type: "commit", label: h.description.lines[0] || "(no description)", sublabel: h.id.commit.hex.slice(0, 8), header: h });
                }
            }
        }

        // always offer to run the text as a revset query that filters the graph
        out.push({ type: "revset", label: `Filter graph: ${trimmed}`, sublabel: "revset" });

        return out;
    }

    function toggle() {
        expanded = !expanded;
        if (expanded) {
            selectedIdx = 0;
            setTimeout(() => inputEl?.focus(), 50);
        } else {
            query = "";
        }
    }

    function close() {
        expanded = false;
        query = "";
    }

    function selectResult(r: Result) {
        if (r.type === "command" && r.run) {
            r.run();
        } else if (r.type === "preset") {
            if (r.revset) graphRevset.set(r.revset);
        } else if (r.type === "revset") {
            const revset = query.trim();
            if (revset) graphRevset.set(revset);
        } else if (r.header) {
            revisionSelectEvent.set({ from: r.header.id, to: r.header.id });
        }
        close();
    }

    function handleKeydown(event: KeyboardEvent) {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
            event.preventDefault();
            toggle();
        }
        if (event.key === "Escape" && expanded) {
            close();
        }
    }

    function handleInputKeydown(e: KeyboardEvent) {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            selectedIdx = Math.min(selectedIdx + 1, results.length - 1);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            selectedIdx = Math.max(selectedIdx - 1, 0);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (results[selectedIdx]) selectResult(results[selectedIdx]);
        }
    }

    onMount(() => {
        document.addEventListener("keydown", handleKeydown);
    });

    onDestroy(() => {
        document.removeEventListener("keydown", handleKeydown);
    });
</script>

<div class="omnibar-wrapper" class:expanded>
    {#if expanded}
        <div class="omnibar-backdrop" role="button" tabindex="-1" on:click={close} on:keydown={() => {}}></div>
        <div class="omnibar-card">
            <div class="omnibar-input-row">
                <Icon name="search" />
                <input
                    bind:this={inputEl}
                    bind:value={query}
                    placeholder="Search, type a revset, or / for commands..."
                    on:keydown={handleInputKeydown}
                />
                <span class="shortcut-hint">ESC</span>
            </div>
            {#if results.length > 0}
                <ul class="omnibar-results">
                    {#each results as r, i}
                        <li class:selected={i === selectedIdx}>
                            <button type="button" on:click={() => selectResult(r)} on:mouseenter={() => selectedIdx = i}>
                                <Icon name={r.type === "bookmark" ? "git-branch" : r.type === "tag" ? "tag" : r.type === "revset" ? "filter" : r.type === "preset" ? "bookmark" : r.type === "command" ? "terminal" : "git-commit"} />
                                <span class="result-label">{r.label}</span>
                                <span class="result-sub">{r.sublabel}</span>
                            </button>
                        </li>
                    {/each}
                </ul>
            {:else if query.trim()}
                <div class="omnibar-empty">No results found</div>
            {/if}
            <div class="omnibar-hints">
                <span><kbd>↑↓</kbd> navigate · <kbd>↵</kbd> select · <kbd>/</kbd> commands · <kbd>Esc</kbd> close</span>
            </div>
        </div>
    {:else}
        <button class="omnibar-pill" on:click={toggle} title="Command palette (Ctrl+K)">
            <Icon name="search" />
            <span class="pill-label">Search</span>
            <span class="pill-shortcut">Ctrl K</span>
        </button>
    {/if}
</div>

<style>
    .omnibar-wrapper {
        position: absolute;
        top: 12px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 100;
        pointer-events: none;
    }

    .omnibar-wrapper > * {
        pointer-events: auto;
    }

    .omnibar-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 43, 54, 0.25);
        pointer-events: auto;
        z-index: -1;
    }

    .omnibar-card {
        width: 560px;
        max-width: 90vw;
        background: var(--ctp-base);
        border: 1px solid var(--ctp-overlay0);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        overflow: hidden;
    }

    .omnibar-input-row {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 14px;
    }

    .omnibar-input-row input {
        flex: 1;
        border: none;
        background: transparent;
        font-size: 15px;
        color: var(--ctp-text);
        outline: none;
        padding: 4px 0;
    }

    .omnibar-input-row input::placeholder {
        color: var(--ctp-subtext0);
    }

    .shortcut-hint {
        font-size: 11px;
        color: var(--ctp-subtext0);
        background: var(--ctp-surface0);
        padding: 2px 6px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--ctp-overlay0);
    }

    .omnibar-results {
        list-style: none;
        margin: 0;
        padding: 4px 0;
        max-height: 300px;
        overflow-y: auto;
        border-top: 1px solid var(--ctp-overlay0);
    }

    .omnibar-results li button {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 6px 14px;
        border: none;
        background: transparent;
        color: var(--ctp-text);
        font-size: 13px;
        cursor: pointer;
        text-align: left;
        font-family: inherit;
    }

    .omnibar-results li.selected button,
    .omnibar-results li button:hover {
        background: var(--ctp-surface1);
    }

    .omnibar-results li button :global(svg) {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
        color: var(--ctp-subtext0);
    }

    .result-label {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .result-sub {
        font-size: 11px;
        color: var(--ctp-subtext0);
        font-family: var(--stack-code);
        flex-shrink: 0;
    }

    .omnibar-empty {
        padding: 12px 14px;
        font-size: 12px;
        color: var(--ctp-subtext0);
        text-align: center;
        border-top: 1px solid var(--ctp-overlay0);
    }

    .omnibar-hints {
        padding: 6px 14px;
        font-size: 11px;
        color: var(--ctp-subtext0);
        background: var(--ctp-crust);
        border-top: 1px solid var(--ctp-overlay0);
    }

    .omnibar-hints kbd {
        font-family: var(--stack-code);
        font-size: 10px;
        padding: 1px 4px;
        border-radius: var(--radius-sm);
        background: var(--ctp-surface0);
        border: 1px solid var(--ctp-overlay0);
        color: var(--ctp-subtext1);
    }

    .omnibar-pill {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 14px;
        background: var(--ctp-base);
        border: 1px solid var(--ctp-overlay0);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-sm);
        cursor: pointer;
        color: var(--ctp-subtext1);
        font-size: 13px;
        transition: box-shadow 150ms ease, border-color 150ms ease;
    }

    .omnibar-pill:hover {
        border-color: var(--ctp-overlay1);
        box-shadow: var(--shadow-md);
    }

    .pill-label {
        color: var(--ctp-text);
    }

    .pill-shortcut {
        font-size: 11px;
        color: var(--ctp-subtext0);
        background: var(--ctp-surface0);
        padding: 1px 5px;
        border-radius: var(--radius-sm);
        border: 1px solid var(--ctp-overlay0);
        font-family: var(--stack-code);
    }
</style>


