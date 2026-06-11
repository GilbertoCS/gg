/**
 * Type definitions for the three-pane merge conflict resolver.
 * Mirrors the Rust backend types from src/messages/queries.rs
 */

import type { ConflictRegion } from "../messages/ConflictRegion";
import type { ConflictType } from "../messages/ConflictType";

export type { ConflictRegion } from "../messages/ConflictRegion";
export type { ConflictType } from "../messages/ConflictType";
export type { ConflictSlicesResponse } from "../messages/ConflictSlicesResponse";

/** Side identifiers for the three-pane merge view */
export enum ThreeSide {
    LEFT = 0, // Ours / Local
    RIGHT = 1, // Theirs / Incoming
}

/** How a conflict region's result content was chosen. */
export type ResolutionMode = "unresolved" | "ours" | "theirs" | "both-lr" | "both-rl" | "manual";

/** Per-conflict resolution state tracked by the resolver UI. */
export interface ConflictResolution {
    mode: ResolutionMode;
    /** the current result lines for this conflict region */
    lines: string[];
}

/** A `Conflict` region is the only kind that requires user input. */
export function isUnresolvableAutomatically(kind: ConflictType): boolean {
    return kind === "Conflict";
}

/** Initial resolution for a region: stable/auto-resolvable apply immediately. */
export function initialResolution(region: ConflictRegion): ConflictResolution {
    switch (region.kind) {
        case "RightChange":
            return { mode: "theirs", lines: [...region.theirs.lines] };
        case "LeftChange":
        case "IdenticalChange":
            return { mode: "ours", lines: [...region.ours.lines] };
        case "Conflict":
            return { mode: "unresolved", lines: [] };
        default:
            // Stable regions are not tracked as conflicts
            return { mode: "ours", lines: [...region.ours.lines] };
    }
}

/**
 * Reassemble the full resolved file, preserving stable context and substituting
 * each conflict region's chosen/edited content in file order.
 */
export function buildResolvedContent(
    regions: ConflictRegion[],
    resolutions: Map<number, ConflictResolution>,
): string[] {
    const out: string[] = [];
    for (const region of regions) {
        if (region.kind === "Stable") {
            out.push(...region.ours.lines);
        } else if (region.conflict_index !== null) {
            const res = resolutions.get(region.conflict_index);
            out.push(...(res ? res.lines : []));
        }
    }
    return out;
}
