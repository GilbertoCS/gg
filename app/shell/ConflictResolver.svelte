<script lang="ts">
    import hljs from "highlight.js";
    import { createEventDispatcher, tick } from "svelte";
    import type { ConflictRegion, ConflictResolution } from "../lib/ThreeSide";
    import { buildResolvedContent, initialResolution } from "../lib/ThreeSide";
    import ActionWidget from "../controls/ActionWidget.svelte";
    import Icon from "../controls/Icon.svelte";

    export let path: string;
    export let regions: ConflictRegion[] = [];
    export let oursLabel: string = "Ours";
    export let theirsLabel: string = "Theirs";
    export let fileExtension: string = "";

    const dispatch = createEventDispatcher<{
        apply: { resolvedContent: string };
        cancel: void;
    }>();

    // per-conflict resolution state, keyed by ConflictRegion.conflict_index
    let resolutions = new Map<number, ConflictResolution>();
    let initedFor: ConflictRegion[] | null = null;
    $: if (regions !== initedFor) {
        const next = new Map<number, ConflictResolution>();
        for (const region of regions) {
            if (region.conflict_index !== null) {
                next.set(region.conflict_index, initialResolution(region));
            }
        }
        resolutions = next;
        initedFor = regions;
    }

    // only `Conflict` regions require an explicit decision
    $: conflictRegions = regions.filter((r) => r.kind === "Conflict");
    $: autoApplied = regions.filter(
        (r) => r.kind === "LeftChange" || r.kind === "RightChange" || r.kind === "IdenticalChange",
    ).length;
    $: unresolved = conflictRegions.filter(
        (r) => (resolutions.get(r.conflict_index!)?.mode ?? "unresolved") === "unresolved",
    );
    $: allResolved = unresolved.length === 0;
    $: resolvedCount = conflictRegions.length - unresolved.length;

    function update(conflictIndex: number, mode: ConflictResolution["mode"], lines: string[]) {
        resolutions.set(conflictIndex, { mode, lines });
        resolutions = resolutions;
    }

    function takeOurs(r: ConflictRegion) {
        update(r.conflict_index!, "ours", [...r.ours.lines]);
    }
    function takeTheirs(r: ConflictRegion) {
        update(r.conflict_index!, "theirs", [...r.theirs.lines]);
    }
    function takeBothLR(r: ConflictRegion) {
        update(r.conflict_index!, "both-lr", [...r.ours.lines, ...r.theirs.lines]);
    }
    function takeBothRL(r: ConflictRegion) {
        update(r.conflict_index!, "both-rl", [...r.theirs.lines, ...r.ours.lines]);
    }
    function clearRegion(r: ConflictRegion) {
        update(r.conflict_index!, "manual", []);
    }
    function onEdit(r: ConflictRegion, value: string) {
        update(r.conflict_index!, "manual", value.split("\n"));
    }

    function takeAll(side: "ours" | "theirs") {
        for (const r of conflictRegions) {
            update(r.conflict_index!, side, [...(side === "ours" ? r.ours.lines : r.theirs.lines)]);
        }
    }

    // jump-to-conflict navigation
    let activeConflict = -1;
    async function gotoConflict(step: number) {
        if (conflictRegions.length === 0) return;
        activeConflict =
            (activeConflict + step + conflictRegions.length) % conflictRegions.length;
        await tick();
        const ci = conflictRegions[activeConflict].conflict_index!;
        document.getElementById(`conflict-${ci}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }

    function kindClass(kind: ConflictRegion["kind"]): string {
        switch (kind) {
            case "Conflict":
                return "conflict";
            case "LeftChange":
                return "left-change";
            case "RightChange":
                return "right-change";
            case "IdenticalChange":
                return "identical";
            default:
                return "stable";
        }
    }

    function highlight(line: string): string {
        if (!fileExtension || !line.trim()) return escapeHtml(line);
        try {
            const lang = hljs.getLanguage(fileExtension.replace(".", ""));
            if (lang && lang.name) return hljs.highlight(line, { language: lang.name }).value;
        } catch {
            // fall through to escaped text
        }
        return escapeHtml(line);
    }
    function escapeHtml(text: string): string {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    function resModeLabel(mode: ConflictResolution["mode"] | undefined): string {
        switch (mode) {
            case "ours":
                return "ours";
            case "theirs":
                return "theirs";
            case "both-lr":
                return "ours + theirs";
            case "both-rl":
                return "theirs + ours";
            case "manual":
                return "edited";
            default:
                return "unresolved";
        }
    }

    function handleApply() {
        dispatch("apply", { resolvedContent: buildResolvedContent(regions, resolutions).join("\n") });
    }
    function handleCancel() {
        dispatch("cancel");
    }
</script>

<div class="conflict-resolver">
    <div class="resolver-header">
        <div class="file-info">
            <Icon name="git-merge" />
            <span class="filename">{path}</span>
        </div>
        <div class="header-actions">
            <ActionWidget tip="Accept ours for every conflict" onClick={() => takeAll("ours")} secondary>
                <Icon name="arrow-right-circle" /> All {oursLabel}
            </ActionWidget>
            <ActionWidget tip="Accept theirs for every conflict" onClick={() => takeAll("theirs")} secondary>
                <Icon name="arrow-left-circle" /> All {theirsLabel}
            </ActionWidget>
            <ActionWidget tip="Cancel and discard changes" onClick={handleCancel} secondary>
                <Icon name="x" /> Cancel
            </ActionWidget>
            <ActionWidget tip="Apply resolved content" onClick={handleApply} disabled={!allResolved}>
                <Icon name="check" /> Apply
            </ActionWidget>
        </div>
    </div>

    <div class="pane-titles">
        <div class="pane-title ours">{oursLabel} <span class="hint">(your version)</span></div>
        <div class="pane-title result">Result <span class="hint">(editable)</span></div>
        <div class="pane-title theirs">{theirsLabel} <span class="hint">(their version)</span></div>
    </div>

    <div class="merge-grid">
        {#each regions as region (region.index)}
            {#if region.kind === "Stable"}
                <div class="region-row stable">
                    <div class="cell side">
                        {#each region.ours.lines as line}<div class="ln">{@html highlight(line)}</div>{/each}
                    </div>
                    <div class="cell center">
                        {#each region.ours.lines as line}<div class="ln">{@html highlight(line)}</div>{/each}
                    </div>
                    <div class="cell side">
                        {#each region.ours.lines as line}<div class="ln">{@html highlight(line)}</div>{/each}
                    </div>
                </div>
            {:else}
                {@const ci = region.conflict_index ?? -1}
                {@const res = resolutions.get(ci)}
                <div
                    class="region-row conflict {kindClass(region.kind)}"
                    class:unresolved={region.kind === "Conflict" && (res?.mode ?? "unresolved") === "unresolved"}
                    id={`conflict-${ci}`}>
                    <!-- ours / left -->
                    <div class="cell side ours">
                        <div class="cell-tools left">
                            <button class="arrow" title="Accept {oursLabel} into result" on:click={() => takeOurs(region)}>
                                <Icon name="arrow-right-circle" />
                            </button>
                        </div>
                        {#if region.ours.lines.length === 0}
                            <div class="ln empty">(none)</div>
                        {:else}
                            {#each region.ours.lines as line}<div class="ln add">{@html highlight(line)}</div>{/each}
                        {/if}
                    </div>

                    <!-- editable result / center -->
                    <div class="cell center result">
                        <div class="cell-tools center-tools">
                            <button on:click={() => takeOurs(region)} title="Take {oursLabel}">{oursLabel}</button>
                            <button on:click={() => takeBothLR(region)} title="{oursLabel} then {theirsLabel}">Both ►</button>
                            <button on:click={() => takeBothRL(region)} title="{theirsLabel} then {oursLabel}">◄ Both</button>
                            <button on:click={() => takeTheirs(region)} title="Take {theirsLabel}">{theirsLabel}</button>
                            <button on:click={() => clearRegion(region)} title="Clear region">Clear</button>
                            <span class="mode mode-{res?.mode ?? 'unresolved'}">{resModeLabel(res?.mode)}</span>
                        </div>
                        <textarea
                            class="result-edit"
                            spellcheck="false"
                            rows={Math.max(1, res?.lines.length ?? 1)}
                            value={(res?.lines ?? []).join("\n")}
                            on:input={(e) => onEdit(region, e.currentTarget.value)}></textarea>
                    </div>

                    <!-- theirs / right -->
                    <div class="cell side theirs">
                        <div class="cell-tools right">
                            <button class="arrow" title="Accept {theirsLabel} into result" on:click={() => takeTheirs(region)}>
                                <Icon name="arrow-left-circle" />
                            </button>
                        </div>
                        {#if region.theirs.lines.length === 0}
                            <div class="ln empty">(none)</div>
                        {:else}
                            {#each region.theirs.lines as line}<div class="ln add">{@html highlight(line)}</div>{/each}
                        {/if}
                    </div>
                </div>
            {/if}
        {/each}
    </div>

    <div class="resolver-footer">
        <div class="status-info">
            <span class="status-text">{resolvedCount} of {conflictRegions.length} conflicts resolved</span>
            {#if autoApplied > 0}
                <span class="status-text">· {autoApplied} non-conflict change{autoApplied === 1 ? "" : "s"} auto-applied</span>
            {/if}
            {#if allResolved}
                <span class="status-ready"><Icon name="check-circle" /> Ready to apply</span>
            {/if}
        </div>
        {#if conflictRegions.length > 0}
            <div class="nav">
                <button on:click={() => gotoConflict(-1)} title="Previous conflict"><Icon name="chevron-up" /></button>
                <button on:click={() => gotoConflict(1)} title="Next conflict"><Icon name="chevron-down" /></button>
            </div>
        {/if}
    </div>
</div>

<style>
    .conflict-resolver {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--ctp-crust);
    }

    .resolver-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        background: var(--ctp-mantle);
        border-bottom: 1px solid var(--ctp-overlay0);
    }

    .file-info {
        display: flex;
        align-items: center;
        gap: 8px;
        font-family: var(--stack-mono);
        font-size: 14px;
        color: var(--ctp-text);
    }

    .filename {
        font-weight: 600;
    }

    .header-actions {
        display: flex;
        gap: 8px;
    }

    .pane-titles {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 1px;
        background: var(--ctp-overlay0);
        border-bottom: 1px solid var(--ctp-overlay0);
    }

    .pane-title {
        padding: 6px 12px;
        background: var(--ctp-mantle);
        font-family: var(--stack-industrial);
        font-size: 13px;
        font-weight: 600;
        color: var(--ctp-text);
    }

    .pane-title.result {
        background: var(--ctp-sapphire);
        color: var(--ctp-base);
    }

    .pane-title .hint {
        font-weight: 400;
        color: var(--ctp-subtext0);
    }
    .pane-title.result .hint {
        color: var(--ctp-base);
        opacity: 0.8;
    }

    .merge-grid {
        flex: 1;
        overflow: auto;
        font-family: var(--stack-mono);
        font-size: 13px;
        line-height: 1.5;
        background: var(--ctp-base);
    }

    .region-row {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 1px;
        background: var(--ctp-overlay0);
    }

    .cell {
        position: relative;
        background: var(--ctp-base);
        padding: 0 8px;
        min-width: 0;
        overflow: hidden;
    }

    .region-row.stable .cell {
        background: var(--ctp-base);
        color: var(--ctp-subtext1);
    }

    .region-row.conflict.unresolved {
        outline: 1px solid var(--ctp-red);
    }

    .cell.ours .ln.add {
        background: color-mix(in srgb, var(--ctp-green) 18%, transparent);
    }
    .cell.theirs .ln.add {
        background: color-mix(in srgb, var(--ctp-blue) 18%, transparent);
    }

    .ln {
        white-space: pre;
        min-height: 1.5em;
    }
    .ln.empty {
        color: var(--ctp-overlay0);
        font-style: italic;
    }

    .cell-tools {
        display: flex;
        gap: 4px;
        padding: 2px 0;
    }
    .cell-tools.right {
        justify-content: flex-end;
    }
    .cell-tools .arrow {
        background: transparent;
        border: none;
        color: var(--ctp-subtext0);
        cursor: pointer;
        padding: 0;
        display: flex;
        align-items: center;
    }
    .cell-tools .arrow:hover {
        color: var(--ctp-sapphire);
    }

    .center-tools {
        flex-wrap: wrap;
        align-items: center;
    }
    .center-tools button {
        background: var(--ctp-surface0);
        border: 1px solid var(--ctp-overlay0);
        border-radius: 4px;
        color: var(--ctp-text);
        font-size: 11px;
        padding: 1px 6px;
        cursor: pointer;
    }
    .center-tools button:hover {
        background: var(--ctp-surface1);
    }
    .center-tools .mode {
        margin-left: auto;
        font-size: 11px;
        color: var(--ctp-subtext0);
    }
    .center-tools .mode.mode-unresolved {
        color: var(--ctp-red);
        font-weight: 600;
    }

    .result-edit {
        width: 100%;
        border: none;
        outline: none;
        resize: vertical;
        background: var(--ctp-mantle);
        color: var(--ctp-text);
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
        white-space: pre;
        padding: 2px 4px;
    }

    .nav {
        display: flex;
        gap: 4px;
    }
    .nav button {
        background: var(--ctp-surface0);
        border: 1px solid var(--ctp-overlay0);
        border-radius: 4px;
        color: var(--ctp-text);
        cursor: pointer;
        display: flex;
        align-items: center;
        padding: 2px 6px;
    }
    .nav button:hover {
        background: var(--ctp-surface1);
    }

    .resolver-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 16px;
        background: var(--ctp-mantle);
        border-top: 1px solid var(--ctp-overlay0);
    }

    .status-info {
        display: flex;
        align-items: center;
        gap: 16px;
        font-family: var(--stack-industrial);
        font-size: 13px;
        color: var(--ctp-subtext0);
    }

    .status-text {
        color: var(--ctp-subtext0);
    }

    .status-ready {
        display: flex;
        align-items: center;
        gap: 4px;
        color: var(--ctp-green);
        font-weight: 600;
    }
</style>
