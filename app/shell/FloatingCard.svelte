<script lang="ts">
    import Icon from "../controls/Icon.svelte";

    export let title: string;
    export let onClose: () => void;
</script>

<div class="floating-card">
    <div class="card-header">
        <span class="card-title">{title}</span>
        <button type="button" class="card-close" on:click={onClose} title="Close">
            <Icon name="x" />
        </button>
    </div>
    <div class="card-body">
        <slot />
    </div>
</div>

<style>
    .floating-card {
        --accent: #00b4d8;

        position: absolute;
        top: 12px;
        right: 12px;
        width: 420px;
        max-width: calc(100% - 260px);
        max-height: calc(100% - 24px);
        background:
            linear-gradient(180deg, var(--ctp-base) 0%, var(--ctp-mantle) 100%);
        border: 2px solid var(--ctp-overlay0);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        z-index: 50;
        user-select: none;
        position: relative;
    }

    /* Subtle grid pattern overlay */
    .floating-card::before {
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

    .card-header {
        height: 48px;
        min-height: 48px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 12px;
        background: linear-gradient(180deg, var(--ctp-surface0) 0%, var(--ctp-surface1) 100%);
        border-bottom: 2px solid var(--ctp-overlay0);
        position: relative;
        z-index: 1;
    }

    .card-header::after {
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

    .card-title {
        font-size: 12px;
        font-weight: 800;
        color: var(--ctp-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        pointer-events: none;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-family: var(--stack-industrial);
    }

    .card-close {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid var(--ctp-overlay0);
        border-radius: 8px;
        background: var(--ctp-surface1);
        color: var(--ctp-subtext0);
        cursor: pointer;
        padding: 0;
        margin: 0;
        flex-shrink: 0;
        transition: all 120ms ease;
        z-index: 2;
    }

    .card-close:hover {
        border-color: var(--accent);
        color: var(--accent);
        box-shadow: 0 0 8px var(--accent);
        transform: translateY(-1px);
    }

    .card-close:active {
        transform: translateY(0);
    }

    .card-body {
        flex: 1;
        overflow: auto;
        padding: 10px 8px;
        z-index: 1;
    }
</style>
