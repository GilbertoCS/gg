<script lang="ts">
    import hljs from "highlight.js";
    import type { MultilineString } from "../messages/MultilineString";
    import { createEventDispatcher } from "svelte";

    export let initialContent: MultilineString;
    export let fileExtension: string = "";
    export let readonly: boolean = false;

    const dispatch = createEventDispatcher<{
        change: { content: string[] };
    }>();

    let content: string[] = [...initialContent.lines];
    let textarea: HTMLTextAreaElement;

    // Simple syntax highlighting using highlight.js
    function highlightLine(line: string): string {
        if (!fileExtension || !line.trim()) return escapeHtml(line);
        
        try {
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

    function onInput() {
        content = textarea.value.split("\n");
        dispatch("change", { content });
    }

    // Sync scroll between textarea and line numbers
    function onScroll() {
        const lineNumbers = textarea.previousElementSibling;
        if (lineNumbers) {
            lineNumbers.scrollTop = textarea.scrollTop;
        }
    }
</script>

<div class="result-pane">
    <div class="pane-header">
        <span class="pane-title">Result</span>
        <span class="pane-hint">(editable)</span>
    </div>
    <div class="pane-content">
        <div class="line-numbers" aria-hidden="true">
            {#each content as _, i}
                <div class="line-number">{i + 1}</div>
            {/each}
        </div>
        {#if readonly}
            <div class="code-content readonly">
                {#each content as line}
                    <div class="code-line">
                        <pre>{@html highlightLine(line)}</pre>
                    </div>
                {/each}
            </div>
        {:else}
            <textarea
                bind:this={textarea}
                value={content.join("\n")}
                on:input={onInput}
                on:scroll={onScroll}
                spellcheck="false"
                class="code-editor"
            ></textarea>
        {/if}
    </div>
</div>

<style>
    .result-pane {
        display: flex;
        flex-direction: column;
        height: 100%;
        border: 2px solid var(--ctp-sapphire);
        background: var(--ctp-base);
    }

    .pane-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: var(--ctp-sapphire);
        border-bottom: 1px solid var(--ctp-sapphire);
        font-family: var(--stack-industrial);
        font-size: 14px;
    }

    .pane-title {
        font-weight: 600;
        color: var(--ctp-base);
    }

    .pane-hint {
        color: var(--ctp-subtext0);
        font-size: 12px;
    }

    .pane-content {
        display: flex;
        flex: 1;
        overflow: hidden;
        position: relative;
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
        overflow: hidden;
    }

    .line-number {
        padding: 1px 0;
    }

    .code-content {
        flex: 1;
        padding: 4px 8px;
        overflow: auto;
    }

    .code-content.readonly {
        background: var(--ctp-mantle);
    }

    .code-line {
        padding: 1px 0;
        white-space: pre;
    }

    .code-line pre {
        margin: 0;
        padding: 0;
        background: transparent;
        font-family: inherit;
        font-size: inherit;
    }

    .code-editor {
        flex: 1;
        padding: 4px 8px;
        border: none;
        outline: none;
        resize: none;
        background: var(--ctp-base);
        color: var(--ctp-text);
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
        white-space: pre;
        overflow: auto;
    }

    /* Scrollbar styling */
    .code-content::-webkit-scrollbar,
    .code-editor::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }

    .code-content::-webkit-scrollbar-thumb,
    .code-editor::-webkit-scrollbar-thumb {
        background-color: var(--ctp-overlay0);
        border-radius: 4px;
    }

    .code-content::-webkit-scrollbar-track,
    .code-editor::-webkit-scrollbar-track {
        background-color: var(--ctp-crust);
    }
</style>
