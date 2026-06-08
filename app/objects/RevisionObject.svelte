<script lang="ts">
    import type { RevHeader } from "../messages/RevHeader";
    import type { Operand } from "../messages/Operand";
    import { ignoreToggled, currentTarget, revisionSelectEvent, highlightedBranch } from "../stores.js";
    import IdSpan from "../controls/IdSpan.svelte";
    import BookmarkObject from "./BookmarkObject.svelte";
    import Object from "./Object.svelte";
    import Zone from "./Zone.svelte";
    import RevisionMutator from "../mutators/RevisionMutator";
    import TagObject from "./TagObject.svelte";
    import AuthorSpan from "../controls/AuthorSpan.svelte";
    import WorkspaceObject from "./WorkspaceObject.svelte";

    function authorInitials(name: string): string {
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    }

    function authorColor(name: string): string {
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        const hue = Math.abs(hash % 360);
        return `hsl(${hue}, 55%, 55%)`;
    }

    $: initials = authorInitials(header.author.name);
    $: avatarBg = authorColor(header.author.name);
    $: firstBookmark = header.refs.find(r => r.type === "LocalBookmark");
    $: isHighlighted = $highlightedBranch != null && firstBookmark?.type === "LocalBookmark" && firstBookmark.bookmark_name === $highlightedBranch;

    export let header: RevHeader;
    export let child: RevHeader | null = null;
    export let selected: boolean; // same as the imported event, but parent may want to force a value
    export let noBookmarks: boolean = false;
    export let onClick: ((header: RevHeader) => void) | undefined = undefined;
    export let onShiftClick: ((header: RevHeader) => void) | undefined = undefined;

    $: operand = (child ? { type: "Parent", header, child } : { type: "Revision", header }) as Operand;

    /*
     * Select this revision by default, or callback to a list that needs more complex behaviour.
     */
    function onSelect(event: CustomEvent<MouseEvent>) {
        if (event.detail.shiftKey) {
            if (onShiftClick) {
                onShiftClick(header);
            } else {
                revisionSelectEvent.set({ from: header.id, to: header.id });
            }
        } else {
            if (onClick) {
                onClick(header);
            } else {
                revisionSelectEvent.set({ from: header.id, to: header.id });
            }
        }
    }

    function onEdit() {
        new RevisionMutator([header], $ignoreToggled).onEdit();
    }
</script>

<Object
    {operand}
    suffix={header.id.commit.prefix}
    conflicted={header.has_conflict}
    {selected}
    label={header.description.lines[0]}
    on:click={onSelect}
    on:dblclick={onEdit}
    let:context
    let:hint={dragHint}>
    {#if child}
        <!-- Parents aren't a drop target -->
        <div class="layout">
            <IdSpan
                id={header.id.change}
                pronoun={context ||
                    ($currentTarget?.type == "Merge" &&
                        $currentTarget.header.parent_ids.findIndex((id) => id.hex == header.id.commit.hex) != -1)} />

            <span class="text desc truncate" class:indescribable={!context && header.description.lines[0] == ""}>
                {dragHint ?? (header.description.lines[0] == "" ? "(no description set)" : header.description.lines[0])}
            </span>

            <span class="email"><AuthorSpan author={header.author} /></span>

            <span class="refs">
                {#each header.refs as ref}
                    {#if ref.type != "Tag"}
                        {#if !noBookmarks && (ref.type == "LocalBookmark" || !ref.is_synced || !ref.is_tracked)}
                            <div>
                                <BookmarkObject {header} {ref} />
                            </div>
                        {/if}
                    {:else}
                        <div>
                            <TagObject {header} {ref} />
                        </div>
                    {/if}
                {/each}
                {#if header.working_copy_of}
                    <div>
                        <WorkspaceObject name={header.working_copy_of} />
                    </div>
                {/if}
            </span>
        </div>
    {:else}
        <Zone {operand} let:target let:hint={dropHint}>
            <div class="layout" class:target class:highlighted={isHighlighted}>
                <span class="avatar" style="background: {avatarBg}" title={header.author.name}>{initials}</span>
                <IdSpan id={header.id.change} pronoun={context || target || dropHint != null} />

                <span class="text desc truncate" class:indescribable={!context && header.description.lines[0] == ""}>
                    {dragHint ??
                        dropHint ??
                        (header.description.lines[0] == "" ? "(no description set)" : header.description.lines[0])}
                </span>

                <span class="email"><AuthorSpan author={header.author} /></span>

                <span class="refs">
                    {#each header.refs as ref}
                        {#if ref.type != "Tag"}
                            {#if ref.type == "LocalBookmark" || !ref.is_synced || !ref.is_tracked}
                                <div>
                                    <BookmarkObject {header} {ref} />
                                </div>
                            {/if}
                        {:else}
                            <div>
                                <TagObject {header} {ref} />
                            </div>
                        {/if}
                    {/each}
                    {#if header.working_copy_of}
                        <div>
                            <WorkspaceObject name={header.working_copy_of} />
                        </div>
                    {/if}
                </span>
            </div>
        </Zone>
    {/if}
</Object>

<style>
    .layout {
        pointer-events: auto;
        /* layout summary components along a text line */
        width: 100%;
        height: 30px;
        display: grid;
        grid-template-areas: "avatar . desc refs";
        grid-template-columns: 22px auto 1fr auto;
        align-items: center;
        gap: 4px;

        /* skip past svg lines when used in a graph */
        padding-left: var(--leftpad);
        border-bottom: 1px solid rgba(var(--ctp-overlay0-rgb, 128,128,128), 0.15);
        transition: background 80ms ease;
    }

    .layout:hover {
        background: rgba(var(--ctp-overlay0-rgb, 128,128,128), 0.08);
    }

    .layout.highlighted {
        background: rgba(var(--ctp-overlay0-rgb, 128,128,128), 0.12);
    }

    .avatar {
        grid-area: avatar;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 9px;
        font-weight: 700;
        font-family: var(--stack-industrial);
        color: white;
        pointer-events: none;
        flex-shrink: 0;
        line-height: 1;
    }

    .layout.target {
        background: var(--ctp-flamingo);
        color: black;
    }

    .layout > :global(span) {
        line-height: 27px;
    }

    .desc {
        grid-area: desc;
    }

    .desc.indescribable {
        color: var(--ctp-subtext0);
    }

    .email {
        display: none;
        grid-area: email;
        text-align: right;
    }

    .refs {
        grid-area: refs;
        align-self: center;
        display: flex;
        justify-content: end;
        gap: 3px;
        color: var(--ctp-text);
    }

    /* multiple elements can have these */
    .truncate {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .text {
        pointer-events: none;
    }

    @media (width >= 1680px) {
        .layout {
            grid-template-areas: "avatar . desc refs email";
            grid-template-columns: 22px auto auto 1fr auto;
            gap: 6px;
        }

        .email {
            display: initial;
        }
    }
</style>
