<script lang="ts">
    import { onMount } from "svelte";
    import type { LogPage } from "./messages/LogPage.js";
    import type { LogRow } from "./messages/LogRow.js";
    import type { RevHeader } from "./messages/RevHeader";
    import type { RevSet } from "./messages/RevSet";
    import { getInput, query, trigger } from "./ipc.js";
    import { sameChange } from "./ids.js";
    import { ignoreToggled, repoStatusEvent, revisionSelectEvent, zoomLevel, graphHeaders, graphRevset, graphPresets, currentRevset, presetActions, hasModal } from "./stores.js";
    import RevisionMutator from "./mutators/RevisionMutator.js";
    import RevisionObject from "./objects/RevisionObject.svelte";
    import ListWidget, { type List, type Selection } from "./controls/ListWidget.svelte";
    import { type EnhancedRow, default as GraphLog, type EnhancedLine } from "./GraphLog.svelte";

    export let query_choices: Record<string, string>;
    export let latest_query: string;

    function toTitleCase(kebab: string): string {
        return kebab
            .split("-")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }

    $: presets = (() => {
        let result: { label: string; value: string; separator?: boolean }[] = [];

        // revsets.log first
        if (query_choices["default"] !== undefined) {
            result.push({ label: "Default", value: query_choices["default"] });
        }

        // followed by [gg.presets]
        let others = Object.entries(query_choices)
            .filter(([key]) => key !== "default")
            .map(([key, value]) => ({ label: toTitleCase(key), value }))
            .sort((a, b) => a.label.localeCompare(b.label));

        if (others.length > 0) {
            result.push({ label: "", value: "", separator: true });
            result.push(...others);
        }

        return result;
    })();

    let entered_query = latest_query;
    let graphRows: EnhancedRow[] | undefined;

    let selectionAnchorIdx: number | undefined; // selection model is topologically ordered, selection view requires an anchor point

    let logHeight = 0;
    let logWidth = 0;
    let logScrollTop = 0;

    /**
     * Helper to set selection with proper topological ordering.
     * In the graph, higher indices are older (ancestors), so from should have the higher index.
     * @param anchorIdx - The anchor point (first clicked). Pass undefined to keep existing anchor.
     * @param extendIdx - The extension point (shift-clicked or arrow-extended to).
     */
    function setSelection(anchorIdx: number | undefined, extendIdx: number) {
        if (!graphRows) return;

        if (anchorIdx !== undefined) {
            selectionAnchorIdx = anchorIdx;
        }

        const effectiveAnchor = selectionAnchorIdx ?? extendIdx;
        const fromIdx = Math.max(effectiveAnchor, extendIdx);
        const toIdx = Math.min(effectiveAnchor, extendIdx);

        $revisionSelectEvent = {
            from: graphRows[fromIdx].revision.id,
            to: graphRows[toIdx].revision.id,
        };
    }

    // all these calculations are not efficient. probably doesn't matter
    let list: List = {
        getSize() {
            return graphRows?.length ?? 0;
        },
        getSelection(): Selection {
            if (!graphRows || selectionAnchorIdx === undefined || !$revisionSelectEvent) {
                return { from: -1, to: -1 };
            }

            // translate from toplogical from::to to listwidget's anchor::extension
            const revSetFromIdx = graphRows.findIndex(
                (row) => row.revision.id.commit.hex === $revisionSelectEvent!.from.commit.hex,
            );
            const revSetToIdx = graphRows.findIndex(
                (row) => row.revision.id.commit.hex === $revisionSelectEvent!.to.commit.hex,
            );

            const extensionIdx = revSetFromIdx === selectionAnchorIdx ? revSetToIdx : revSetFromIdx;

            return { from: selectionAnchorIdx, to: extensionIdx };
        },
        selectRow(row: number) {
            setSelection(row, row);
        },
        extendSelection(row: number) {
            if (!graphRows || selectionAnchorIdx === undefined) return;

            const limitIdx = findLinearLimit(selectionAnchorIdx, row);
            if (limitIdx === row) {
                setSelection(undefined, row); // Keep anchor, extend to new row
            }
        },
        editRow(row: number) {
            if (row != -1) {
                new RevisionMutator([graphRows![row].revision], $ignoreToggled).onEdit();
            }
        },
    };

    onMount(() => {
        loadLog(true);
    });

    $: if ($repoStatusEvent) reloadLog();

    // publish the full visible log so other components (OmniBar, SidePanel) can use it
    $: graphHeaders.set((graphRows ?? []).map((r) => r.revision));

    // publish revset state + preset controls so the OmniBar is the single query entry point
    $: currentRevset.set(entered_query);
    $: graphPresets.set(presets.filter((p) => !p.separator).map((p) => ({ label: p.label, value: p.value })));
    $: presetActions.set({ saveCurrent: handleSavePreset, deleteCurrent: handleDeletePreset, isCustom, isDeletable });

    // apply a revset requested from outside (e.g. the OmniBar command palette)
    $: if ($graphRevset != null) applyExternalRevset($graphRevset);
    function applyExternalRevset(revset: string) {
        graphRevset.set(null);
        if (revset !== entered_query) {
            entered_query = revset;
            reloadLog();
        }
    }

    function isInSelectedRange(row: EnhancedRow, selection: typeof $revisionSelectEvent): boolean {
        if (!selection || !graphRows) return false;
        const fromIdx = graphRows.findIndex((r) => r.revision.id.commit.hex === selection.from.commit.hex);
        const toIdx = graphRows.findIndex((r) => r.revision.id.commit.hex === selection.to.commit.hex);
        const rowIdx = graphRows.indexOf(row);
        if (fromIdx === -1 || toIdx === -1 || rowIdx === -1) return false;
        const minIdx = Math.min(fromIdx, toIdx);
        const maxIdx = Math.max(fromIdx, toIdx);
        return rowIdx >= minIdx && rowIdx <= maxIdx;
    }

    /**
     * Check if childRow's revision is a direct (non-elided) parent of parentRow's revision.
     * In the graph, lower indices are children (newer), higher indices are parents (older).
     */
    function isDirectParent(childRow: EnhancedRow, parentRow: EnhancedRow): boolean {
        const childCommitHex = childRow.revision.id.commit.hex;
        const parentCommitHex = parentRow.revision.id.commit.hex;

        const isParent = childRow.revision.parent_ids.some((p) => p.hex === parentCommitHex);
        if (!isParent) {
            return false;
        }

        // find a connecting line
        for (const line of childRow.passingLines) {
            if (line.child.id.commit.hex === childCommitHex && line.parent.id.commit.hex === parentCommitHex) {
                return !line.indirect && line.type !== "ToMissing";
            }
        }

        // elided sequences not supported for now - this is possible, but perhaps not useful
        return false;
    }

    /**
     * Find the farthest index from anchorIdx toward targetIdx that maintains linearity.
     */
    function findLinearLimit(anchorIdx: number, targetIdx: number): number {
        if (!graphRows) return anchorIdx;

        const direction = targetIdx > anchorIdx ? 1 : -1;
        let lastValidIdx = anchorIdx;

        for (let i = anchorIdx + direction; direction > 0 ? i <= targetIdx : i >= targetIdx; i += direction) {
            const checkStart = direction > 0 ? lastValidIdx : i;
            const checkEnd = direction > 0 ? i : lastValidIdx;
            if (isDirectParent(graphRows[checkStart], graphRows[checkEnd])) {
                lastValidIdx = i;
            } else {
                break;
            }
        }

        return lastValidIdx;
    }

    function handleClick(header: RevHeader) {
        if (!graphRows) return;

        const clickedIdx = graphRows.findIndex((r) => r.revision.id.commit.hex === header.id.commit.hex);
        if (clickedIdx !== -1) {
            setSelection(clickedIdx, clickedIdx);
        }
    }

    function handleShiftClick(header: RevHeader) {
        if (!graphRows || selectionAnchorIdx === undefined) {
            handleClick(header); // initial selection
            return;
        }

        const clickedIdx = graphRows.findIndex((r) => r.revision.id.commit.hex === header.id.commit.hex);
        if (clickedIdx === -1) {
            handleClick(header); // invalid selection
            return;
        }

        const limitIdx = findLinearLimit(selectionAnchorIdx, clickedIdx);
        setSelection(undefined, limitIdx); // keep anchor, extend to limit
    }

    $: isCustom = !presets.some((p) => !p.separator && p.value === entered_query);

    $: isDeletable =
        !isCustom && presets.some((p) => !p.separator && p.value === entered_query && p.label !== "Default");

    function writePresets() {
        let values: Record<string, string> = {};
        for (let [key, value] of Object.entries(query_choices)) {
            if (key !== "default") {
                values[key] = value;
            }
        }
        trigger("write_config_table", { scope: "repo", key: ["gg", "presets"], values });
    }

    function toKebabCase(text: string): string {
        return text
            .trim()
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");
    }

    async function handleSavePreset() {
        let response = await getInput("Save Revset", "code:" + entered_query, ["Preset Name"]);
        if (!response) return;

        let name = toKebabCase(response["Preset Name"]);
        if (!name || name === "default") return;

        query_choices[name] = entered_query;
        query_choices = query_choices;
        writePresets();
    }

    function handleDeletePreset() {
        let keyToDelete = Object.entries(query_choices).find(
            ([key, value]) => key !== "default" && value === entered_query,
        )?.[0];
        if (!keyToDelete) return;

        delete query_choices[keyToDelete];
        query_choices = query_choices;
        entered_query = query_choices["default"] ?? "";
        writePresets();
        reloadLog();
    }

    async function loadLog(selectFirst: boolean) {
        let page = await query<LogPage>(
            "query_log",
            {
                revset: entered_query == "" ? "all()" : entered_query,
            },
            () => (graphRows = undefined),
        );

        if (page.type == "data") {
            graphRows = [];
            graphRows = addPageToGraph(graphRows, page.value.rows);

            if (selectFirst && page.value.rows.length > 0) {
                setSelection(0, 0);
            }

            while (page.value.has_more) {
                let next_page = await query<LogPage>("query_log_next_page", null);
                if (next_page.type == "data") {
                    graphRows = addPageToGraph(graphRows, next_page.value.rows);
                    page = next_page;
                } else {
                    break;
                }
            }

            // XXX perhaps we should retry this after each page
            if (!selectFirst) {
                syncSelectionWithGraph();
            }
        }
    }

    // policy: reselect by commit id if the original revisions are still around, update by change id if they aren't
    function syncSelectionWithGraph() {
        const selection = $revisionSelectEvent;
        if (!selection || !graphRows || graphRows.length === 0) {
            return;
        }

        let fromIdx = graphRows.findIndex((r) => r.revision.id.commit.hex === selection.from.commit.hex);
        let toIdx = graphRows.findIndex((r) => r.revision.id.commit.hex === selection.to.commit.hex);

        if (fromIdx === -1) {
            fromIdx = graphRows.findIndex((r) => sameChange(r.revision.id.change, selection.from.change));
        }
        if (toIdx === -1) {
            toIdx = graphRows.findIndex((r) => sameChange(r.revision.id.change, selection.to.change));
        }

        // reposition anchor, update ids if changed
        if (fromIdx !== -1 && toIdx !== -1) {
            selectionAnchorIdx = toIdx;

            const newFrom = graphRows[fromIdx].revision.id;
            const newTo = graphRows[toIdx].revision.id;
            if (newFrom.commit.hex !== selection.from.commit.hex || newTo.commit.hex !== selection.to.commit.hex) {
                $revisionSelectEvent = { from: newFrom, to: newTo };
            }
        } else {
            // selection no longer valid (e.g., revision was abandoned), select first row
            setSelection(0, 0);
        }
    }

    function reloadLog() {
        loadLog(false);
    }

    // augment rows with all lines that pass through them
    let lineKey = 0;
    let passNextRow: EnhancedLine[] = [];
    function addPageToGraph(graph: EnhancedRow[], page: LogRow[]): EnhancedRow[] {
        for (let row of page) {
            let enhancedRow = row as EnhancedRow;
            for (let passingRow of passNextRow) {
                passingRow.parent = row.revision;
            }
            enhancedRow.passingLines = passNextRow;
            passNextRow = [];

            for (let line of enhancedRow.lines) {
                let enhancedLine = line as EnhancedLine;
                enhancedLine.key = lineKey++;

                if (line.type == "ToIntersection" || line.type == "ToMissing") {
                    // ToIntersection lines begin at their owning row, so they run from this row to the next one that we read (which may not be on the same page)
                    enhancedLine.child = row.revision;
                    enhancedRow.passingLines.push(enhancedLine);
                    passNextRow.push(enhancedLine);
                } else {
                    // other lines end at their owning row, so we need to add them to all previous rows and then this one
                    enhancedLine.parent = row.revision;
                    enhancedLine.child = graph[line.source[1]].revision;
                    for (let i = line.source[1]; i < line.target[1]; i++) {
                        graph[i].passingLines.push(enhancedLine);
                    }
                    enhancedRow.passingLines.push(enhancedLine);
                }
            }

            graph.push(enhancedRow);
        }

        return graph;
    }
