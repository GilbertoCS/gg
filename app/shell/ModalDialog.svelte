<script lang="ts">
    import { createEventDispatcher, onMount } from "svelte";

    interface $$Events {
        cancel: CustomEvent<void>;
        default: CustomEvent<void>;
    }

    export let title: string;
    export let error: boolean = false;

    let dispatch = createEventDispatcher();

    onMount(() => {
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
        };
    });

    function onKeyDown(event: KeyboardEvent) {
        if (event.key == "Escape") {
            dispatch("cancel");
        } else if (event.key == "Enter") {
            dispatch("default");
        }
    }
</script>

<div id="dialog-chrome" role="dialog" aria-modal="true">
    <h3 id="dialog-header" class:error>{title}</h3>

    <div id="dialog-content">
        <slot />
    </div>

    <div id="dialog-commands">
        <slot name="commands" />
    </div>
</div>

<style>
    #dialog-chrome {
        --accent: #00b4d8;

        grid-area: 2/2/2/2;

        background:
            linear-gradient(180deg, var(--ctp-base) 0%, var(--ctp-mantle) 100%);
        border-radius: var(--radius-lg);
        border: 2px solid var(--ctp-overlay0);
        box-shadow: var(--shadow-lg);

        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-width: 320px;
        max-width: 90vw;
        position: relative;
    }

    /* Subtle grid pattern overlay */
    #dialog-chrome::before {
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

    #dialog-header {
        height: 48px;
        min-height: 48px;
        padding: 0 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(180deg, var(--ctp-surface0) 0%, var(--ctp-surface1) 100%);
        border-bottom: 2px solid var(--ctp-overlay0);
        position: relative;
        z-index: 1;
    }

    #dialog-header::after {
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

    #dialog-header.error {
        --accent: var(--ctp-red);
        color: var(--ctp-red);
    }

    #dialog-content {
        padding: 14px;
        display: grid;
        grid-template-columns: auto 1fr;
        align-items: baseline;
        gap: 6px 10px;
        z-index: 1;
        overflow-y: auto;
        max-height: 70vh;
    }

    #dialog-content > :global(:nth-child(even)) {
        justify-self: start;
    }

    #dialog-content :global(select),
    #dialog-content :global(input) {
        height: 30px;
        min-width: 30px;

        font-family: var(--stack-code);
        font-size: 14px;
    }
    #dialog-content :global(select),
    #dialog-content :global(input[type="text"]),
    #dialog-content :global(input[type="password"]) {
        min-width: 180px;
    }
    #dialog-content :global(input[type="url"]) {
        min-width: 360px;
    }
    #dialog-content :global(input[type="checkbox"]) {
        vertical-align: middle;
    }

    #dialog-commands {
        padding: 10px 14px;
        display: flex;
        align-items: center;
        justify-content: end;
        gap: 8px;
        border-top: 1px solid var(--ctp-overlay0);
        background: var(--ctp-surface0);
        z-index: 1;
    }

    .error {
        color: var(--ctp-red);
    }
</style>
