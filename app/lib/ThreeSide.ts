/**
 * Type definitions for the three-pane merge conflict resolver.
 * Mirrors the Rust backend types from src/messages/queries.rs
 */

import type { MultilineString } from "../messages/MultilineString";
import type { TreePath } from "../messages/TreePath";
import type { RevId } from "../messages/RevId";

/** Side identifiers for the three-pane merge view */
export enum ThreeSide {
    LEFT = 0,   // Ours / Local
    RIGHT = 1,  // Theirs / Incoming
}

/** One side of a conflict (Ours or Theirs) */
export interface ConflictSide {
    content: MultilineString;
    label: string;
}

/** Type of merge conflict */
export enum ConflictType {
    /** Both sides modified the same region */
    Conflict = "Conflict",
    /** Only left side (Ours) has changes */
    LeftChange = "LeftChange",
    /** Only right side (Theirs) has changes */
    RightChange = "RightChange",
    /** Both sides made identical changes */
    IdenticalChange = "IdenticalChange",
}

/** A decomposed conflict with separate content for each side */
export interface ConflictSlice {
    index: number;
    /** [Ours, Theirs] - content from each parent */
    sides: [ConflictSide, ConflictSide];
    /** The initially proposed resolution (materialized conflict markers) */
    initialResult: MultilineString;
    conflictType: ConflictType;
}

/** Request to query conflict slices for a file */
export interface ConflictSlicesRequest {
    revision_id: RevId;
    path: TreePath;
}

/** Response containing conflict slices for a file */
export interface ConflictSlicesResponse {
    path: TreePath;
    slices: ConflictSlice[];
}

/** Props for gutter arrow buttons */
export interface GutterArrowProps {
    side: ThreeSide;
    conflictIndex: number;
    onAccept: (side: ThreeSide, index: number) => void;
    disabled?: boolean;
}
