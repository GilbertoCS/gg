<script lang="ts">
    import Icon from "../controls/Icon.svelte";
    import { rightActiveActivity, rightPanelVisible, cheatSheetVisible, activityLogVisible } from "../stores";

    const activities = [
        { id: "repository", icon: "folder", tip: "Repository", accent: "#ff8c42" },
        { id: "revision", icon: "git-commit", tip: "Revision", accent: "#00d4aa" },
    ];

    function setActivity(id: string) {
        if ($rightActiveActivity === id) {
            rightPanelVisible.update(v => !v);
        } else {
            rightActiveActivity.set(id);
            rightPanelVisible.set(true);
        }
    }
</script>

<nav class="right-activity-bar" aria-label="Right activity bar" style="--accent: {activities.find(a => a.id === $rightActiveActivity)?.accent ?? '#ff6b9d'}">
    <div class="bar-header">
        <div class="logo-badge">⚡</div>
    </div>

    <div class="activities-container">
        {#each activities as activity}
            <button
                type="button"
                class="activity-item"
                class:active={$rightActiveActivity === activity.id}
                style="--accent: {activity.accent}"
                title={activity.tip}
                on:click={() => setActivity(activity.id)}
                aria-pressed={$rightActiveActivity === activity.id}>
                <div class="item-glow"></div>
                <div class="item-content">
                    <Icon name={activity.icon} />
                </div>
                {#if $rightActiveActivity === activity.id}
                    <div class="active-indicator"></div>
                {/if}
            </button>
        {/each}
    </div>

    <div class="bar-footer">
        <button
            type="button"
            class="help-btn"
            class:active={$activityLogVisible}
            title="Activity Log"
            on:click={() => activityLogVisible.update(v => !v)}>
            <Icon name="list" />
        </button>
        <button
            type="button"
            class="help-btn"
            class:active={$cheatSheetVisible}
            title="jj Cheat Sheet"
            on:click={() => cheatSheetVisible.update(v => !v)}>
            <Icon name="help-circle" />
        </button>
        <div class="deco-stars">✦ ✦</div>
    </div>
</nav>

<style>
    .right-activity-bar {
        grid-area: right-activity;
        width: 56px;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0;
        gap: 0;
        background:
            linear-gradient(180deg, var(--ctp-base) 0%, var(--ctp-mantle) 100%);
        border-left: 2px solid var(--ctp-overlay0);
        position: relative;
        user-select: none;
        overflow: hidden;
    }

    /* Subtle grid pattern overlay */
    .right-activity-bar::before {
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
    .right-activity-bar::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg,
            transparent 0%,
            var(--accent, #ff6b9d) 20%,
            var(--accent, #ff6b9d) 80%,
            transparent 100%
        );
        box-shadow: 0 2px 8px var(--accent, #ff6b9d);
        pointer-events: none;
        z-index: 2;
    }

    .bar-header {
        padding: 12px 0;
        display: flex;
        justify-content: center;
        z-index: 2;
    }

    .logo-badge {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #ffd700 0%, #ff8c42 50%, #ff6b9d 100%);
        border: 2px solid var(--ctp-text);
        border-radius: 10px;
        font-size: 16px;
        box-shadow:
            3px 3px 0 rgba(0,0,0,0.2),
            inset 0 1px 0 rgba(255,255,255,0.3);
        transform: rotate(3deg);
    }

    .activities-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px 0;
        gap: 8px;
        z-index: 2;
    }

    .activity-item {
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        border: 2px solid transparent;
        border-radius: 12px;
        background: transparent;
        color: var(--ctp-subtext0);
        cursor: pointer;
        padding: 0;
        margin: 0;
        transition: all 150ms ease;
    }

    .item-glow {
        position: absolute;
        inset: 0;
        border-radius: 12px;
        opacity: 0;
        transition: opacity 150ms ease;
        background: radial-gradient(circle at center, var(--accent) 0%, transparent 70%);
        filter: blur(8px);
    }

    .item-content {
        position: relative;
        z-index: 2;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 100ms ease;
    }

    .activity-item:hover {
        color: var(--ctp-text);
        border-color: var(--ctp-overlay0);
        background: var(--ctp-surface1);
    }

    .activity-item:hover .item-glow {
        opacity: 0.3;
    }

    .activity-item:hover .item-content {
        transform: scale(1.1);
    }

    .activity-item.active {
        color: var(--accent);
        border-color: var(--accent);
        background: linear-gradient(180deg, var(--ctp-surface1) 0%, var(--ctp-surface0) 100%);
        box-shadow:
            inset 0 2px 4px rgba(0,0,0,0.1),
            0 1px 0 rgba(255,255,255,0.1);
    }

    .activity-item.active .item-glow {
        opacity: 0.5;
    }

    .activity-item.active .item-content {
        transform: scale(1.05);
        filter: drop-shadow(0 0 4px var(--accent));
    }

    .active-indicator {
        position: absolute;
        left: -2px;
        top: 50%;
        transform: translateY(-50%);
        width: 3px;
        height: 24px;
        background: var(--accent);
        border-radius: 0 2px 2px 0;
        box-shadow: 0 0 8px var(--accent);
    }

    .activity-item:focus-visible {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 2px var(--accent), 0 0 12px var(--accent);
    }

    .bar-footer {
        padding: 12px 0;
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
    }

    .help-btn {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid transparent;
        border-radius: 8px;
        background: transparent;
        color: var(--ctp-subtext0);
        cursor: pointer;
        padding: 0;
        transition: all 150ms ease;
    }

    .help-btn:hover {
        background: var(--ctp-surface1);
        color: var(--ctp-text);
        border-color: var(--ctp-overlay0);
    }

    .help-btn.active {
        color: #00b4d8;
        border-color: #00b4d8;
        background: var(--ctp-surface1);
        box-shadow: 0 0 6px #00b4d8;
    }

    .deco-stars {
        font-size: 10px;
        color: var(--ctp-overlay0);
        letter-spacing: 2px;
        animation: twinkle 2s ease-in-out infinite;
    }

    @keyframes twinkle {
        0%, 100% { opacity: 0.5; }
        50% { opacity: 1; }
    }
</style>
