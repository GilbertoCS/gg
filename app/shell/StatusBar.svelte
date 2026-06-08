<script lang="ts">
    import IdSpan from "../controls/IdSpan.svelte";
    import type { Operand } from "../messages/Operand";
    import type { RichHint } from "../mutators/BinaryMutator";
    import BinaryMutator from "../mutators/BinaryMutator";
    import { ignoreToggled, currentSource, currentTarget, hasModal, repoConfigEvent, repoStatusEvent, activeActivity } from "../stores";
    import { isTauri, trigger } from "../ipc";
    import ToggleWidget from "../controls/ToggleWidget.svelte";
    import BookmarkSpan from "../controls/BookmarkSpan.svelte";

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
        </div>
        <div class="substatus path-container">
            <span id="status-workspace">
                {$repoConfigEvent?.type == "Workspace" ? $repoConfigEvent.absolute_path : "No workspace"}
            </span>
        </div>
        <div class="substatus">
            <span class="status-op">
                {$repoConfigEvent?.type != "Workspace"
                    ? ""
                    : ($repoStatusEvent?.operation_description ?? "no operation")}
            </span>
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
        padding: 0 6px;
        gap: 6px;
        align-items: center;
        background:
            linear-gradient(180deg, var(--ctp-base) 0%, var(--ctp-mantle) 100%);
        border-top: 2px solid var(--ctp-overlay0);
        position: relative;
        overflow: hidden;
    }

    /* Subtle grid pattern overlay */
    #status-bar::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image:
            linear-gradient(var(--ctp-overlay0) 1px, transparent 1px),
            linear-gradient(90deg, var(--ctp-overlay0) 1px, transparent 1px);
        background-size: 20px 20px;
        opacity: 0.05;
        pointer-events: none;
        z-index: 1;
    }

    /* Top accent bar */
    #status-bar::after {
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
        pointer-events: none;
        z-index: 2;
    }

    .repo-bar {
        display: grid;
        grid-template-columns: minmax(auto, 40%) 1fr minmax(auto, 40%);
        position: relative;
        z-index: 2;
    }

    .drag-bar {
        display: flex;
        justify-content: center;
        position: relative;
        z-index: 2;
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
    }

    #status-remotes {
        justify-content: space-evenly;
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

    #status-workspace {
        white-space: nowrap;
        direction: rtl;
        text-align: left;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
    }

    .target {
        background: var(--ctp-flamingo);
        color: black;
    }

    .maybe {
        background: transparent;
        color: var(--ctp-peach);
    }

    /* Activity-specific accent colors */
    #status-bar { --accent: #ff6b9d; }
    #status-bar[data-activity="branches"] { --accent: #00d4aa; }
    #status-bar[data-activity="changes"] { --accent: #ffd700; }
    #status-bar[data-activity="remotes"] { --accent: #ff8c42; }
    #status-bar[data-activity="tags"] { --accent: #c77dff; }
    #status-bar[data-activity="settings"] { --accent: #00b4d8; }
</style>
