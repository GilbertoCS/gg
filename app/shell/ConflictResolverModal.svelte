<script lang="ts">
    import { onMount } from "svelte";
    import { query, mutate } from "../ipc";
    import type { RevId } from "../messages/RevId";
    import type { TreePath } from "../messages/TreePath";
    import type { ConflictSlicesResponse } from "../lib/ThreeSide";
    import type { ResolveConflict } from "../messages/ResolveConflict";
    import ConflictResolver from "./ConflictResolver.svelte";
    import { currentMutation, repoStatusEvent, revisionSelectEvent } from "../stores";

    export let isOpen: boolean = false;
    export let revisionId: RevId | null = null;
    export let path: TreePath | null = null;

    let loading = false;
    let error: string | null = null;
    let response: ConflictSlicesResponse | null = null;

    $: fileExtension = path?.relative_path?.split(".").pop() || "";

    async function loadConflictData() {
        if (!revisionId || !path || !isOpen) return;

        loading = true;
        error = null;

        const result = await query<ConflictSlicesResponse>(
            "query_conflict_slices",
            { revision_id: revisionId, path },
            (q) => {
                if (q.type === "wait") {
                    loading = true;
                }
            }
        );

        if (result.type === "data") {
            response = result.value;
        } else if (result.type === "error") {
            error = result.message;
        }

        loading = false;
    }

    $: if (isOpen) {
        loadConflictData();
    }

    async function handleApply(event: CustomEvent<{ resolvedContent: string }>) {
        if (!revisionId || !path) return;

        const success = await mutate<ResolveConflict>("resolve_conflict", {
            id: revisionId,
            path,
            resolved_content: event.detail.resolvedContent,
        });

        if (success) {
            isOpen = false;
            response = null;
        }
    }

    function handleCancel() {
        isOpen = false;
        response = null;
        error = null;
    }

    function closeOnBackdrop(event: MouseEvent) {
        if (event.target === event.currentTarget) {
            handleCancel();
        }
    }
</script>

{#if isOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="modal-backdrop" on:click={closeOnBackdrop}>
        <div class="modal-container">
            {#if loading}
                <div class="loading-state">
                    <div class="spinner"></div>
                    <span>Loading conflict data...</span>
                </div>
            {:else if error}
                <div class="error-state">
                    <h3>Error Loading Conflict</h3>
                    <p>{error}</p>
                    <button on:click={handleCancel}>Close</button>
                </div>
            {:else if response && response.regions.length === 0}
                <div class="empty-state">
                    <h3>No Conflicts Found</h3>
                    <p>This file appears to have no conflicts or has already been resolved.</p>
                    <button on:click={handleCancel}>Close</button>
                </div>
            {:else if response}
                <ConflictResolver
                    path={response.path.relative_path}
                    regions={response.regions}
                    oursLabel={response.ours_label}
                    theirsLabel={response.theirs_label}
                    fileExtension={fileExtension}
                    on:apply={handleApply}
                    on:cancel={handleCancel}
                />
            {/if}
        </div>
    </div>
{/if}

<style>
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
    }

    .modal-container {
        width: 90vw;
        height: 80vh;
        background: var(--ctp-crust);
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        overflow: hidden;
    }

    .loading-state,
    .error-state,
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        gap: 16px;
        padding: 32px;
        text-align: center;
    }

    .loading-state {
        color: var(--ctp-subtext0);
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid var(--ctp-overlay0);
        border-top-color: var(--ctp-sapphire);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to {
            transform: rotate(360deg);
        }
    }

    .error-state h3,
    .empty-state h3 {
        color: var(--ctp-red);
        font-family: var(--stack-industrial);
        font-size: 18px;
        margin: 0;
    }

    .error-state p,
    .empty-state p {
        color: var(--ctp-subtext0);
        font-size: 14px;
        margin: 0;
    }

    .error-state button,
    .empty-state button {
        padding: 8px 16px;
        background: var(--ctp-surface2);
        border: none;
        border-radius: 4px;
        color: var(--ctp-text);
        font-family: var(--stack-industrial);
        font-size: 14px;
        cursor: pointer;
        transition: background 0.15s ease;
    }

    .error-state button:hover,
    .empty-state button:hover {
        background: var(--ctp-overlay2);
    }
</style>
