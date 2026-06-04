<script lang="ts">
    import Icon from "../controls/Icon.svelte";
    import { activityLogVisible, operationLog } from "../stores.js";
    import type { LogEntry } from "../stores.js";

    function fmtTime(ts: number): string {
        return new Date(ts).toLocaleTimeString(undefined, {
            hour: "2-digit", minute: "2-digit", second: "2-digit",
        });
    }

    function fmtElapsed(entry: LogEntry): string {
        if (entry.status === "running") return "";
        const ms = (entry.endTs ?? entry.ts) - entry.ts;
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    }

    const iconOf: Record<LogEntry["status"], string> = {
        running: "loader",
        ok:      "check-circle",
        error:   "alert-circle",
        info:    "info",
    };

    const badgeLabel: Record<LogEntry["status"], string> = {
        running: "running",
        ok:      "ok",
        error:   "error",
        info:    "info",
    };

    let expanded = new Set<number>();
    function toggle(id: number) {
        if (expanded.has(id)) { expanded.delete(id); } else { expanded.add(id); }
        expanded = expanded;
    }

    function clearLog() {
        operationLog.set([]);
        expanded = new Set();
    }
</script>

<div class="al-window">
    <div class="al-header">
        <span class="al-title">
            <Icon name="list" />
            Activity Log
        </span>
        <div class="al-actions">
            <span class="al-count">{$operationLog.length} entries</span>
            <button type="button" class="al-btn" title="Clear log" on:click={clearLog}>
                <Icon name="trash-2" />
            </button>
            <button type="button" class="al-btn" title="Close" on:click={() => activityLogVisible.set(false)}>
                <Icon name="x" />
            </button>
        </div>
    </div>

    <div class="al-body">
        {#if $operationLog.length === 0}
            <div class="al-empty">
                <Icon name="inbox" />
                <span>No activity yet</span>
            </div>
        {:else}
            <ul class="al-list">
                {#each $operationLog as entry (entry.id)}
                    {@const isExpanded = expanded.has(entry.id)}
                    <li class="al-row status-{entry.status}" class:expandable={!!entry.detail}>
                        <button
                            type="button"
                            class="al-row-btn"
                            disabled={!entry.detail}
                            on:click={() => entry.detail && toggle(entry.id)}>
                            <span class="al-icon" class:spin={entry.status === "running"}>
                                <Icon name={iconOf[entry.status]} />
                            </span>
                            <div class="al-content">
                                <span class="al-label">{entry.label}</span>
                                {#if isExpanded && entry.detail}
                                    <span class="al-detail">{entry.detail}</span>
                                {/if}
                            </div>
                            <div class="al-meta">
                                <span class="al-badge badge-{entry.status}">{badgeLabel[entry.status]}</span>
                                {#if fmtElapsed(entry)}
                                    <span class="al-elapsed">{fmtElapsed(entry)}</span>
                                {/if}
                                <span class="al-time">{fmtTime(entry.ts)}</span>
                                {#if entry.detail}
                                    <span class="al-chevron">
                                        <Icon name={isExpanded ? "chevron-up" : "chevron-down"} />
                                    </span>
                                {/if}
                            </div>
                        </button>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
</div>

<style>
    .al-window {
        --accent: #00b4d8;

        position: absolute;
        bottom: 42px;
        right: 12px;
        width: 460px;
        max-width: calc(100vw - 80px);
        max-height: 460px;
        background:
            linear-gradient(180deg, var(--ctp-base) 0%, var(--ctp-mantle) 100%);
        border: 2px solid var(--ctp-overlay0);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 60;
        font-size: 12px;
        position: relative;
    }

    /* Subtle grid pattern overlay */
    .al-window::before {
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

    .al-header {
        height: 48px;
        min-height: 48px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 12px;
        background: linear-gradient(180deg, var(--ctp-surface0) 0%, var(--ctp-surface1) 100%);
        border-bottom: 2px solid var(--ctp-overlay0);
        user-select: none;
        position: relative;
        z-index: 1;
    }

    .al-header::after {
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

    .al-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;
        font-weight: 800;
        color: var(--ctp-text);
        pointer-events: none;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-family: var(--stack-industrial);
    }

    .al-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        z-index: 2;
    }

    .al-count {
        font-size: 10.5px;
        color: var(--ctp-overlay1);
        font-family: var(--stack-code);
    }

    .al-btn {
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
        transition: all 120ms ease;
    }

    .al-btn:hover {
        border-color: var(--accent);
        color: var(--accent);
        box-shadow: 0 0 8px var(--accent);
        transform: translateY(-1px);
    }

    .al-btn:active {
        transform: translateY(0);
    }

    .al-body {
        flex: 1;
        overflow-y: auto;
    }

    .al-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        height: 120px;
        color: var(--ctp-overlay0);
        font-size: 12px;
        pointer-events: none;
    }

    .al-list {
        list-style: none;
        padding: 4px 0;
        margin: 0;
    }

    .al-row {
        border-bottom: 1px solid color-mix(in srgb, var(--ctp-overlay0) 30%, transparent);
    }

    .al-row:last-child {
        border-bottom: none;
    }

    .al-row-btn {
        width: 100%;
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 6px 10px;
        background: transparent;
        border: none;
        cursor: default;
        text-align: left;
    }

    .expandable .al-row-btn {
        cursor: pointer;
    }

    .al-row:hover .al-row-btn {
        background: var(--ctp-surface0);
    }

    .al-icon {
        flex-shrink: 0;
        margin-top: 2px;
    }

    .status-running .al-icon { color: var(--ctp-yellow); }
    .status-ok      .al-icon { color: var(--ctp-green); }
    .status-error   .al-icon { color: var(--ctp-red); }
    .status-info    .al-icon { color: var(--ctp-blue); }

    .status-error .al-label { color: var(--ctp-red); }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }

    .spin {
        animation: spin 1s linear infinite;
    }

    .al-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 3px;
        min-width: 0;
    }

    .al-label {
        font-size: 12px;
        color: var(--ctp-text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .al-detail {
        font-family: var(--stack-code);
        font-size: 10.5px;
        color: var(--ctp-subtext0);
        white-space: pre-wrap;
        word-break: break-all;
        padding: 4px 6px;
        background: var(--ctp-surface1);
        border-radius: var(--radius-sm);
        margin-top: 2px;
    }

    .al-meta {
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 3px;
        margin-top: 1px;
    }

    .al-badge {
        font-size: 9.5px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        padding: 1px 5px;
        border-radius: 4px;
        line-height: 1.4;
    }

    .badge-running { background: color-mix(in srgb, var(--ctp-yellow) 20%, transparent); color: var(--ctp-yellow); }
    .badge-ok      { background: color-mix(in srgb, var(--ctp-green)  20%, transparent); color: var(--ctp-green); }
    .badge-error   { background: color-mix(in srgb, var(--ctp-red)    20%, transparent); color: var(--ctp-red); }
    .badge-info    { background: color-mix(in srgb, var(--ctp-blue)   20%, transparent); color: var(--ctp-blue); }

    .al-elapsed {
        font-size: 10px;
        font-family: var(--stack-code);
        color: var(--ctp-overlay1);
    }

    .al-time {
        font-size: 10px;
        font-family: var(--stack-code);
        color: var(--ctp-overlay0);
    }

    .al-chevron {
        color: var(--ctp-overlay1);
        line-height: 0;
    }
</style>
