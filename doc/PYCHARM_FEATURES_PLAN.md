# PyCharm-Inspired Feature Plan for gg

## Context

This plan maps PyCharm's best Git UX features to Jujutsu/gg concepts. It is derived from a feature-comparison analysis and ranked by impact vs. implementation effort given gg's **Tauri v2 / Svelte 5 / Rust (jj-lib 0.41)** stack.

---

## Current Architecture Overview

| Layer | Key Files | Responsibilities |
|-------|-----------|------------------|
| **Backend (Rust)** | `src/worker/queries.rs`, `src/worker/mutations/`, `src/messages/` | Session management, jj-lib integration, diff generation, IPC command handlers |
| **Frontend (Svelte)** | `app/`, `app/ipc.ts`, `app/stores.ts` | UI components, state management, drag-and-drop, IPC client |
| **IPC** | `app/messages/*.ts` (auto-generated from Rust via ts-rs) | Type-safe request/response types |
| **Diff Engine** | `src/worker/queries.rs` (lines 476–642) | Unified diff hunks, conflict materialization with Git-style markers |

### What Already Exists (Reusable)
- **Diff data pipeline**: `RevChange`/`ChangeHunk`/`RevConflict` structs carry full hunk content with context lines.
- **Conflict detection**: `query_revisions` already materializes conflicts via `conflicts::materialize_merge_result` with Git-style markers.
- **Hunk-level mutations**: `ChangeMutator` supports `move_hunk` and `copy_hunk` mutations.
- **Drag-and-drop framework**: `Object.svelte`/`Zone.svelte`/`BinaryMutator.ts` handle visual operations.
- **External tool fallback**: `external_diff` and `external_resolve` mutations delegate to configured tools.

---

## Priority 1: Inline Diff Renderer in Right Pane
**Impact: High | Effort: Medium | Prerequisites: None**

### Problem
The right pane (`RevisionPane.svelte`) renders diffs as plain `<pre>` text with only `+`/`-` line coloring. There is no syntax highlighting, inline word-level diffs, or collapsible file sections. For any serious inspection, users fall back to an external diff tool.

### Goal
Replace the raw `<pre>` diff block with a syntax-highlighted, inline diff viewer that makes external tools unnecessary for read-only inspection.

### Implementation

#### Backend Changes
- [ ] **1a. Expose token-level diff data**
  - Current: `get_unified_hunks()` coalesces tokens into plain strings (`" +line"`).
  - Change: Add a new query type (or extend `ChangeHunk`) to preserve `DiffTokenType` (Matching vs Different) per token.
  - File: `src/messages/queries.rs` — add `tokens: Vec<(DiffTokenType, String)>` to `ChangeHunk` or create `RichChangeHunk`.
  - File: `src/worker/queries.rs` — modify `get_unified_hunks()` to emit token vectors alongside line strings.

#### Frontend Changes
- [ ] **1b. Add syntax highlighting dependency**
  - Evaluate lightweight options: `highlight.js`, `prismjs`, or a WASM highlighter.
  - Preference: `shiki` (if bundle size acceptable) or `highlight.js` for on-the-fly highlighting of small hunks.
  - File: `package.json` — add dependency.

- [ ] **1c. Build `DiffViewer.svelte` component**
  - Accepts: `RevChange[]`, selected file path, syntax-highlighting mode.
  - Features:
    - Syntax-highlighted context lines.
    - Inline word-level diff highlighting (using `DiffTokenType::Different` tokens).
    - Collapsible/expandable hunks.
    - Sticky file header bars.
  - File: `app/controls/DiffViewer.svelte`.

- [ ] **1d. Integrate into `RevisionPane.svelte`**
  - Replace the raw `<pre class="diff">` block (lines 266–269) with `<DiffViewer>`.
  - Keep `HunkObject` drag handles if hunks remain draggable.

#### Data Flow
```
query_revisions → RevsResult::Detail → RevChange[] → ChangeHunk.lines (raw)
                                              ↓
                                   ChangeHunk.tokens (new)
                                              ↓
                                    DiffViewer.svelte
```

