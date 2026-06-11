<script lang="ts">
    import { parseRoute } from "./route.js";
    import Shell from "./Shell.svelte";
    import LogPane from "./LogPane.svelte";
    import RevisionPane from "./RevisionPane.svelte";
    import BoundQuery from "./controls/BoundQuery.svelte";
    import Pane from "./shell/Pane.svelte";
    import SetSpan from "./controls/SetSpan.svelte";
    import FloatingCard from "./shell/FloatingCard.svelte";
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

        {#if route.type !== "log" && $revisionSelectEvent}
            <FloatingCard title="Commit" cardId="commit-detail" onClose={() => revisionSelectEvent.set(undefined)}>
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
            </FloatingCard>
        {/if}
    </div>
</Shell>

<style>
    .canvas-layout {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
    }

    .graph-area {
        width: 100%;
        height: 100%;
        overflow: hidden;
    }
</style>
