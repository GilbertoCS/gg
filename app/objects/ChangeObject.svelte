<script lang="ts">
    import type { RevChange } from "../messages/RevChange";
    import type { RevHeader } from "../messages/RevHeader";
    import type { Operand } from "../messages/Operand";
    import type { ExternalDiff } from "../messages/ExternalDiff";
    import type { ExternalResolve } from "../messages/ExternalResolve";
    import Icon from "../controls/Icon.svelte";
    import ActionWidget from "../controls/ActionWidget.svelte";
    import Object from "./Object.svelte";
    import Zone from "./Zone.svelte";
    import { changeSelectEvent, repoConfigEvent } from "../stores";
    import { mutate } from "../ipc";
    import ActionLink from "../controls/ActionLink.svelte";
    import ConflictResolverModal from "../shell/ConflictResolverModal.svelte";
    import ConflictResolutionReviewModal from "../shell/ConflictResolutionReviewModal.svelte";

    export let headers: RevHeader[] | null;
    export let change: RevChange;
    export let selected: boolean;

    let operand: Operand | null = headers ? { type: "Change", headers, path: change.path, hunk: null } : null;

    $: hasDiffTool = $repoConfigEvent.type === "Workspace" && $repoConfigEvent.has_external_diff_tool;
    $: hasMergeTool = $repoConfigEvent.type === "Workspace" && $repoConfigEvent.has_external_merge_tool;

    let icon = "file";
    let state: "add" | "change" | "remove" | null = null;
    switch (change.kind) {
        case "Added":
            icon = "file-plus";
            state = "add";
            break;
        case "Deleted":
            icon = "file-minus";
            state = "remove";
            break;
        case "Modified":
            icon = "file";
            state = "change";
            break;
    }

    function onSelect() {
        changeSelectEvent.set(change);
    }

    function onExternalDiff() {
        if (!headers) return;
        mutate<ExternalDiff>("external_diff", {
            id: headers[0].id,
            path: change.path,
        });
    }

    function onExternalResolve() {
        if (!headers) return;
        mutate<ExternalResolve>("external_resolve", {
            id: headers[0].id,
            path: change.path,
        });
    }

    // Inline conflict resolver state
    let isResolverOpen = false;
    let isReviewOpen = false;

    function onInlineResolve() {
        if (!headers || !change.has_conflict) return;
        isResolverOpen = true;
    }

    function onReviewResolution() {
        if (!headers || change.has_conflict) return;
        isReviewOpen = true;
    }
</script>

<Object
    {operand}
    {selected}
    suffix={change.path.repo_path}
    conflicted={change.has_conflict}
    label={change.path.relative_path}
    on:click={onSelect}
    let:context
    let:hint>
    <Zone {operand} let:target>
        <div class="layout" class:target>
            <Icon name={icon} state={context ? null : state} />
            <span>{hint ?? change.path.relative_path}</span>
            {#if change.has_conflict && operand}
                <ActionWidget tip="resolve inline" onClick={onInlineResolve}>
                    <Icon name="git-merge" /> Resolve Inline
                </ActionWidget>
                {#if hasMergeTool}
                    <ActionWidget tip="resolve in merge tool" onClick={onExternalResolve}>
                        <Icon name="external-link" />
                    </ActionWidget>
                {/if}
            {:else if operand && change.kind === "Modified"}
                <ActionWidget tip="review conflict resolution" onClick={onReviewResolution}>
                    <Icon name="history" />
                </ActionWidget>
                {#if hasDiffTool}
                    <ActionLink tip="open in diff tool" onClick={onExternalDiff}>
                        <Icon name="external-link" />
                    </ActionLink>
                {/if}
            {:else if hasDiffTool && operand}
                <ActionLink tip="open in diff tool" onClick={onExternalDiff}>
                    <Icon name="external-link" />
                </ActionLink>
            {/if}
        </div>
    </Zone>
</Object>

<ConflictResolverModal
    bind:isOpen={isResolverOpen}
    revisionId={headers?.[0]?.id ?? null}
    path={change.path}
/>

<ConflictResolutionReviewModal
    bind:isOpen={isReviewOpen}
    revisionId={headers?.[0]?.id ?? null}
    path={change.path}
/>

<style>
    .layout {
        height: 30px;
        display: flex;
        align-items: center;
        gap: 6px;
        padding-left: 3px;
    }

    .layout span {
        flex: 1;
    }

    .layout.target {
        background: var(--ctp-flamingo);
        color: black;
    }
</style>