---

## Priority 2: Hunk-Level Routing UI (Visual `jj split`/`squash --interactive`)
**Impact: High | Effort: Medium-High | Prerequisites: Priority 1 (for hunk selection UI)**

### Problem
gg supports file-level drag-and-drop (squash/restore) but not hunk-level routing. Users must use `jj split --interactive` or `jj squash --interactive` in the CLI to build commits incrementally from hunks.

### Goal
Add checkboxes or toggle controls per hunk in the diff viewer, allowing the user to visually route selected hunks to a different commit (e.g., parent, new child, or arbitrary revision).

### Implementation

#### Frontend Changes
- [ ] **2a. Extend `DiffViewer.svelte` with hunk actions**
  - Add a checkbox or toggle per hunk: "include in operation".
  - Add a destination selector (dropdown or drag target) for where to move/copy the selected hunks.
  - Files: `app/controls/DiffViewer.svelte`, `app/controls/HunkSelector.svelte`.

- [ ] **2b. Create `HunkRouter.svelte` panel**
  - A dedicated UI showing:
    - Source revision (working copy or selected).
    - List of changed files with expandable hunks.
    - Destination revision selector (graph node or bookmark).
    - Preview of which hunks go where.
  - Could be a modal or a bottom panel in `RevisionPane`.

#### Backend Changes
- [ ] **2c. Batch hunk mutation endpoint**
  - Current: `move_hunk` and `copy_hunk` operate on a single hunk at a time.
  - Add: `move_hunks` and `copy_hunks` that accept a list of `(path, hunk, destination)`.
  - File: `src/messages/mutations.rs` — add `MoveHunks`, `CopyHunks`.
  - File: `src/worker/mutations/` — implement batch handlers using existing `jj-lib` primitives.

#### UX Considerations
- This is the Jujutsu equivalent of PyCharm's "Compare HEAD / Staged / Local" three-way diff staging gutter.
- Since jj has no index, the mental model is "route hunks to commit X" rather than "stage hunks".

---

## Priority 3: Inline Three-Pane Conflict Resolver
**Impact: Highest | Effort: High | Prerequisites: Priority 1**

### Problem
When a file has conflicts, gg currently shows the Git-style conflict markers inline and offers an "Resolve" button that launches an external merge tool. There is no way to resolve conflicts inside gg.

### Goal
Build a three-pane conflict resolver: **Base / Left** | **Result (editable)** | **Right**, with accept/reject arrows per hunk, similar to PyCharm's merge tool.

### Implementation

#### Backend Changes
- [ ] **3a. Expose structured conflict data**
  - Current: `RevConflict` contains a single materialized hunk with conflict markers.
  - Change: Add a query that returns conflict slices: for each conflicted file, return the three sides (base, left/ours, right/theirs) as separate content arrays.
  - Leverage `jj_lib::conflicts` and `MaterializedFileValue::FileConflict` to decompose rather than materialize markers.
  - File: `src/messages/queries.rs` — add `ConflictSlice { base: Vec<Line>, left: Vec<Line>, right: Vec<Line>, hunks: Vec<ConflictHunk> }`.
  - File: `src/worker/queries.rs` — new async fn `query_conflict_slices()`.

- [ ] **3b. Save resolved conflict content**
  - New mutation: `resolve_conflict { revision, path, content: String }`.
  - Writes the resolved text back into the tree as a regular file, clearing the conflict.
  - File: `src/worker/mutations/` — implement via `jj-lib` tree editing APIs.

#### Frontend Changes
- [ ] **3c. Build `ConflictResolver.svelte`**
  - Three-column layout (flex or CSS grid).
  - Columns:
    1. `ConflictSidePane` — read-only, labeled "Base" / "Ours".
    2. `ConflictEditPane` — editable `<textarea>` or contenteditable div, labeled "Result".
    3. `ConflictSidePane` — read-only, labeled "Theirs".
  - Per-hunk accept arrows (◄ ►) to copy a hunk from either side into the result.
  - Non-conflicting changes auto-applied in the result pane.
  - Syntax highlighting for all three panes.
  - File: `app/shell/ConflictResolver.svelte`.