</script>

<section class="log-pane" inert={$hasModal}>
    <div class="graph-body">
        <div class="column-headers">
            <span class="col-graph">Graph</span>
            <span class="col-desc">Description</span>
            <span class="col-author">Author</span>
            <span class="col-sha">SHA</span>
        </div>
        <ListWidget
            type="Revision"
            descendant={$revisionSelectEvent?.to.commit.prefix}
            {list}
            bind:clientHeight={logHeight}
            bind:clientWidth={logWidth}
            bind:scrollTop={logScrollTop}>
            {#if graphRows}
                <div class="zoom-wrapper" style="transform: scale({$zoomLevel / 100}); transform-origin: top left; width: {100 / ($zoomLevel / 100)}%; height: {100 / ($zoomLevel / 100)}%">
                    <GraphLog
                        containerHeight={logHeight / ($zoomLevel / 100)}
                        containerWidth={logWidth / ($zoomLevel / 100)}
                        scrollTop={logScrollTop / ($zoomLevel / 100)}
                        rows={graphRows}
                        let:row>
                        {#if row}
                            <RevisionObject
                                header={row.revision}
                                selected={isInSelectedRange(row, $revisionSelectEvent)}
                                onClick={handleClick}
                                onShiftClick={handleShiftClick} />
                        {/if}
                    </GraphLog>
                </div>
            {:else}
                <div>Loading changes...</div>
            {/if}
        </ListWidget>
    </div>
</section>

<style>
    .log-pane {
        display: grid;
        grid-template-rows: 100%;
        grid-template-columns: 100%;
        overflow: hidden;
        height: 100%;
    }

    .zoom-wrapper {
        pointer-events: auto;
    }

    .graph-body {
        display: flex;
        flex-direction: column;
        overflow: hidden;
        height: 100%;
    }

    .column-headers {
        display: flex;
        align-items: center;
        height: 26px;
        min-height: 26px;
        padding: 0 6px;
        gap: 8px;
        background: var(--ctp-surface0);
        border-bottom: 1px solid var(--ctp-overlay0);
        font-size: 10px;
        font-weight: 700;
        font-family: var(--stack-industrial);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--ctp-subtext0);
        user-select: none;
    }

    .col-graph {
        width: 80px;
        flex-shrink: 0;
    }

    .col-desc {
        flex: 1;
        min-width: 0;
    }

    .col-author {
        width: 100px;
        flex-shrink: 0;
        text-align: right;
    }

    .col-sha {
        width: 70px;
        flex-shrink: 0;
        text-align: right;
    }
</style>
