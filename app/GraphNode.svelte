<script lang="ts">
    import type { RevHeader } from "./messages/RevHeader";
    import { currentContext, BRANCH_COLORS } from "./stores.js";

    export let header: RevHeader;
    export let column: number = 0;

    let context = false;
    $: context = $currentContext?.type == "Revision" && header == $currentContext.header;
    $: wcClass = header.working_copy_of != null ? "other-wc" : "wc";
    $: nodeColor = BRANCH_COLORS[column % BRANCH_COLORS.length];
</script>

{#if header.is_working_copy}
    <!-- WIP node: pulsing double-ring -->
    <circle class="wip-glow" cx="9" cy="15" r="8" style="stroke: {nodeColor}" />
    <circle cx="9" cy="15" r="6" style="stroke: {nodeColor}; fill: {nodeColor}" class:context />
    <circle cx="9" cy="15" r="3" style="fill: var(--ctp-base)" />
{:else if header.is_immutable}
    <!-- Immutable: filled solid circle -->
    <circle cx="9" cy="15" r="5" style="stroke: {nodeColor}; fill: {nodeColor}" class:context />
{:else}
    <!-- Mutable: hollow circle -->
    <circle cx="9" cy="15" r="5" class="mutable" style="stroke: {nodeColor}" class:context />
{/if}

<style>
    circle {
        pointer-events: none;
        stroke-width: 2px;
    }

    .wip-glow {
        fill: none;
        stroke-width: 1.5px;
        opacity: 0.5;
        animation: wip-pulse 2s ease-in-out infinite;
    }

    @keyframes wip-pulse {
        0%, 100% { opacity: 0.3; r: 8; }
        50% { opacity: 0.7; r: 9; }
    }

    .context {
        filter: drop-shadow(0 0 3px currentColor);
    }

    .mutable {
        fill: none;
    }
</style>
