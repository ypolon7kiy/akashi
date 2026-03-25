import { describe, expect, it } from 'vitest';
import {
  EMPTY_SELECTION,
  selectAll,
  selectExtendFocus,
  selectMoveFocus,
  selectNone,
  selectRange,
  selectSingle,
  selectToggle,
  type TreeSelectionState,
} from '@src/sidebar/webview/sources/tree/treeSelection';

const ids = ['a', 'b', 'c', 'd', 'e'];

function sel(selectedIds: string[], anchorId: string | null, focusedId: string | null): TreeSelectionState {
  return { selectedIds: new Set(selectedIds), anchorId, focusedId };
}

describe('selectSingle', () => {
  it('selects one item with anchor and focus', () => {
    const s = selectSingle('b');
    expect([...s.selectedIds]).toEqual(['b']);
    expect(s.anchorId).toBe('b');
    expect(s.focusedId).toBe('b');
  });
});

describe('selectToggle', () => {
  it('adds an item and updates anchor', () => {
    const prev = sel(['a'], 'a', 'a');
    const s = selectToggle(prev, 'c');
    expect(s.selectedIds.has('a')).toBe(true);
    expect(s.selectedIds.has('c')).toBe(true);
    expect(s.anchorId).toBe('c');
    expect(s.focusedId).toBe('c');
  });

  it('removes an item without changing anchor', () => {
    const prev = sel(['a', 'c'], 'c', 'c');
    const s = selectToggle(prev, 'c');
    expect(s.selectedIds.has('c')).toBe(false);
    expect(s.selectedIds.has('a')).toBe(true);
    expect(s.anchorId).toBe('c');
    expect(s.focusedId).toBe('c');
  });

  it('toggles into an empty selection', () => {
    const s = selectToggle(EMPTY_SELECTION, 'x');
    expect([...s.selectedIds]).toEqual(['x']);
    expect(s.anchorId).toBe('x');
  });
});

describe('selectRange', () => {
  it('selects range from anchor to target (anchor above)', () => {
    const prev = sel(['b'], 'b', 'b');
    const s = selectRange(prev, 'd', ids);
    expect([...s.selectedIds].sort()).toEqual(['b', 'c', 'd']);
    expect(s.anchorId).toBe('b');
    expect(s.focusedId).toBe('d');
  });

  it('selects range from anchor to target (anchor below)', () => {
    const prev = sel(['d'], 'd', 'd');
    const s = selectRange(prev, 'b', ids);
    expect([...s.selectedIds].sort()).toEqual(['b', 'c', 'd']);
    expect(s.anchorId).toBe('d');
    expect(s.focusedId).toBe('b');
  });

  it('falls back to selectSingle when no anchor', () => {
    const s = selectRange(EMPTY_SELECTION, 'c', ids);
    expect([...s.selectedIds]).toEqual(['c']);
    expect(s.anchorId).toBe('c');
    expect(s.focusedId).toBe('c');
  });

  it('falls back to selectSingle when anchor not in visible list', () => {
    const prev = sel(['z'], 'z', 'z');
    const s = selectRange(prev, 'c', ids);
    expect([...s.selectedIds]).toEqual(['c']);
  });

  it('handles same anchor and target', () => {
    const prev = sel(['b'], 'b', 'b');
    const s = selectRange(prev, 'b', ids);
    expect([...s.selectedIds]).toEqual(['b']);
    expect(s.anchorId).toBe('b');
  });
});

describe('selectMoveFocus', () => {
  it('replaces selection with single focused item', () => {
    const s = selectMoveFocus('c');
    expect([...s.selectedIds]).toEqual(['c']);
    expect(s.anchorId).toBe('c');
    expect(s.focusedId).toBe('c');
  });
});

describe('selectExtendFocus', () => {
  it('extends selection from anchor to new focus', () => {
    const prev = sel(['b'], 'b', 'b');
    const s = selectExtendFocus(prev, 'd', ids);
    expect([...s.selectedIds].sort()).toEqual(['b', 'c', 'd']);
    expect(s.anchorId).toBe('b');
    expect(s.focusedId).toBe('d');
  });

  it('shrinks range when focus moves back toward anchor', () => {
    const prev = sel(['b', 'c', 'd'], 'b', 'd');
    const s = selectExtendFocus(prev, 'c', ids);
    expect([...s.selectedIds].sort()).toEqual(['b', 'c']);
    expect(s.focusedId).toBe('c');
  });

  it('extends past anchor in reverse direction', () => {
    const prev = sel(['c'], 'c', 'c');
    const s = selectExtendFocus(prev, 'a', ids);
    expect([...s.selectedIds].sort()).toEqual(['a', 'b', 'c']);
    expect(s.anchorId).toBe('c');
    expect(s.focusedId).toBe('a');
  });

  it('falls back to selectSingle when no anchor', () => {
    const s = selectExtendFocus(EMPTY_SELECTION, 'c', ids);
    expect([...s.selectedIds]).toEqual(['c']);
    expect(s.anchorId).toBe('c');
  });
});

describe('selectAll', () => {
  it('selects all visible IDs', () => {
    const s = selectAll(ids);
    expect(s.selectedIds.size).toBe(5);
    expect(s.anchorId).toBe('a');
    expect(s.focusedId).toBe('e');
  });

  it('returns EMPTY_SELECTION for empty list', () => {
    expect(selectAll([])).toBe(EMPTY_SELECTION);
  });
});

describe('selectNone', () => {
  it('returns EMPTY_SELECTION', () => {
    expect(selectNone()).toBe(EMPTY_SELECTION);
  });
});
