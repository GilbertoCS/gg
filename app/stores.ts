import type { MutationResult } from "./messages/MutationResult";
import type { ProgressEvent } from "./messages/ProgressEvent";
import type { RepoConfig } from "./messages/RepoConfig";
import type { RepoStatus } from "./messages/RepoStatus";
import type { RevHeader } from "./messages/RevHeader";
import type { RevSet } from "./messages/RevSet";
import type { Operand } from "./messages/Operand";
import { writable } from "svelte/store";
import { event, type Query } from "./events";
import type { InputRequest } from "./messages/InputRequest";
import type { InputResponse } from "./messages/InputResponse";
import type { RevChange } from "./messages/RevChange";

export const repoConfigEvent = await event<RepoConfig>("gg://repo/config", { type: "Initial" });
export const repoStatusEvent = await event<RepoStatus | undefined>("gg://repo/status", undefined);
export const revisionSelectEvent = await event<RevSet | undefined>("gg://revision/select", undefined);
export const changeSelectEvent = await event<RevChange | undefined>("gg://change/select", undefined);
export const progressEvent = await event<ProgressEvent | undefined>("gg://progress", undefined);

export const currentMutation = writable<Query<MutationResult> | null>(null);
export const currentContext = writable<Operand | null>();
export const currentSource = writable<Operand | null>();
export const currentTarget = writable<Operand | null>();
export const currentInput = writable<InputRequest & { callback: (response: InputResponse | null) => void } | null>();

export const hasModal = writable<boolean>(false);
export const hasMenu = writable<{ x: number; y: number } | null>(null);
export const lastFocus = writable<number>(Date.now());
export const ignoreToggled = writable<boolean>(false);

export const selectionHeaders = writable<RevHeader[]>([]);

export function dragOverWidget(event: DragEvent) {
    event.stopPropagation();
    currentTarget.set(null);
}

export const activeActivity = writable<string>('graph');
export const sidePanelVisible = writable<boolean>(true);
export const cheatSheetVisible = writable<boolean>(false);

// Kept for backward compatibility with orphaned components
export const rightActiveActivity = writable<string>('graph');
export const rightPanelVisible = writable<boolean>(false);

// Graph branch colors palette (GitKraken-style)
export const BRANCH_COLORS = [
    '#0099e5', // blue
    '#34c759', // green
    '#ff9500', // orange
    '#af52de', // purple
    '#ff3b30', // red
    '#5ac8fa', // light blue
    '#ffcc00', // yellow
    '#ff2d55', // pink
    '#30b0c7', // teal
    '#8e8e93', // gray
];

// Column-to-color cache for the graph
export const columnColorMap = writable<Map<number, string>>(new Map());

// Highlighted branch name (for hover-to-highlight feature)
export const highlightedBranch = writable<string | null>(null);

// Zoom level for the graph
export const zoomLevel = writable<number>(100);

export type LogEntry = {
    id: number;
    ts: number;
    endTs?: number;
    label: string;
    status: "running" | "ok" | "error" | "info";
    detail?: string;
};

export const operationLog = writable<LogEntry[]>([]);
export const activityLogVisible = writable<boolean>(false);

let _logSeq = 0;
export function logPush(entry: Omit<LogEntry, "id" | "ts">): number {
    const id = ++_logSeq;
    operationLog.update(l => [{ ...entry, id, ts: Date.now() }, ...l].slice(0, 200));
    return id;
}
export function logUpdate(id: number, patch: Partial<Pick<LogEntry, "status" | "detail">>): void {
    const endTs = (patch.status === "ok" || patch.status === "error") ? Date.now() : undefined;
    operationLog.update(l => l.map(e => e.id === id ? { ...e, ...patch, ...(endTs ? { endTs } : {}) } : e));
}

let _lastOpDesc: string | undefined;
repoStatusEvent.subscribe(status => {
    if (!status) return;
    if (status.operation_description && status.operation_description !== _lastOpDesc) {
        _lastOpDesc = status.operation_description;
        logPush({ label: status.operation_description, status: "info" });
    }
});

