<script lang="ts">
    import type { ConflictSlice, ConflictSide } from "../lib/ThreeSide";
    import { ConflictType, ThreeSide } from "../lib/ThreeSide";
    import type { MultilineString } from "../messages/MultilineString";
    import DiffPane from "../controls/DiffPane.svelte";
    import ResultPane from "../controls/ResultPane.svelte";
    import ConflictGutter from "../controls/ConflictGutter.svelte";
    import ActionWidget from "../controls/ActionWidget.svelte";
    import Icon from "../controls/Icon.svelte";
    import { createEventDispatcher } from "svelte";

    export let path: string;
    export let slices: ConflictSlice[];
    export let fileExtension: string = "";

    const dispatch = createEventDispatcher<{
        apply: { resolvedContent: string };
        cancel: void;
    }>();

    // Build the full content for each side by combining non-conflict lines with conflict regions
    let oursLines: string[] = [];
    let theirsLines: string[] = [];
    let resultLines: string[] = [];

    // Track which slices have been resolved and with which side
    let resolvedSlices = new Map<number, ThreeSide | "manual">();

    // Build initial content from slices
    $: {
        oursLines = [];
        theirsLines = [];
        resultLines = [];

        // For simplicity, we'll concatenate all slices
        // In a full implementation, we'd preserve context between conflicts
        for (const slice of slices) {
            // Add the conflict content
            oursLines.push(`<<<<<<< ${slice.sides[0].label}`);
            oursLines.push(...slice.sides[0].content.lines);
            oursLines.push("=======");
            oursLines.push(...slice.sides[1].content.lines);
            oursLines.push(`>>>>>>> ${slice.sides[1].label}`);

            theirsLines.push(`<<<<<<< ${slice.sides[0].label}`);
            theirsLines.push(...slice.sides[0].content.lines);
            theirsLines.push("=======");
            theirsLines.push(...slice.sides[1].content.lines);
            theirsLines.push(`>>>>>>> ${slice.sides[1].label}`);

            // Result starts with conflict markers
            resultLines.push(...slice.initialResult.lines);
        }
    }

    function handleAccept(conflictIndex: number, side: ThreeSide) {
        const slice = slices[conflictIndex];
        if (!slice) return;

        // Mark as resolved
        resolvedSlices.set(conflictIndex, side);
        resolvedSlices = resolvedSlices; // Trigger reactivity

        // Get the content to insert
        const sideContent = slice.sides[side === ThreeSide.LEFT ? 0 : 1].content.lines;

        // Find and replace the conflict region in resultLines
        // For now, we'll rebuild the entire result
        rebuildResult();
    }

    function rebuildResult() {
        resultLines = [];

        for (let i = 0; i < slices.length; i++) {
            const slice = slices[i];
            const resolution = resolvedSlices.get(i);

            if (resolution === ThreeSide.LEFT) {
                // Use ours
                resultLines.push(...slice.sides[0].content.lines);
            } else if (resolution === ThreeSide.RIGHT) {
                // Use theirs
                resultLines.push(...slice.sides[1].content.lines);
            } else if (resolution === "manual") {
                // Keep whatever is currently in resultLines for this slice
                // This would need more sophisticated tracking in a full implementation
                resultLines.push(...slice.initialResult.lines);
            } else {
                // Unresolved - keep conflict markers
                resultLines.push(...slice.initialResult.lines);
            }
        }
    }

    function handleResultChange(event: CustomEvent<{ content: string[] }>) {
        resultLines = event.detail.content;
        // Mark as manually edited
        // In a full implementation, we'd track which slice was edited
    }

    function applyAllNonConflicts() {
        for (let i = 0; i < slices.length; i++) {
            const slice = slices[i];
            if (slice.conflictType === ConflictType.LeftChange) {
                resolvedSlices.set(i, ThreeSide.LEFT);
            } else if (slice.conflictType === ConflictType.RightChange) {
                resolvedSlices.set(i, ThreeSide.RIGHT);
            } else if (slice.conflictType === ConflictType.IdenticalChange) {
                // Either side works for identical changes
                resolvedSlices.set(i, ThreeSide.LEFT);
            }
        }
        resolvedSlices = resolvedSlices;
        rebuildResult();
    }

    function handleApply() {
        dispatch("apply", { resolvedContent: resultLines.join("\n") });
    }

    function handleCancel() {
        dispatch("cancel");
    }

    $: allResolved = resolvedSlices.size === slices.length;
    $: resolvedCount = resolvedSlices.size;
</script>

<div class="conflict-resolver">
    <div class="resolver-header">
        <div class="file-info">
            <Icon name="git-merge" />
            <span class="filename">{path}</span>
        </div>
        <div class="header-actions">
            <ActionWidget
                tip="Auto-resolve non-conflicting changes"
                onClick={applyAllNonConflicts}
                secondary
            >
                <Icon name="check-circle" />
                Auto-resolve
            </ActionWidget>
            <ActionWidget
                tip="Cancel and discard changes"
                onClick={handleCancel}
                secondary
            >
                <Icon name="x" />
                Cancel
            </ActionWidget>
            <ActionWidget
                tip="Apply resolved content"
                onClick={handleApply}
                disabled={!allResolved}
            >
                <Icon name="check" />
                Apply
            </ActionWidget>
        </div>
    </div>

    <div class="resolver-body">
        <div class="panes-container">
            <div class="diff-pane-wrapper">
                <DiffPane
                    content={{ lines: oursLines }}
                    side={ThreeSide.LEFT}
                    label="Ours"
                    {fileExtension}
                />
            </div>

            <div class="result-pane-wrapper">
                <ResultPane
                    initialContent={{ lines: resultLines }}
                    {fileExtension}
                    on:change={handleResultChange}
                />
            </div>

            <div class="diff-pane-wrapper">
                <DiffPane
                    content={{ lines: theirsLines }}
                    side={ThreeSide.RIGHT}
                    label="Theirs"
                    {fileExtension}
                />
            </div>
        </div>

        <div class="gutter-container">
            <ConflictGutter
                {slices}
                onAccept={handleAccept}
            />
        </div>
    </div>

    <div class="resolver-footer">
        <div class="status-info">
            <span class="status-text">
                {resolvedCount} of {slices.length} conflicts resolved
            </span>
            {#if allResolved}
                <span class="status-ready">
                    <Icon name="check-circle" />
                    Ready to apply
                </span>
            {/if}
        </div>
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

    .resolver-body {
        display: flex;
        flex: 1;
        overflow: hidden;
    }

    .panes-container {
        display: flex;
        flex: 1;
        gap: 8px;
        padding: 8px;
    }

    .diff-pane-wrapper,
    .result-pane-wrapper {
        flex: 1;
        min-width: 0;
        overflow: hidden;
    }

    .gutter-container {
        width: 280px;
        padding: 8px 8px 8px 0;
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
