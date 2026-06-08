<script lang="ts">
    import { dragOverWidget, hasModal } from "../stores";

    export let tip: string = "";
    export let onClick: (event: MouseEvent) => void;
    export let safe: boolean = false;
    export let secondary: boolean = false;
    export let disabled: boolean = false;

    $: isDisabled = disabled || (!safe && $hasModal);
</script>

<button
    disabled={isDisabled}
    class:safe
    class:secondary
    on:click|stopPropagation={isDisabled ? undefined : onClick}
    on:dragenter={dragOverWidget}
    on:dragover={dragOverWidget}
    title={isDisabled ? "" : tip}>
    <slot />
</button>

<style>
    button {
        height: 28px;
        font-size: 13px;
        padding: 4px 10px;

        outline: none;
        margin: 0;
        border: 1px solid transparent;
        border-radius: 6px;

        font-family: var(--stack-industrial);
        display: flex;
        align-items: center;
        gap: 6px;

        cursor: pointer;
        transition: all 120ms ease;

        color: var(--ctp-text);
        background: var(--ctp-surface0);
    }

    button:not(:disabled) {
        &:hover {
            background: var(--ctp-surface1);
            border-color: var(--ctp-overlay0);
        }
        &:hover :global(svg) {
            filter: drop-shadow(0 0 3px currentColor);
        }
        &:focus-visible {
            border-color: var(--ctp-lavender);
            border-width: 2px;
            padding: 3px 9px;
        }
        &:active {
            background: var(--ctp-surface2);
        }
    }

    button.safe {
        background: var(--ctp-sapphire);
        color: white;
        &:hover {
            background: var(--ctp-teal);
        }
        &:hover :global(svg) {
            filter: drop-shadow(0 0 3px white);
        }
    }

    button.secondary {
        background: var(--ctp-surface1);
        &:hover {
            background: var(--ctp-surface2);
        }
    }

    button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
</style>