- [ ] **3d. Trigger from `ChangeObject.svelte`**
  - When `change.has_conflict == true`, offer "Resolve inline" in addition to "Resolve in merge tool".
  - File: `app/objects/ChangeObject.svelte`.

#### Data Flow
```
User clicks "Resolve inline"
    ↓
query_conflict_slices(rev, path)
    ↓
ConflictResolver displays 3 panes
    ↓
User edits result + clicks accept arrows
    ↓
resolve_conflict mutation → backend writes resolved file → repo updates
```

---

## Priority 4: File History Panel
**Impact: Medium | Effort: Medium | Prerequisites: None**

### Problem
There is no way in gg to ask "show me all commits that touched `python/src/auth.py`". PyCharm makes this trivial via right-click → Git → Show History.

### Goal
Add a context-menu action on files: "Show History", which opens a filtered log of revisions that modified the selected file.

### Implementation

#### Backend Changes
- [ ] **4a. File-history query endpoint**
  - New query: `query_file_history { path: TreePath, limit: usize } → Vec<RevHeader>`.
  - Uses jj revset: `jj log -r 'file("path")'` (equivalent revset in `jj-lib`).
  - File: `src/messages/queries.rs` — add `FileHistoryRequest`/`FileHistoryResponse`.
  - File: `src/worker/queries.rs` — implement using `Repo::evaluate_revset_str` with a file-filter revset.

#### Frontend Changes
- [ ] **4b. Context menu integration**
  - In `ChangeObject.svelte`, add "Show History" to the context menu.
  - File: `app/objects/ChangeObject.svelte` and `app/controls/ContextMenu.svelte`.

- [ ] **4c. Build `FileHistoryPane.svelte`**
  - Reuses `LogPane`/`GraphLog` components but with a filtered dataset.
  - Shows: commit message, author, date, and a mini-diff of how the file changed in that commit.
  - Could be a modal overlay or a temporary replace of the left pane.
  - File: `app/shell/FileHistoryPane.svelte`.

---

## Priority 5: Bookmark Ahead/Behind Indicator
**Impact: Medium | Effort: Low | Prerequisites: None**

### Problem
The status bar shows remotes but does not indicate whether local bookmarks are ahead of or behind their remote tracking counterparts. Users must manually run `jj git fetch` to discover drift.

### Goal
Add ahead/behind counters (e.g., `main ↑2 ↓1`) next to bookmarks in the graph and/or status bar.

### Implementation

#### Backend Changes
- [ ] **5a. Compute ahead/behind counts**
  - Extend `RevHeader` or create a new `BookmarkStatus` struct with:
    - `ahead_count: usize` — commits local has that remote doesn't.
    - `behind_count: usize` — commits remote has that local doesn't.
  - Use `jj-lib` graph reachability or revset subtraction to compute counts.
  - File: `src/messages/queries.rs` — extend `StoreRef` or `RevHeader`.
  - File: `src/worker/git_util.rs` — add helper to compute divergence counts.

#### Frontend Changes
- [ ] **5b. Render indicators in `BookmarkSpan.svelte` or `GraphNode.svelte`**
  - Display small badges: green `↑N` for ahead, blue `↓N` for behind.
  - Only show when `N > 0`.
  - File: `app/controls/BookmarkSpan.svelte`.

---

## Priority 6: Background Fetch with Indicator
**Impact: Low-Medium | Effort: Low | Prerequisites: Priority 5 (for badge UI)**

### Problem
Fetch is entirely manual (button in status bar). PyCharm 2025.1 added automatic fetch on remote change.

### Goal
Run `jj git fetch` quietly in the background and show a subtle badge when the remote has moved ahead of local state.

### Implementation

