<!-- XXX duplicates a lot of dispatch and enablement logic from menu.rs, but it's not easy to share... -->
<script lang="ts">
    import type { Operand } from "../messages/Operand";
    import type { RevHeader } from "../messages/RevHeader";
    import type { StoreRef } from "../messages/StoreRef";
    import { ignoreToggled } from "../stores";
    import RevisionMutator from "../mutators/RevisionMutator";
    import ChangeMutator from "../mutators/ChangeMutator";
    import RefMutator from "../mutators/RefMutator";
    import WorkspaceMutator from "../mutators/WorkspaceMutator";
    import Icon from "./Icon.svelte";

    export let operand: Operand;
    export let x: number;
    export let y: number;
    export let onClose: () => void;

    function getRevisionHeaders(): RevHeader[] {
        if (operand.type === "Revision") {
            return [operand.header];
        } else if (operand.type === "Revisions") {
            return operand.headers;
        }
        return [];
    }

    function onClick(action: string) {
        let ignoreImmutable = $ignoreToggled;
        if (operand.type === "Revision" || operand.type === "Revisions") {
            new RevisionMutator(getRevisionHeaders(), ignoreImmutable).handle(action);
        } else if (operand.type === "Change") {
            new ChangeMutator(operand.headers, operand.path, operand.hunk, ignoreImmutable).handle(action);
        } else if (operand.type === "Ref") {
            new RefMutator(operand.ref, ignoreImmutable).handle(action);
        } else if (operand.type === "Workspace") {
            new WorkspaceMutator(operand.name).handle(action);
        }
        onClose();
    }

    function onDismiss() {
        onClose();
    }

    function onKeyDown(event: KeyboardEvent) {
        if (event.key === "Escape") {
            onClose();
        }
    }

    function isRevisionEnabled(headers: RevHeader[], ignoreImmutable: boolean = false) {
        const isSingleton = headers.length == 1;
        const anyImmutable = !ignoreImmutable && headers.some((h) => h.is_immutable);
        const hasSingleParent = headers[headers.length - 1]?.parent_ids.length == 1;

        return {
            new_child: true,
            new_parent: !anyImmutable && hasSingleParent,
            edit: isSingleton && !anyImmutable && !headers[0]?.is_working_copy,
            revert: true,
            duplicate: true,
            abandon: !anyImmutable,
            squash: !anyImmutable && hasSingleParent,
            restore: isSingleton && !anyImmutable && hasSingleParent,
            bookmark: isSingleton,
        };
    }

    function isChangeEnabled(headers: RevHeader[], ignoreImmutable: boolean = false) {
        const anyImmutable = !ignoreImmutable && headers.some((h) => h.is_immutable);
        const hasSingleParent = headers[headers.length - 1]?.parent_ids.length == 1;

        return {
            squash: !anyImmutable && hasSingleParent,
            restore: !anyImmutable && hasSingleParent,
        };
    }

    function isRefEnabled(ref: StoreRef) {
        return {
            track: ref.type === "RemoteBookmark" && !ref.is_tracked,
            untrack:
                (ref.type === "LocalBookmark" && ref.tracking_remotes.length > 0) ||
                (ref.type === "RemoteBookmark" && !ref.is_synced && ref.is_tracked && !ref.is_absent),
            push_all:
                (ref.type === "LocalBookmark" && ref.tracking_remotes.length > 0) ||
                (ref.type === "RemoteBookmark" && ref.is_tracked && ref.is_absent),
            push_single: ref.type === "LocalBookmark" && ref.potential_remotes > 0,
            fetch_all:
                (ref.type === "LocalBookmark" && ref.tracking_remotes.length > 0) ||
                (ref.type === "RemoteBookmark" && (!ref.is_tracked || !ref.is_absent)),
            fetch_single: ref.type === "LocalBookmark" && ref.available_remotes > 0,
            rename: ref.type === "LocalBookmark",
            delete: !(ref.type === "RemoteBookmark" && ref.is_absent && ref.is_tracked),
        };
    }

    $: revisionEnabled =
        operand.type === "Revision" || operand.type === "Revisions"
            ? isRevisionEnabled(getRevisionHeaders(), $ignoreToggled)
            : null;
    $: changeEnabled = operand.type === "Change" ? isChangeEnabled(operand.headers, $ignoreToggled) : null;
    $: refEnabled = operand.type === "Ref" ? isRefEnabled(operand.ref) : null;

    // clamp to viewport
    let menuElement: HTMLDivElement;
    $: if (menuElement) {
        const rect = menuElement.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (x + rect.width > viewportWidth) {
            menuElement.style.left = `${viewportWidth - rect.width - 8}px`;
        }
        if (y + rect.height > viewportHeight) {
            menuElement.style.top = `${viewportHeight - rect.height - 8}px`;
        }
    }
</script>

<svelte:window on:click={onDismiss} />

