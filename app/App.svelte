<script lang="ts">
    import { parseRoute } from "./route.js";
    import Shell from "./Shell.svelte";
    import LogPane from "./LogPane.svelte";
    import RevisionPane from "./RevisionPane.svelte";
    import BoundQuery from "./controls/BoundQuery.svelte";
    import Pane from "./shell/Pane.svelte";
    import SetSpan from "./controls/SetSpan.svelte";
    import Icon from "./controls/Icon.svelte";
    import { revisionSelectEvent } from "./stores.js";

    let route = parseRoute();
</script>

<Shell revsetOverride={route.type === "revision" ? route.revset : null}
       let:workspace let:selection>
    <div class="canvas-layout">
        <div class="graph-area">
            {#key workspace.absolute_path}
                <LogPane query_choices={workspace.query_choices}
                         latest_query={route.type === "log" ? (route.revset ?? workspace.latest_query) : route.type === "revision" ? route.revset : workspace.latest_query} />
            {/key}
        </div>

        {#if route.type !== "log"}
            <div class="commit-panel">
                <div class="commit-panel-header">
                    <span class="cp-title">Commit Panel</span>
                    <button class="cp-close" on:click={() => revisionSelectEvent.set(undefined)} title="Close">
                        <Icon name="x" />
                    </button>
                </div>
                <div class="commit-panel-body">
                    <BoundQuery query={selection} let:data>
                        {#if data.type == "Detail"}
                            <RevisionPane revs={data} />
                        {:else}
                            <Pane>
                                <h2 slot="header">Not Found</h2>
                                <p slot="body">
                                    Empty revision set <SetSpan set={data.set} />.
                                </p>
                            </Pane>
                        {/if}
                        <Pane slot="error" let:message>
                            <h2 slot="header">Error</h2>
                            <p slot="body">{message}</p>
                        </Pane>
                        <Pane slot="wait">
                            <h2 slot="header">Loading...</h2>
                        </Pane>
                    </BoundQuery>
                </div>
            </div>
        {/if}
    </div>
</Shell>

<style>
    .canvas-layout {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        display: flex;
    }

    .graph-area {
        flex: 1;
        min-width: 0;
        height: 100%;
        overflow: hidden;
    }

    .commit-panel {
        width: 340px;
        min-width: 280px;
        max-width: 50%;
        height: 100%;
        display: flex;
        flex-direction: column;
        background: var(--ctp-mantle);
        border-left: 1px solid var(--ctp-overlay0);
        overflow: hidden;
    }

    .commit-panel-header {
        height: 38px;
        min-height: 38px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 10px;
        background: var(--ctp-surface0);
        border-bottom: 1px solid var(--ctp-overlay0);
    }

    .cp-title {
        font-size: 12px;
        font-weight: 700;
        color: var(--ctp-text);
        font-family: var(--stack-industrial);
    }

    .cp-close {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: none;
        border-radius: 4px;
        background: transparent;
        color: var(--ctp-subtext0);
        cursor: pointer;
        padding: 0;
        transition: all 100ms ease;
    }

    .cp-close:hover {
        background: var(--ctp-surface1);
        color: var(--ctp-text);
    }

    .commit-panel-body {
        flex: 1;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: var(--ctp-overlay0) transparent;
    }

    .commit-panel-body::-webkit-scrollbar {
        width: 6px;
    }

    .commit-panel-body::-webkit-scrollbar-thumb {
        background: var(--ctp-overlay0);
        border-radius: 3px;
    }
</style>
