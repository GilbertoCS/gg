<script lang="ts">
    import { parseRoute } from "./route.js";
    import Shell from "./Shell.svelte";
    import LogPane from "./LogPane.svelte";
    import RevisionPane from "./RevisionPane.svelte";
    import FloatingCard from "./shell/FloatingCard.svelte";
    import BoundQuery from "./controls/BoundQuery.svelte";
    import Pane from "./shell/Pane.svelte";
    import SetSpan from "./controls/SetSpan.svelte";
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
            <BoundQuery query={selection} let:data>
                {#if data.type == "Detail"}
                    <FloatingCard
                        title={data.headers[0]?.description.lines[0] || "Commit Details"}
                        onClose={() => revisionSelectEvent.set(undefined)}>
                        <RevisionPane revs={data} />
                    </FloatingCard>
                {:else}
                    <FloatingCard
                        title="Not Found"
                        onClose={() => revisionSelectEvent.set(undefined)}>
                        <Pane>
                            <h2 slot="header">Not Found</h2>
                            <p slot="body">
                                Empty revision set <SetSpan set={data.set} />.
                            </p>
                        </Pane>
                    </FloatingCard>
                {/if}
                <Pane slot="error" let:message>
                    <h2 slot="header">Error</h2>
                    <p slot="body">{message}</p>
                </Pane>
                <Pane slot="wait">
                    <h2 slot="header">Loading...</h2>
                </Pane>
            </BoundQuery>
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
