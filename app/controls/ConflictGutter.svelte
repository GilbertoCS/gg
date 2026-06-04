<script lang="ts">
    import type { ConflictSlice } from "../lib/ThreeSide";
    import { ConflictType, ThreeSide } from "../lib/ThreeSide";
    import Icon from "./Icon.svelte";

    export let slices: ConflictSlice[];
    export let onAccept: (conflictIndex: number, side: ThreeSide) => void;
    
    // Track which conflicts have been resolved
    let resolvedIndices = new Set<number>();

    function handleAccept(conflictIndex: number, side: ThreeSide) {
        resolvedIndices.add(conflictIndex);
        resolvedIndices = resolvedIndices; // Trigger reactivity
        onAccept(conflictIndex, side);
    }

    function isResolved(index: number): boolean {
        return resolvedIndices.has(index);
    }

    function getConflictClass(type: ConflictType): string {
        switch (type) {
            case ConflictType.Conflict:
                return "conflict";
            case ConflictType.LeftChange:
                return "left-change";
            case ConflictType.RightChange:
                return "right-change";
            case ConflictType.IdenticalChange:
                return "identical";
            default:
                return "";
        }
    }
</script>

<div class="conflict-gutter">
    <div class="gutter-header">
        <span>Conflicts</span>
        <span class="counter">
            {resolvedIndices.size} / {slices.length} resolved
        </span>
    </div>
    <div class="gutter-content">
        {#each slices as slice, index}
            <div 
                class="conflict-item {getConflictClass(slice.conflictType)}"
                class:resolved={isResolved(index)}
            >
                <div class="conflict-info">
                    <span class="conflict-number">#{slice.index + 1}</span>
                    <span class="conflict-type">{slice.conflictType}</span>
                </div>
                
                <div class="action-buttons">
                    {#if slice.conflictType !== ConflictType.RightChange && !isResolved(index)}
                        <button
                            class="accept-btn accept-left"
                            on:click={() => handleAccept(index, ThreeSide.LEFT)}
                            title="Accept Ours (left side)"
                        >
                            <Icon name="arrow-left-circle" />
                            <span>Ours</span>
                        </button>
                    {/if}
                    
                    {#if slice.conflictType !== ConflictType.LeftChange && !isResolved(index)}
                        <button
                            class="accept-btn accept-right"
                            on:click={() => handleAccept(index, ThreeSide.RIGHT)}
                            title="Accept Theirs (right side)"
                        >
                            <span>Theirs</span>
                            <Icon name="arrow-right-circle" />
                        </button>
                    {/if}
                    
                    {#if isResolved(index)}
                        <span class="resolved-badge">
                            <Icon name="check-circle" />
                            Resolved
                        </span>
                    {/if}
                </div>
            </div>
        {/each}
    </div>
</div>

<style>
    .conflict-gutter {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: var(--ctp-mantle);
        border: 1px solid var(--ctp-overlay0);
    }

    .gutter-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: var(--ctp-crust);
        border-bottom: 1px solid var(--ctp-overlay0);
        font-family: var(--stack-industrial);
        font-size: 14px;
        font-weight: 600;
    }

    .counter {
        font-size: 12px;
        color: var(--ctp-subtext0);
        font-weight: normal;
    }

    .gutter-content {
        flex: 1;
        overflow: auto;
        padding: 8px;
    }

    .conflict-item {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 8px;
        margin-bottom: 8px;
        border-radius: 4px;
        background: var(--ctp-base);
        border-left: 3px solid var(--ctp-overlay0);
    }

    .conflict-item.conflict {
        border-left-color: var(--ctp-red);
    }

    .conflict-item.left-change {
        border-left-color: var(--ctp-blue);
    }

    .conflict-item.right-change {
        border-left-color: var(--ctp-green);
    }

    .conflict-item.identical {
        border-left-color: var(--ctp-yellow);
    }

    .conflict-item.resolved {
        opacity: 0.6;
        border-left-color: var(--ctp-teal);
    }

    .conflict-info {
        display: flex;
        justify-content: space-between;
        font-family: var(--stack-mono);
        font-size: 12px;
    }

    .conflict-number {
        font-weight: 600;
        color: var(--ctp-text);
    }

    .conflict-type {
        color: var(--ctp-subtext0);
        text-transform: lowercase;
    }

    .action-buttons {
        display: flex;
        gap: 6px;
    }

    .accept-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        border: none;
        border-radius: 3px;
        font-family: var(--stack-industrial);
        font-size: 12px;
        cursor: pointer;
        transition: background 0.15s ease;
    }

    .accept-left {
        background: var(--ctp-blue);
        color: var(--ctp-base);
    }

    .accept-left:hover {
        background: var(--ctp-sapphire);
    }

    .accept-right {
        background: var(--ctp-green);
        color: var(--ctp-base);
    }

    .accept-right:hover {
        background: var(--ctp-teal);
    }

    .resolved-badge {
        display: flex;
        align-items: center;
        gap: 4px;
        color: var(--ctp-teal);
        font-family: var(--stack-industrial);
        font-size: 12px;
    }

    /* Scrollbar styling */
    .gutter-content::-webkit-scrollbar {
        width: 6px;
    }

    .gutter-content::-webkit-scrollbar-thumb {
        background-color: var(--ctp-overlay0);
        border-radius: 3px;
    }

    .gutter-content::-webkit-scrollbar-track {
        background-color: var(--ctp-crust);
    }
</style>
