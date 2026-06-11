<script lang="ts">
    import Icon from "../controls/Icon.svelte";
    import { onMount } from "svelte";

    export let title: string;
    export let onClose: () => void;
    export let cardId: string = "default";

    const MIN_W = 300, MIN_H = 220, MARGIN = 8;

    let cardEl: HTMLElement;
    let x = 16, y = 12, w = 440, h = 480;
    let ready = false;
    let dragging = false;
    let resizing = false;

    function parentSize(): { pw: number; ph: number } {
        const parent = cardEl?.offsetParent as HTMLElement | null;
        if (parent) return { pw: parent.clientWidth, ph: parent.clientHeight };
        return { pw: window.innerWidth, ph: window.innerHeight };
    }

    function clamp() {
        const { pw, ph } = parentSize();
        w = Math.max(MIN_W, Math.min(w, pw - MARGIN * 2));
        h = Math.max(MIN_H, Math.min(h, ph - MARGIN * 2));
        x = Math.min(Math.max(x, MARGIN), Math.max(MARGIN, pw - w - MARGIN));
        y = Math.min(Math.max(y, MARGIN), Math.max(MARGIN, ph - h - MARGIN));
    }

    function save() {
        try {
            localStorage.setItem("gg:floatcard:" + cardId, JSON.stringify({ x, y, w, h }));
        } catch {}
    }

    function load(): boolean {
        try {
            const raw = localStorage.getItem("gg:floatcard:" + cardId);
            if (!raw) return false;
            const g = JSON.parse(raw);
            if ([g.x, g.y, g.w, g.h].every((n) => typeof n === "number" && isFinite(n))) {
                ({ x, y, w, h } = g);
                return true;
            }
        } catch {}
        return false;
    }

    onMount(() => {
        const { pw, ph } = parentSize();
        if (!load()) {
            w = Math.min(440, pw - MARGIN * 2);
            h = Math.max(MIN_H, ph - MARGIN * 2);
            x = Math.max(MARGIN, pw - w - 16);
            y = 12;
        }
        clamp();
        ready = true;

        const onResize = () => clamp();
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    });

    function startDrag(e: PointerEvent) {
        if ((e.target as HTMLElement).closest(".card-close")) return;
        dragging = true;
        const startX = e.clientX, startY = e.clientY, ox = x, oy = y;
        const move = (ev: PointerEvent) => {
            x = ox + (ev.clientX - startX);
            y = oy + (ev.clientY - startY);
            clamp();
        };
        const up = () => {
            dragging = false;
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            save();
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    }

    function startResize(e: PointerEvent) {
        e.preventDefault();
        e.stopPropagation();
        resizing = true;
        const startX = e.clientX, startY = e.clientY, ow = w, oh = h;
        const move = (ev: PointerEvent) => {
            w = ow + (ev.clientX - startX);
            h = oh + (ev.clientY - startY);
            clamp();
        };
        const up = () => {
            resizing = false;
            window.removeEventListener("pointermove", move);
            window.removeEventListener("pointerup", up);
            save();
        };
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", up);
    }
</script>

<div
    class="floating-card"
    class:ready
    class:active={dragging || resizing}
    bind:this={cardEl}
    style="left: {x}px; top: {y}px; width: {w}px; height: {h}px;">
    <div class="card-header" on:pointerdown={startDrag} role="toolbar" tabindex="-1" aria-label="{title} (drag to move)">
        <span class="card-title">{title}</span>
        <button type="button" class="card-close" on:click={onClose} title="Close">
            <Icon name="x" />
        </button>
    </div>
    <div class="card-body">
        <slot />
    </div>
    <div
        class="resize-handle"
        class:active={resizing}
        on:pointerdown={startResize}
        role="separator"
        aria-orientation="horizontal"
        aria-label="Resize card"></div>
</div>

<style>
    .floating-card {
        --accent: #00b4d8;

        position: absolute;
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
        visibility: hidden;
        transition: box-shadow 120ms ease;
    }

    .floating-card.ready {
        visibility: visible;
    }

    .floating-card.active {
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
        border-color: var(--accent);
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
        cursor: grab;
        pointer-events: auto;
        touch-action: none;
    }

    .floating-card.active .card-header {
        cursor: grabbing;
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

    .resize-handle {
        position: absolute;
        right: 0;
        bottom: 0;
        width: 16px;
        height: 16px;
        cursor: nwse-resize;
        z-index: 3;
        pointer-events: auto;
        touch-action: none;
        background:
            linear-gradient(135deg, transparent 0 50%, var(--ctp-overlay0) 50% 60%, transparent 60% 70%, var(--ctp-overlay0) 70% 80%, transparent 80%);
    }

    .resize-handle:hover,
    .resize-handle.active {
        background:
            linear-gradient(135deg, transparent 0 50%, var(--accent) 50% 60%, transparent 60% 70%, var(--accent) 70% 80%, transparent 80%);
    }
</style>
