<script lang="ts">
    import IdSpan from "../controls/IdSpan.svelte";
    import Icon from "../controls/Icon.svelte";
    import type { Operand } from "../messages/Operand";
    import type { RichHint } from "../mutators/BinaryMutator";
    import BinaryMutator from "../mutators/BinaryMutator";
    import { ignoreToggled, currentSource, currentTarget, hasModal, repoConfigEvent, repoStatusEvent, activeActivity, zoomLevel } from "../stores";
    import { isTauri, trigger } from "../ipc";
    import ToggleWidget from "../controls/ToggleWidget.svelte";
    import BookmarkSpan from "../controls/BookmarkSpan.svelte";

    const ZOOM_LEVELS = [75, 90, 100, 110, 125, 150];

    function zoomIn() {
        const idx = ZOOM_LEVELS.indexOf($zoomLevel);
        if (idx < ZOOM_LEVELS.length - 1) zoomLevel.set(ZOOM_LEVELS[idx + 1]);
    }

    function zoomOut() {
        const idx = ZOOM_LEVELS.indexOf($zoomLevel);
        if (idx > 0) zoomLevel.set(ZOOM_LEVELS[idx - 1]);
    }

    export let target: boolean;

    let dropHint: RichHint | null = null;
    let maybe = false;

    $: setDropHint($currentSource, $currentTarget);
    $: if (isTauri()) trigger("set_modifier_state", { alt: $ignoreToggled });

    function setDropHint(source: Operand | null, target: Operand | null) {
        maybe = false;
        if (source) {
            let mutator = new BinaryMutator(source, target, $ignoreToggled);
            if (target) {
                let canDrop = mutator.canDrop();
                if (canDrop.type == "yes") {
                    dropHint = canDrop.hint;
                    return;
                } else if (canDrop.type == "maybe") {
                    dropHint = [canDrop.hint];
                    maybe = true;
                    return;
                }
            }

            let canDrag = mutator.canDrag();
            if (canDrag.type == "yes") {
                dropHint = canDrag.hint;
                return;
            }
        }

        dropHint = null;
    }
</script>

{#if !dropHint}
    <div id="status-bar" class="repo-bar" data-activity={$activeActivity} inert={$hasModal}>
        <div class="substatus">
            <ToggleWidget tip="ignore immutability" bind:checked={$ignoreToggled} safe on="shield-off" off="shield" />
            <span class="status-op">
                {$repoConfigEvent?.type != "Workspace"
                    ? ""
                    : ($repoStatusEvent?.operation_description ?? "")}
            </span>
        </div>
        <div class="substatus path-container">
            <span id="status-workspace">
                {$repoConfigEvent?.type == "Workspace" ? $repoConfigEvent.absolute_path : "No workspace"}
            </span>
        </div>
        <div class="substatus zoom-controls">
            <button class="zoom-btn" title="Zoom out" on:click={zoomOut} disabled={$zoomLevel <= ZOOM_LEVELS[0]}>
                <Icon name="minus" />
            </button>
            <span class="zoom-label">{$zoomLevel}%</span>
            <button class="zoom-btn" title="Zoom in" on:click={zoomIn} disabled={$zoomLevel >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}>
                <Icon name="plus" />
            </button>
        </div>
    </div>
{:else}
    <div id="status-bar" class="drag-bar" data-activity={$activeActivity} class:target class:maybe>
        <div>
            {#each dropHint as run, i}
                {#if typeof run == "string"}
                    <span>{run}{i == dropHint.length - 1 ? "." : ""}</span>
                {:else if run.type == "LocalBookmark" || run.type == "RemoteBookmark"}
                    <span><BookmarkSpan ref={run} /></span>
                {:else}
                    <span><IdSpan id={run} />{i == dropHint.length - 1 ? "." : ""}</span>
                {/if}
            {/each}
        </div>
    </div>
{/if}

<style>
    #status-bar {
        grid-area: footer;
        height: 100%;
        padding: 0 8px;
        gap: 6px;
        align-items: center;
        background: var(--ctp-mantle);
        border-top: 1px solid var(--ctp-overlay0);
        position: relative;
        overflow: hidden;
        font-size: 11px;
        color: var(--ctp-text);
    }

    .repo-bar {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        position: relative;
    }

    .drag-bar {
        display: flex;
        justify-content: center;
        position: relative;
    }

    .substatus {
        height: 100%;
        display: flex;
        align-items: center;
        gap: 6px;
        white-space: nowrap;
    }

    .substatus > span {
        height: 21px;
        display: flex;
        align-items: center;
    }

    .path-container {
        flex: 1;
        justify-content: center;
        min-width: 0;
    }

    .status-op {
        font-size: 11px;
        color: var(--ctp-subtext0);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .zoom-controls {
        justify-content: flex-end;
    }

    .zoom-btn {
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: 3px;
        background: transparent;
        color: var(--ctp-subtext0);
        cursor: pointer;
        padding: 0;
        transition: all 80ms ease;
    }

    .zoom-btn:hover:not(:disabled) {
        background: var(--ctp-surface0);
        color: var(--ctp-text);
    }

    .zoom-btn:disabled {
        opacity: 0.3;
        cursor: not-allowed;
    }

    .zoom-btn :global(svg) {
        width: 12px;
        height: 12px;
    }

    .zoom-label {
        font-size: 10px;
        color: var(--ctp-subtext0);
        min-width: 32px;
        text-align: center;
        font-family: var(--stack-code);
    }

    #status-workspace {
        white-space: nowrap;
        direction: rtl;
        text-align: left;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
        font-size: 11px;
        color: var(--ctp-subtext1);
    }

    .target {
        background: var(--ctp-flamingo);
        color: black;
    }

    .maybe {
        background: transparent;
        color: var(--ctp-peach);
    }

</style>
