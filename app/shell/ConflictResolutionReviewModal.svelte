<script lang="ts">
    import hljs from "highlight.js";
    import { query } from "../ipc";
    import type { ConflictResolutionReview } from "../messages/ConflictResolutionReview";
    import type { RevId } from "../messages/RevId";
    import type { TreePath } from "../messages/TreePath";
    import Icon from "../controls/Icon.svelte";

    export let isOpen: boolean = false;
    export let revisionId: RevId | null = null;
    export let path: TreePath | null = null;

    let loading = false;
    let error: string | null = null;
    let review: ConflictResolutionReview | null = null;
    let lastKey = "";

    $: fileExtension = path?.relative_path?.split(".").pop() || "";
    $: key = isOpen && revisionId && path ? `${revisionId.commit.hex}:${path.repo_path}` : "";
    $: if (key && key !== lastKey) {
        lastKey = key;
        loadReview();
    }

    async function loadReview() {
        if (!revisionId || !path) return;
        loading = true;
        error = null;
        review = null;

        let result = await query<ConflictResolutionReview | null>("query_conflict_resolution_review", {
            revision_id: revisionId,
            path,
        });

        if (result.type === "data") {
            review = result.value;
        } else {
            error = result.message;
        }
        loading = false;
    }

    function close() {
        isOpen = false;
        lastKey = "";
        error = null;
        review = null;
    }

    function closeOnBackdrop(event: MouseEvent) {
        if (event.target === event.currentTarget) close();
    }

    function highlight(line: string): string {
        if (!fileExtension || !line.trim()) return escapeHtml(line);
        try {
            let lang = hljs.getLanguage(fileExtension.replace(".", ""));
            if (lang && lang.name) return hljs.highlight(line, { language: lang.name }).value;
        } catch {
            // fall through to escaped text
        }
        return escapeHtml(line);
    }

    function escapeHtml(text: string): string {
        let div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
</script>

{#if isOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="modal-backdrop" on:click={closeOnBackdrop}>
        <div class="modal-container">
            <header>
                <div class="title">
                    <Icon name="history" />
                    <span>Conflict Resolution Review</span>
                </div>
                <button on:click={close} title="Close"><Icon name="x" /></button>
            </header>

            {#if loading}
                <div class="state">Loading resolution review...</div>
            {:else if error}
                <div class="state error">{error}</div>
            {:else if !review}
                <div class="state">No resolved conflict was found for this file's parent revision.</div>
            {:else}
                <div class="file-path">{review.path.relative_path}</div>
                <div class="pane-titles">
                    <div>{review.ours_label}</div>
                    <div>Resolved result</div>
                    <div>{review.theirs_label}</div>
                </div>
                <div class="review-grid">
                    {#each review.regions as region (region.index)}
                        {#if region.kind === "Stable"}
                            <div class="row stable">
                                <div class="cell">{#each region.ours.lines as line}<div class="ln">{@html highlight(line)}</div>{/each}</div>
                                <div class="cell">{#each region.ours.lines as line}<div class="ln">{@html highlight(line)}</div>{/each}</div>
                                <div class="cell">{#each region.theirs.lines as line}<div class="ln">{@html highlight(line)}</div>{/each}</div>
                            </div>
                        {:else}
                            <div class="row conflict">
                                <div class="cell side ours">
                                    <div class="region-label">{region.kind}</div>
                                    {#each region.ours.lines as line}<div class="ln">{@html highlight(line)}</div>{/each}
                                </div>
                                <div class="cell result">
                                    <div class="region-label">Final file content shown below</div>
                                </div>
                                <div class="cell side theirs">
                                    <div class="region-label">{region.kind}</div>
                                    {#each region.theirs.lines as line}<div class="ln">{@html highlight(line)}</div>{/each}
                                </div>
                            </div>
                        {/if}
                    {/each}
                </div>
                <div class="resolved-file">
                    <div class="resolved-title">Resolved file</div>
                    {#each review.resolved_content.lines as line}<div class="ln">{@html highlight(line)}</div>{/each}
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.75);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
    }
    .modal-container {
        width: min(1400px, 95vw);
        height: min(900px, 92vh);
        background: var(--ctp-base);
        border: 1px solid var(--ctp-overlay0);
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    }
    header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 14px;
        background: var(--ctp-mantle);
        border-bottom: 1px solid var(--ctp-overlay0);
    }
    .title {
        display: flex;
        gap: 8px;
        align-items: center;
        font-family: var(--stack-industrial);
        font-weight: 600;
    }
    header button {
        background: transparent;
        border: none;
        color: var(--ctp-text);
        cursor: pointer;
    }
    .state {
        padding: 24px;
        color: var(--ctp-subtext0);
    }
    .state.error {
        color: var(--ctp-red);
    }
    .file-path {
        padding: 8px 12px;
        font-family: var(--stack-mono);
        color: var(--ctp-subtext0);
        border-bottom: 1px solid var(--ctp-overlay0);
    }
    .pane-titles,
    .row {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 1px;
        background: var(--ctp-overlay0);
    }
    .pane-titles > div {
        padding: 6px 10px;
        background: var(--ctp-mantle);
        font-family: var(--stack-industrial);
        font-weight: 600;
    }
    .review-grid {
        overflow: auto;
        max-height: 45%;
        font-family: var(--stack-mono);
        font-size: 13px;
        line-height: 1.5;
    }
    .cell {
        background: var(--ctp-base);
        padding: 4px 8px;
        min-width: 0;
    }
    .row.stable .cell {
        color: var(--ctp-subtext1);
    }
    .row.conflict .ours {
        background: color-mix(in srgb, var(--ctp-green) 10%, var(--ctp-base));
    }
    .row.conflict .theirs {
        background: color-mix(in srgb, var(--ctp-blue) 10%, var(--ctp-base));
    }
    .region-label,
    .resolved-title {
        font-family: var(--stack-industrial);
        font-size: 12px;
        color: var(--ctp-subtext0);
        margin-bottom: 4px;
    }
    .resolved-file {
        flex: 1;
        overflow: auto;
        padding: 8px 12px;
        border-top: 1px solid var(--ctp-overlay0);
        font-family: var(--stack-mono);
        font-size: 13px;
        line-height: 1.5;
        background: var(--ctp-mantle);
    }
    .ln {
        white-space: pre;
        min-height: 1.5em;
    }
</style>
