<script lang="ts">
    import hljs from "highlight.js";
    import type { MultilineString } from "../messages/MultilineString";
    import { ThreeSide } from "../lib/ThreeSide";

    export let content: MultilineString;
    export let side: ThreeSide;
    export let label: string;
    export let highlightedConflicts: number[] = [];
    export let fileExtension: string = "";

    $: sideLabel = side === ThreeSide.LEFT ? "Ours" : "Theirs";
    $: displayLabel = label || sideLabel;

    // Simple syntax highlighting using highlight.js
    function highlightLine(line: string): string {
        if (!fileExtension || !line.trim()) return escapeHtml(line);
        
        try {
            // Auto-detect language based on file extension
            const langName = fileExtension.replace(".", "");
            const lang = hljs.getLanguage(langName);
            if (lang && lang.name) {
                const result = hljs.highlight(line, { language: lang.name });
                return result.value;
            }
        } catch {
            // Fall back to plain text
        }
        return escapeHtml(line);
    }

    function escapeHtml(text: string): string {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
</script>

<div class="diff-pane">
    <div class="pane-header">
        <span class="pane-title">{displayLabel}</span>
        <span class="pane-side">({sideLabel})</span>
    </div>
    <div class="pane-content">
        <div class="line-numbers">
            {#each content.lines as _, i}
                <div class="line-number" class:highlighted={highlightedConflicts.includes(i)}>
                    {i + 1}
                </div>
            {/each}
        </div>
        <div class="code-content">
            {#each content.lines as line, i}
                <div class="code-line" class:highlighted={highlightedConflicts.includes(i)}>
                    <pre>{@html highlightLine(line)}</pre>
                </div>
            {/each}
        </div>
    </div>
</div>

<style>
    .diff-pane {
        display: flex;
        flex-direction: column;
        height: 100%;
        border: 1px solid var(--ctp-overlay0);
        background: var(--ctp-base);
    }

    .pane-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: var(--ctp-mantle);
        border-bottom: 1px solid var(--ctp-overlay0);
        font-family: var(--stack-industrial);
        font-size: 14px;
    }

    .pane-title {
        font-weight: 600;
        color: var(--ctp-text);
    }

    .pane-side {
        color: var(--ctp-subtext0);
        font-size: 12px;
    }

    .pane-content {
        display: flex;
        flex: 1;
        overflow: auto;
        font-family: var(--stack-mono);
        font-size: 13px;
        line-height: 1.5;
    }

    .line-numbers {
        display: flex;
        flex-direction: column;
        padding: 4px 8px;
        background: var(--ctp-crust);
        color: var(--ctp-overlay0);
        text-align: right;
        user-select: none;
        min-width: 40px;
    }

    .line-number {
        padding: 1px 0;
    }

    .line-number.highlighted {
        background: var(--ctp-red);
        color: var(--ctp-base);
    }

    .code-content {
        display: flex;
        flex-direction: column;
        flex: 1;
        padding: 4px 8px;
    }

    .code-line {
        padding: 1px 0;
        white-space: pre;
    }

    .code-line.highlighted {
        background: var(--ctp-red);
    }

    .code-line pre {
        margin: 0;
        padding: 0;
        background: transparent;
        font-family: inherit;
        font-size: inherit;
    }

    /* Scrollbar styling */
    .pane-content::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }

    .pane-content::-webkit-scrollbar-thumb {
        background-color: var(--ctp-overlay0);
        border-radius: 4px;
    }

    .pane-content::-webkit-scrollbar-track {
        background-color: var(--ctp-crust);
    }
</style>
