import { describe, expect, it } from 'vitest';
import {
  countEnabledInOverride,
  invertEnabledOverride,
  normalizeEnabledOverride,
  selectAllEnabledOverride,
  selectNoneEnabledOverride,
  toggleEnabledId,
} from '@src/domains/graph/webview/graphVisibilityOverrides';

const ABC = ['a', 'b', 'c'] as const;

describe('normalizeEnabledOverride', () => {
  it('returns null when enabled set equals full', () => {
    expect(normalizeEnabledOverride(new Set(ABC), [...ABC])).toBeNull();
  });

  it('returns empty set when nothing enabled', () => {
    const r = normalizeEnabledOverride(new Set(), [...ABC]);
    expect(r).toEqual(new Set());
  });

  it('returns partial set', () => {
    expect(normalizeEnabledOverride(new Set(['a', 'c']), [...ABC])).toEqual(new Set(['a', 'c']));
  });

  it('filters unknown ids', () => {
    expect(normalizeEnabledOverride(new Set(['a', 'z']), [...ABC])).toEqual(new Set(['a']));
  });

  it('returns null for empty full list', () => {
    expect(normalizeEnabledOverride(new Set(['x']), [])).toBeNull();
  });
});

describe('toggleEnabledId', () => {
  it('from all on (null), toggling one off yields partial', () => {
    expect(toggleEnabledId(null, [...ABC], 'b')).toEqual(new Set(['a', 'c']));
  });

  it('from partial, toggling back on can reach all on as null', () => {
    const oneOff = new Set(['a', 'c']);
    expect(toggleEnabledId(oneOff, [...ABC], 'b')).toBeNull();
  });

  it('toggling last enabled off yields empty set', () => {
    expect(toggleEnabledId(new Set(['a']), ['a'], 'a')).toEqual(new Set());
  });

  it('ignores unknown id', () => {
    expect(toggleEnabledId(null, [...ABC], 'z')).toBeNull();
  });
});

describe('selectAll / selectNone / invert', () => {
  it('selectAll is null', () => {
    expect(selectAllEnabledOverride()).toBeNull();
  });

  it('selectNone yields empty set', () => {
    expect(selectNoneEnabledOverride([...ABC])).toEqual(new Set());
  });

  it('selectNone with empty full yields null', () => {
    expect(selectNoneEnabledOverride([])).toBeNull();
  });

  it('invert from null yields none', () => {
    expect(invertEnabledOverride(null, [...ABC])).toEqual(new Set());
  });

  it('invert from none yields all (null)', () => {
    expect(invertEnabledOverride(new Set(), [...ABC])).toBeNull();
  });

  it('invert partial swaps', () => {
    expect(invertEnabledOverride(new Set(['a']), [...ABC])).toEqual(new Set(['b', 'c']));
  });
});

describe('countEnabledInOverride', () => {
  it('counts null as all', () => {
    expect(countEnabledInOverride(null, [...ABC])).toEqual({ enabled: 3, total: 3 });
  });

  it('counts set size', () => {
    expect(countEnabledInOverride(new Set(['a']), [...ABC])).toEqual({ enabled: 1, total: 3 });
  });

  it('empty full', () => {
    expect(countEnabledInOverride(null, [])).toEqual({ enabled: 0, total: 0 });
  });
});
