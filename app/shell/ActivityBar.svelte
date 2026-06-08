<script lang="ts">
    import Icon from "../controls/Icon.svelte";
    import { activeActivity, sidePanelVisible, cheatSheetVisible, activityLogVisible } from "../stores";

    const activities = [
        { id: "graph", icon: "activity", tip: "Graph" },
        { id: "settings", icon: "settings", tip: "Settings" },
    ];

    function setActivity(id: string) {
        if ($activeActivity === id) {
            sidePanelVisible.update(v => !v);
        } else {
            activeActivity.set(id);
            sidePanelVisible.set(true);
        }
    }
</script>

<nav class="activity-bar" aria-label="Activity bar">
    <div class="bar-header">
        <div class="logo-badge">gg</div>
    </div>

    <div class="activities-container">
        <button
            type="button"
            class="activity-item"
            class:active={$sidePanelVisible}
            title="Toggle panel (Ctrl+K)"
            on:click={() => sidePanelVisible.update(v => !v)}
            aria-pressed={$sidePanelVisible}>
            <Icon name="sidebar" />
        </button>

        {#each activities as activity}
            <button
                type="button"
                class="activity-item"
                class:active={$activeActivity === activity.id}
                title={activity.tip}
                on:click={() => setActivity(activity.id)}
                aria-pressed={$activeActivity === activity.id}>
                <Icon name={activity.icon} />
            </button>
        {/each}
    </div>

    <div class="bar-footer">
        <button
            type="button"
            class="activity-item"
            class:active={$activityLogVisible}
            title="Activity Log"
            on:click={() => activityLogVisible.update(v => !v)}>
            <Icon name="list" />
        </button>
        <button
            type="button"
            class="activity-item"
            class:active={$cheatSheetVisible}
            title="jj Cheat Sheet"
            on:click={() => cheatSheetVisible.update(v => !v)}>
            <Icon name="help-circle" />
        </button>
    </div>
</nav>

<style>
    .activity-bar {
        grid-area: activity;
        width: 48px;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0;
        gap: 0;
        background: var(--ctp-mantle);
        border-right: 1px solid var(--ctp-overlay0);
        position: relative;
        user-select: none;
        overflow: hidden;
    }

    .bar-header {
        padding: 8px 0;
        display: flex;
        justify-content: center;
    }

    .logo-badge {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--ctp-blue);
        border-radius: 8px;
        font-family: var(--stack-industrial);
        font-size: 13px;
        font-weight: 700;
        color: white;
    }

    .activities-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 4px 0;
        gap: 2px;
    }

    .activity-item {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: var(--ctp-subtext0);
        cursor: pointer;
        padding: 0;
        margin: 0;
        transition: all 100ms ease;
    }

    .activity-item :global(svg) {
        width: 18px;
        height: 18px;
    }

    .activity-item:hover {
        color: var(--ctp-text);
        background: var(--ctp-surface0);
    }

    .activity-item.active {
        color: var(--ctp-text);
        background: var(--ctp-surface1);
    }

    .activity-item:focus-visible {
        outline: 2px solid var(--ctp-blue);
        outline-offset: -2px;
    }

    .bar-footer {
        padding: 8px 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
    }
</style>