<div
    class="context-menu"
    style="left: {x}px; top: {y}px;"
    role="menu"
    tabindex="0"
    on:click|stopPropagation
    on:keydown={onKeyDown}
    bind:this={menuElement}>
    {#if (operand.type === "Revision" || operand.type === "Revisions") && revisionEnabled}
        <div class="menu-group-label">Create</div>
        <button disabled={!revisionEnabled.new_child} on:click={() => onClick("new_child")}>
            <Icon name="plus" /><span>New child</span>
        </button>
        <button disabled={!revisionEnabled.new_parent} on:click={() => onClick("new_parent")}>
            <Icon name="corner-down-right" /><span>New inserted parent</span>
        </button>
        <hr />
        <div class="menu-group-label">Modify</div>
        <button disabled={!revisionEnabled.edit} on:click={() => onClick("edit")}>
            <Icon name="edit-3" /><span>Edit as working copy</span>
        </button>
        <button disabled={!revisionEnabled.revert} on:click={() => onClick("revert")}>
            <Icon name="rotate-ccw" /><span>Revert into working copy</span>
        </button>
        <button disabled={!revisionEnabled.duplicate} on:click={() => onClick("duplicate")}>
            <Icon name="copy" /><span>Duplicate</span>
        </button>
        <button disabled={!revisionEnabled.abandon} on:click={() => onClick("abandon")}>
            <Icon name="trash-2" /><span class="danger">Abandon</span>
        </button>
        <hr />
        <div class="menu-group-label">History</div>
        <button disabled={!revisionEnabled.squash} on:click={() => onClick("squash")}>
            <Icon name="minimize-2" /><span>Squash into parent</span>
        </button>
        <button disabled={!revisionEnabled.restore} on:click={() => onClick("restore")}>
            <Icon name="maximize-2" /><span>Restore from parent</span>
        </button>
        <hr />
        <button disabled={!revisionEnabled.bookmark} on:click={() => onClick("bookmark")}>
            <Icon name="bookmark" /><span>Create bookmark...</span>
        </button>
    {:else if operand.type === "Change" && changeEnabled}
        <button disabled={!changeEnabled.squash} on:click={() => onClick("squash")}>
            <Icon name="minimize-2" /><span>Squash into parent</span>
        </button>
        <button disabled={!changeEnabled.restore} on:click={() => onClick("restore")}>
            <Icon name="maximize-2" /><span>Restore from parent</span>
        </button>
    {:else if operand.type === "Ref" && refEnabled}
        <div class="menu-group-label">Tracking</div>
        <button disabled={!refEnabled.track} on:click={() => onClick("track")}>
            <Icon name="eye" /><span>Track</span>
        </button>
        <button disabled={!refEnabled.untrack} on:click={() => onClick("untrack")}>
            <Icon name="eye-off" /><span>Untrack</span>
        </button>
        <hr />
        <div class="menu-group-label">Sync</div>
        <button disabled={!refEnabled.push_all} on:click={() => onClick("push-all")}>
            <Icon name="upload-cloud" /><span>Push</span>
        </button>
        <button disabled={!refEnabled.push_single} on:click={() => onClick("push-single")}>
            <Icon name="upload-cloud" /><span>Push to remote...</span>
        </button>
        <button disabled={!refEnabled.fetch_all} on:click={() => onClick("fetch-all")}>
            <Icon name="download-cloud" /><span>Fetch</span>
        </button>
        <button disabled={!refEnabled.fetch_single} on:click={() => onClick("fetch-single")}>
            <Icon name="download-cloud" /><span>Fetch from remote...</span>
        </button>
        <hr />
        <button disabled={!refEnabled.rename} on:click={() => onClick("rename")}>
            <Icon name="edit-3" /><span>Rename...</span>
        </button>
        <button disabled={!refEnabled.delete} on:click={() => onClick("delete")}>
            <Icon name="trash-2" /><span class="danger">Delete</span>
        </button>
    {:else if operand.type === "Workspace"}
        <button on:click={() => onClick("rename")}>
            <Icon name="edit-3" /><span>Rename...</span>
        </button>
        <button on:click={() => onClick("forget")}>
            <Icon name="trash-2" /><span class="danger">Forget</span>
        </button>
    {/if}
</div>

<style>
    .context-menu {
        position: fixed;
        z-index: 1000;
        background: var(--ctp-base);
        border: 1px solid var(--ctp-overlay0);
        border-radius: 6px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        min-width: 200px;
        padding: 4px 0;
        outline: none;
    }

    .menu-group-label {
        padding: 4px 12px 2px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--ctp-subtext0);
        font-family: var(--stack-industrial);
        pointer-events: none;
    }

    hr {
        border: none;
        border-top: 1px solid var(--ctp-surface1);
        margin: 4px 0;
    }

    button {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 8px;
        border: none;
        padding: 5px 12px;
        text-align: left;
        background: none;
        color: var(--ctp-text);
        font-family: var(--stack-industrial);
        font-size: 12px;

        &:disabled {
            color: var(--ctp-overlay0);
        }

        &:not(:disabled) {
            cursor: pointer;
            &:hover {
                background: var(--ctp-surface1);
            }
        }
    }

    button :global(svg) {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
    }

    .danger {
        color: var(--ctp-red);
    }

    button:disabled .danger {
        color: var(--ctp-overlay0);
    }
</style>
