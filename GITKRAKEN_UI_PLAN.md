# GG ? Creative Solarized-Light UI Plan

## Current State Analysis

GG uses a minimal two-pane layout (log left, detail right) with a Catppuccin Macchiato theme. The commit graph is SVG-based with all-blue lines and simple circle nodes. There is no top toolbar or left sidebar. Buttons use box-shadow styling. The status bar is functional but plain.

## Target Look & Feel (Creative Solarized-Light)

Instead of cloning GitKraken, we reimagine the layout with these principles:
- **Solarized Light** palette — warm parchment background, muted accents, high readability
- **Graph as canvas** — the commit graph is the star, occupying the full central viewport
- **Floating panels** — detail panes float over the graph like cards, not rigid splits
- **Activity bar** — a vertical left strip (VS Code-inspired) for switching major contexts
- **Command palette omnibar** — a top-centered search/action bar (like Sublime Merge / VS Code)
- **Bottom drawer** — terminal-like bottom panel for diffs, logs, and command output
- **Zen mode** — ability to collapse everything except the graph
- **Breadcrumb trail** — shows your current revset context above the graph

---

## Phase 1: Solarized Light Theme & Global Styles
**Goal:** Establish the warm, readable Solarized Light palette.

### Files to Modify
- `app/global.css`

### Changes
1. Replace Catppuccin with Solarized Light color variables:
   - `--sl-base3: #fdf6e3` (main background — warm parchment)
   - `--sl-base2: #eee8d5` (elevated surfaces, cards, panes)
   - `--sl-base1: #93a1a1` (optional emphasis, disabled text)
   - `--sl-base0: #839496` (secondary text)
   - `--sl-base00: #657b83` (primary text)
   - `--sl-base01: #586e75` (headings, emphasized text)
   - `--sl-base02: #073642` (dark accents, inverted elements)
   - `--sl-base03: #002b36` (darkest, used sparingly)
   - `--sl-yellow: #b58900` (warnings, branch color)
   - `--sl-orange: #cb4b16` (branch color, heatmaps)
   - `--sl-red: #dc322f` (errors, conflicts, deletes)
   - `--sl-magenta: #d33682` (branch color, remote refs)
   - `--sl-violet: #6c71c4` (branch color, bookmarks)
   - `--sl-blue: #268bd2` (primary accent, links, buttons)
   - `--sl-cyan: #2aa198` (branch color, info)
   - `--sl-green: #859900` (success, additions, working copy)

2. Dark mode support: keep a Solarized Dark variant using `@media (prefers-color-scheme: dark)` with the dark Solarized palette.

3. Update `::selection`, `textarea`, `input`, `select` styles to match Solarized.
4. Add CSS custom properties:
   - `--radius-sm: 4px`, `--radius-md: 8px`, `--radius-lg: 12px`
   - `--shadow-sm: 0 1px 2px rgba(0,0,0,0.08)`
   - `--shadow-md: 0 4px 12px rgba(0,0,0,0.12)`
   - `--shadow-lg: 0 8px 24px rgba(0,0,0,0.16)`
5. Font stack: system sans-serif, monospace for code (`--stack-code`).

---

## Phase 2: Command Palette Omnibar
**Goal:** A top-centered search bar that is the primary entry point for navigation, actions, and revset queries.

### New Files
- `app/shell/OmniBar.svelte` — Floating search bar with command palette feel.

### Files to Modify
- `app/Shell.svelte`

### Changes
1. In `Shell.svelte`, add `<OmniBar />` as a floating element at the top-center of the content area.
2. `OmniBar.svelte` features:
   - A wide, centered search input with a magnifying glass icon.
   - `Ctrl+K` or `Cmd+K` shortcut to focus.
   - Typing a revset (e.g., `@`, `main`, `description(xyz)`) immediately filters the graph.
   - Typing `>` or `/` switches to command mode (e.g., `/push`, `/fetch`, `/new`, `/squash`).
   - Dropdown suggestions: recent revsets, bookmarks, commands.
   - Background: `--sl-base2` with `--shadow-md`, border-radius `--radius-lg`.
   - When unfocused, collapses to a small floating pill.
