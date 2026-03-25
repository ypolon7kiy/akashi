/**
 * Pure selection model for multi-select tree interactions.
 *
 * Tracks three distinct concepts:
 *   - selectedIds  – the set of highlighted rows
 *   - anchorId     – origin for Shift-range operations
 *   - focusedId    – keyboard cursor / aria-activedescendant
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TreeSelectionState {
  readonly selectedIds: ReadonlySet<string>;
  /** Last plain-click or Ctrl-click-to-add — origin for Shift ranges. */
  readonly anchorId: string | null;
  /** Keyboard cursor — drives `aria-activedescendant`. */
  readonly focusedId: string | null;
}

export const EMPTY_SELECTION: TreeSelectionState = {
  selectedIds: new Set<string>(),
  anchorId: null,
  focusedId: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Inclusive slice of `ids` between `fromId` and `toId` (order-independent). */
function computeRange(ids: readonly string[], fromId: string, toId: string): readonly string[] {
  const a = ids.indexOf(fromId);
  const b = ids.indexOf(toId);
  if (a === -1 || b === -1) {
    return [];
  }
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return ids.slice(lo, hi + 1);
}

// ---------------------------------------------------------------------------
// Reducers
// ---------------------------------------------------------------------------

/** Plain click: clear selection, select only the clicked item. */
export function selectSingle(id: string): TreeSelectionState {
  return { selectedIds: new Set([id]), anchorId: id, focusedId: id };
}

/** Ctrl/Cmd+Click: toggle one item in/out of the set. */
export function selectToggle(prev: TreeSelectionState, id: string): TreeSelectionState {
  const next = new Set(prev.selectedIds);
  if (next.has(id)) {
    next.delete(id);
    return { selectedIds: next, anchorId: prev.anchorId, focusedId: id };
  }
  next.add(id);
  return { selectedIds: next, anchorId: id, focusedId: id };
}

/** Shift+Click: select contiguous range from anchor to target. */
export function selectRange(
  prev: TreeSelectionState,
  targetId: string,
  visibleIds: readonly string[]
): TreeSelectionState {
  const anchor = prev.anchorId;
  if (!anchor || !visibleIds.includes(anchor)) {
    return selectSingle(targetId);
  }
  const range = computeRange(visibleIds, anchor, targetId);
  if (range.length === 0) {
    return selectSingle(targetId);
  }
  return { selectedIds: new Set(range), anchorId: anchor, focusedId: targetId };
}

/** Arrow key (no Shift): move focus, replace selection with the new focus. */
export function selectMoveFocus(id: string): TreeSelectionState {
  return { selectedIds: new Set([id]), anchorId: id, focusedId: id };
}

/** Shift+Arrow: extend selection from anchor to the new focus position. */
export function selectExtendFocus(
  prev: TreeSelectionState,
  newFocusId: string,
  visibleIds: readonly string[]
): TreeSelectionState {
  const anchor = prev.anchorId;
  if (!anchor || !visibleIds.includes(anchor)) {
    return selectSingle(newFocusId);
  }
  const range = computeRange(visibleIds, anchor, newFocusId);
  if (range.length === 0) {
    return selectSingle(newFocusId);
  }
  return { selectedIds: new Set(range), anchorId: anchor, focusedId: newFocusId };
}

/** Select all visible nodes (Ctrl/Cmd+A). */
export function selectAll(visibleIds: readonly string[]): TreeSelectionState {
  if (visibleIds.length === 0) {
    return EMPTY_SELECTION;
  }
  return {
    selectedIds: new Set(visibleIds),
    anchorId: visibleIds[0],
    focusedId: visibleIds[visibleIds.length - 1],
  };
}

/** Escape: clear selection entirely. */
export function selectNone(): TreeSelectionState {
  return EMPTY_SELECTION;
}

// ---------------------------------------------------------------------------
// Platform helper
// ---------------------------------------------------------------------------

/** True when the platform modifier key is pressed (Cmd on macOS, Ctrl elsewhere). */
export function isPlatformMultiSelectKey(e: { metaKey: boolean; ctrlKey: boolean }): boolean {
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);
  return isMac ? e.metaKey : e.ctrlKey;
}