#### Backend Changes
- [ ] **6a. Background fetch timer**
  - In `WorkspaceSession`, spawn an async interval (e.g., every 60s) to run `jj git fetch --quiet`.
  - Expose a `RemoteSyncEvent` to the frontend when new refs are fetched.
  - File: `src/worker/session.rs` — add background task.
  - File: `src/messages/mod.rs` — add `RemoteSyncEvent` event type.

#### Frontend Changes
- [ ] **6b. Display fetch status in `StatusBar.svelte`**
  - When `RemoteSyncEvent` indicates new remote refs, show a subtle dot or "fetch" icon on the relevant remote button.
  - Optionally auto-refresh the log pane after fetch.
  - File: `app/shell/StatusBar.svelte`.

- [ ] **6c. Config option**
  - Add `gg.ui.background-fetch-interval` to `src/config/gg.toml` (default: 60 seconds, or 0 to disable).

---

## Cross-Cutting Concerns

### Performance & Large Repos
- The `gg.toml` config already has `large-repo-heuristic = 100000`.
- Any new query (file history, conflict slices, background fetch) should respect this heuristic and degrade gracefully (disable or throttle).

### Syntax Highlighting Decision
| Option | Pros | Cons |
|--------|------|------|
| **highlight.js** | Tiny, easy, no build complexity | Less accurate than tree-sitter |
| **Shiki** | VS Code-quality themes, accurate | Larger bundle, WASM load |
| **On-demand WASM** (tree-sitter) | Best accuracy | Complex build, language grammars |

**Recommendation**: Start with `highlight.js` for Priority 1. Evaluate Shiki if bundle size is acceptable after testing.

### Accessibility
- The new diff viewer and conflict resolver must maintain keyboard navigability.
- Follow existing gg conventions: `ListWidget` for arrow-key selection, `ActionWidget` for actionable buttons.

---

## Recommended Implementation Order

| Phase | Features | Rationale |
|-------|----------|-----------|
| **Phase 1** | Priority 1 (Inline Diff Renderer) | Pure read-only UI, biggest daily QoL gain, unlocks Phase 2 |
| **Phase 2** | Priority 2 (Hunk-Level Routing) | Builds on Phase 1's diff viewer, uses existing `move_hunk`/`copy_hunk` backend |
| **Phase 3** | Priority 5 (Bookmark Ahead/Behind) + Priority 6 (Background Fetch) | Low effort, high visibility, complements each other |
| **Phase 4** | Priority 3 (Conflict Resolver) | Most impactful but most complex; best attempted after diff infrastructure is mature |
| **Phase 5** | Priority 4 (File History) | Nice-to-have, relatively isolated |

---

## Files to Create/Modify (Summary)

### New Files
- `app/controls/DiffViewer.svelte`
- `app/controls/HunkSelector.svelte`
- `app/shell/ConflictResolver.svelte`
- `app/shell/FileHistoryPane.svelte`
- `src/worker/queries/file_history.rs` (or inline in `queries.rs`)

### Modified Files
| File | Changes |
|------|---------|
| `src/messages/queries.rs` | Add `RichChangeHunk`, `ConflictSlice`, `FileHistoryRequest/Response` |
| `src/messages/mutations.rs` | Add `ResolveConflict`, `MoveHunks`, `CopyHunks` |
| `src/messages/mod.rs` | Add `RemoteSyncEvent` |
| `src/worker/queries.rs` | Token-level diff emission, conflict decomposition, file history |
| `src/worker/mutations/` | Implement new mutation handlers |
| `src/worker/session.rs` | Background fetch timer |
| `app/RevisionPane.svelte` | Replace raw diff with `<DiffViewer>` |
| `app/objects/ChangeObject.svelte` | Add "Resolve inline", "Show History" actions |
| `app/shell/StatusBar.svelte` | Add ahead/behind badges, fetch indicator |
| `package.json` | Add syntax highlighting dependency |
| `src/config/gg.toml` | Add `background-fetch-interval` |