3. The existing `LogPane` query selector is removed or replaced by the omnibar.

---

## Phase 3: Activity Bar + Sidebar
**Goal:** A vertical left activity bar for context switching, replacing the rigid left sidebar with something more flexible.

### New Files
- `app/shell/ActivityBar.svelte` — Vertical strip with icon buttons.
- `app/shell/SidePanel.svelte` — Collapsible side panel that hosts different views based on the active activity.

### Files to Modify
- `app/Shell.svelte`

### Changes
1. In `Shell.svelte`, add `<ActivityBar />` on the far left (40px wide).
   - Icons: Graph (default), Branches, Changes/Stashes, Remotes, Tags, Settings.
   - Active icon is highlighted with a left border accent in `--sl-blue`.
   - Background: `--sl-base2`, border-right: 1px solid transparent or very subtle.
2. `SidePanel.svelte` appears to the right of the ActivityBar (200-280px, collapsible):
   - **Graph view**: panel is hidden (max canvas space).
   - **Branches view**: tree list of local/remote bookmarks with sync status dots.
   - **Changes view**: list of working copy changes (uncommitted files).
   - **Remotes view**: list of remotes with fetch/push buttons per remote.
   - **Tags view**: tag list.
3. The panel can be toggled with a pin icon so it stays open or auto-hides.
4. Background: `--sl-base2`, subtle right border.

---

## Phase 4: Graph-as-Canvas Layout
**Goal:** The commit graph is the central, full-viewport canvas. Everything else floats around or over it.

### New Files
- `app/CanvasLayout.svelte` — Main layout wrapper for the graph canvas.
- `app/shell/FloatingCard.svelte` — Reusable floating panel component with shadow and drag handle.

### Files to Modify
- `app/App.svelte`
- `app/Shell.svelte`
- `app/GraphLog.svelte`
- `app/LogPane.svelte`

### Changes
1. **App.svelte** is restructured:
   - The two-pane grid is removed.
   - Instead: a single `<CanvasLayout>` that fills the remaining space after ActivityBar + OmniBar.
   - Inside CanvasLayout:
     - `<GraphLog>` fills the background.
     - Floating cards appear on top for detail views.
2. **LogPane** is no longer a traditional pane. It becomes the graph canvas itself.
   - The header (query selector) is removed (replaced by OmniBar).
   - The body is the graph scrolling area, full-width.
3. **Floating detail cards** (`FloatingCard.svelte`):
   - When a commit is selected, a card appears on the right side of the canvas (like a slide-out panel but with shadow).
   - The card contains the `RevisionPane` content.
   - Cards can be:
     - Pinned (stays open)
     - Minimized (collapses to a tab)
     - Closed (dismissed)
   - Background: `--sl-base2`, border-radius `--radius-md`, `--shadow-lg`.
   - Drag handle at top to reposition.
4. **Graph styling changes** (same files as before but adapted to light theme):
   - **Colored branch lines** (`GraphLine.svelte`):
     - Hash bookmark names to Solarized accent colors (yellow, orange, magenta, violet, blue, cyan, green).
     - Default lines: `--sl-base1`.
   - **Commit nodes** (`GraphNode.svelte`):
     - Larger: `r=9`.
     - Immutable commits: filled with author-hashed color (Solarized accents).
     - Mutable commits: hollow ring with author color.
     - Working copy: filled `--sl-green` with a white inner dot.
   - **Branch labels** (`BookmarkObject.svelte` / `Chip.svelte`):
     - Flat rounded rectangles matching the branch line color.
     - White or dark text depending on contrast.
   - **Graph line thickness**: 2px.

---

## Phase 5: Bottom Drawer
**Goal:** A terminal-like bottom panel for diffs, file trees, and command output.

### New Files
- `app/shell/BottomDrawer.svelte` — Collapsible bottom panel with tabs.

### Files to Modify
- `app/Shell.svelte`
- `app/RevisionPane.svelte`

