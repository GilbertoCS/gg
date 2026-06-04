<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import Icon from "../controls/Icon.svelte";

    let expanded = false;
    let query = "";
    let inputEl: HTMLInputElement;

    function toggle() {
        expanded = !expanded;
        if (expanded) {
            setTimeout(() => inputEl?.focus(), 50);
        } else {
            query = "";
        }
    }

    function handleKeydown(event: KeyboardEvent) {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
            event.preventDefault();
            toggle();
        }
        if (event.key === "Escape" && expanded) {
            expanded = false;
            query = "";
        }
    }

    onMount(() => {
        document.addEventListener("keydown", handleKeydown);
    });

    onDestroy(() => {
        document.removeEventListener("keydown", handleKeydown);
    });

    function onSubmit() {
        // TODO: wire to revset navigation when canvas layout is ready
        console.log("omnibar query:", query);
        expanded = false;
        query = "";
    }
</script>

<div class="omnibar-wrapper" class:expanded>
    {#if expanded}
        <div class="omnibar-backdrop" role="button" tabindex="-1" on:click={() => { expanded = false; query = ""; }} on:keydown={() => {}}></div>
        <div class="omnibar-card">
            <div class="omnibar-input-row">
                <Icon name="search" />
                <input
                    bind:this={inputEl}
                    bind:value={query}
                    placeholder="Search commits, bookmarks, or type a revset..."
                    on:keydown={(e) => { if (e.key === "Enter") onSubmit(); }}
                />
                <span class="shortcut-hint">ESC</span>
            </div>
            <div class="omnibar-hints">
                <span>Tip: <kbd>Ctrl+K</kbd> to toggle</span>
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

    .omnibar-hints {
        padding: 6px 14px;
        font-size: 12px;
        color: var(--ctp-subtext0);
        background: var(--ctp-crust);
        border-top: 1px solid var(--ctp-overlay0);
    }

    .omnibar-hints kbd {
        font-family: var(--stack-code);
        font-size: 11px;
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