### Changes
1. In `Shell.svelte`, add `<BottomDrawer>` below the canvas area.
   - Height: collapsible (default 0, toggles to 30-40% of viewport).
   - Toggle button on the status bar or via shortcut.
2. `BottomDrawer.svelte` features tabs:
   - **Diff** (default): Shows the diff for the selected commit.
   - **Files**: A file tree of the selected commit.
   - **Output**: Logs of recent commands (push, fetch, etc.).
   - **Terminal**: (stretch goal) an embedded terminal panel.
3. **RevisionPane.svelte** is split:
   - The top part (description, parents, commands) stays in the floating detail card.
   - The changes/diff section moves into the Bottom Drawer.
4. Background: `--sl-base2`, top border: 1px solid `--sl-base1` (subtle).

---

## Phase 6: Breadcrumb Trail
**Goal:** A subtle breadcrumb above the graph showing your current context.

### New Files
- `app/shell/BreadCrumbs.svelte`

### Files to Modify
- `app/Shell.svelte`

### Changes
1. In `Shell.svelte`, add `<BreadCrumbs />` below the OmniBar, above the canvas.
2. `BreadCrumbs.svelte` shows:
   - Workspace name / path.
   - Current revset (e.g., `all() | bookmarks()`).
   - Selected commit ID and description.
   - Clicking any crumb navigates or opens the relevant panel.
3. Style: small font (12px), `--sl-base0` color, minimal height (24px).

---

## Phase 7: Status Bar Redesign
**Goal:** Minimal, informative bottom strip.

### Files to Modify
- `app/shell/StatusBar.svelte`

### Changes
1. Height: 26px.
2. Background: `--sl-base2`, top border: 1px solid `--sl-base1`.
3. Content:
   - Left: workspace name + current branch (colored dot matching branch color).
   - Center: sync status (ahead X, behind Y) with small arrows.
   - Right: compact icon buttons (Undo, Bottom Drawer toggle, Zen Mode toggle).
4. Text: 11px, `--sl-base00`.
5. Drag-bar (drop hints) styled with `--sl-yellow` background and `--sl-base03` text.

---

## Phase 8: Button & Control Styling
**Goal:** Clean, Solarized-consistent controls.

### Files to Modify
- `app/controls/ActionWidget.svelte`
- `app/controls/Chip.svelte`
- `app/controls/SelectWidget.svelte`
- `app/controls/ToggleWidget.svelte`
- `app/controls/Icon.svelte`

### Changes
1. **ActionWidget.svelte**:
   - Remove box-shadow.
   - Primary: background `--sl-blue`, text white, `border-radius: --radius-sm`.
   - Secondary: background `--sl-base2`, text `--sl-base01`, border 1px solid `--sl-base1`.
   - Hover: lighten background by 8%, transition 150ms.
   - Danger: background `--sl-red`.
2. **Chip.svelte** (bookmarks/tags):
   - Flat, no border, colored background from branch palette.
   - Text: white or `--sl-base03` depending on contrast.
   - Height: 20px, `border-radius: --radius-sm`, font: 11px bold sans-serif.
3. **Icon.svelte**:
   - Default stroke: `--sl-base01`.
   - State colors: `add` ? `--sl-green`, `change` ? `--sl-blue`, `remove` ? `--sl-red`.
4. **SelectWidget / ToggleWidget**:
   - Borders: `--sl-base1`.
   - Focus: `--sl-blue` outline.
   - Backgrounds: `--sl-base3` or `--sl-base2`.

---

## Phase 9: Context Menu & Modals
**Goal:** Solarized-consistent overlays.

### Files to Modify
- `app/controls/ContextMenu.svelte`
- `app/shell/ModalOverlay.svelte`
- `app/shell/ErrorDialog.svelte`
- `app/shell/InputDialog.svelte`
- `app/shell/ProgressDialog.svelte`

### Changes
1. Context menus:
   - Background: `--sl-base2`, border: 1px solid `--sl-base1`.
   - Border-radius: `--radius-md`, shadow: `--shadow-md`.
   - Hover items: background `--sl-base3`.
2. Modals / dialogs:
   - Overlay: `rgba(0,43,54,0.45)` (darkened Solarized base03).
   - Dialog card: `--sl-base2`, border-radius `--radius-lg`, shadow `--shadow-lg`.
   - Title: `--sl-base01` bold.
   - Buttons: match Phase 8 styling.
3. Progress dialog:
   - Progress bar: `--sl-blue` fill on `--sl-base1` track.

---

## Phase 10: Zen Mode & Customization
**Goal:** Let the user focus.

### New Files
- `app/shell/ZenMode.svelte` — Overlay toggle that hides all panels.

### Files to Modify
- `app/Shell.svelte`
- `app/stores.js` (or wherever UI state is stored)

### Changes
1. **Zen Mode toggle** (in status bar or omnibar):
   - Hides ActivityBar, SidePanel, BottomDrawer, FloatingCards.
   - Only the graph canvas remains, full-screen.
   - Floating "exit zen mode" button appears on hover.
2. **Panel position persistence** (stretch):
   - Floating card positions are remembered per workspace via localStorage or backend config.

---

## File Change Summary

| Phase | File | Action |
|-------|------|--------|
| 1 | `app/global.css` | Edit |
| 2 | `app/shell/OmniBar.svelte` | **Create** |
| 2 | `app/Shell.svelte` | Edit |
| 3 | `app/shell/ActivityBar.svelte` | **Create** |
| 3 | `app/shell/SidePanel.svelte` | **Create** |
| 3 | `app/Shell.svelte` | Edit |
| 4 | `app/CanvasLayout.svelte` | **Create** |
| 4 | `app/shell/FloatingCard.svelte` | **Create** |
| 4 | `app/App.svelte` | Edit |
| 4 | `app/Shell.svelte` | Edit |
| 4 | `app/GraphLine.svelte` | Edit |
| 4 | `app/GraphNode.svelte` | Edit |
| 4 | `app/RevisionObject.svelte` | Edit |
| 4 | `app/objects/BookmarkObject.svelte` | Edit |
| 5 | `app/shell/BottomDrawer.svelte` | **Create** |
| 5 | `app/Shell.svelte` | Edit |
| 5 | `app/RevisionPane.svelte` | Edit |
| 6 | `app/shell/BreadCrumbs.svelte` | **Create** |
| 6 | `app/Shell.svelte` | Edit |
| 7 | `app/shell/StatusBar.svelte` | Edit |
| 8 | `app/controls/ActionWidget.svelte` | Edit |
| 8 | `app/controls/Chip.svelte` | Edit |
| 8 | `app/controls/SelectWidget.svelte` | Edit |
| 8 | `app/controls/ToggleWidget.svelte` | Edit |
| 8 | `app/controls/Icon.svelte` | Edit |
| 9 | `app/controls/ContextMenu.svelte` | Edit |
| 9 | `app/shell/ModalOverlay.svelte` | Edit |
| 9 | `app/shell/ErrorDialog.svelte` | Edit |
| 9 | `app/shell/InputDialog.svelte` | Edit |
| 9 | `app/shell/ProgressDialog.svelte` | Edit |
| 10 | `app/shell/ZenMode.svelte` | **Create** |
| 10 | `app/Shell.svelte` | Edit |

---

## Risks & Considerations

1. **Layout complexity**: Moving from a rigid two-pane grid to a floating canvas is a significant layout refactor. Start by getting the theme and basic canvas working before adding floating cards.
2. **Tauri version mismatch**: Ensure `npm run check` passes after Svelte changes.
3. **Color hashing**: Assigning Solarized colors to branches and authors must be deterministic and visually distinct.
4. **Performance**: A full-viewport SVG graph with floating DOM cards over it should be fine, but test scroll performance.
5. **Accessibility**: Floating cards and bottom drawers need proper ARIA roles, focus management, and keyboard navigation.
6. **Backwards compatibility**: Visual-only changes; no mutation logic or IPC contracts need to change.
7. **Light theme readability**: Solarized Light is designed for readability, but ensure contrast ratios pass WCAG AA.
