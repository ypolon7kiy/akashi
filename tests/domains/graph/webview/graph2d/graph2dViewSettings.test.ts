import { describe, expect, it } from 'vitest';
import {
  defaultGraph2DWebviewPersistedState,
  parseGraph2DWebviewPersistedState,
} from '@src/domains/graph/webview/graph2d/graph2dViewSettings';

describe('parseGraph2DWebviewPersistedState', () => {
  it('returns full defaults when raw is null or undefined or non-object', () => {
    const d = defaultGraph2DWebviewPersistedState();
    expect(parseGraph2DWebviewPersistedState(null)).toEqual(d);
    expect(parseGraph2DWebviewPersistedState(undefined)).toEqual(d);
    expect(parseGraph2DWebviewPersistedState(42)).toEqual(d);
    expect(parseGraph2DWebviewPersistedState('x')).toEqual(d);
  });

  it('defaults enabledCategories to null', () => {
    expect(defaultGraph2DWebviewPersistedState().enabledCategories).toBe(null);
  });

  it('uses fallback when enabledCategories key is omitted', () => {
    const d = defaultGraph2DWebviewPersistedState();
    const s = parseGraph2DWebviewPersistedState({
      controlsCollapsed: d.controlsCollapsed,
      enabledPresets: d.enabledPresets,
      linkDistance: d.linkDistance,
      linkStrength: d.linkStrength,
      chargeStrength: d.chargeStrength,
      centerStrength: d.centerStrength,
      presetClusterStrength: d.presetClusterStrength,
      layerBandStrength: d.layerBandStrength,
      collidePadding: d.collidePadding,
    });
    expect(s.enabledCategories).toBe(null);
  });

  it('parses enabledCategories null as all', () => {
    const d = defaultGraph2DWebviewPersistedState();
    const s = parseGraph2DWebviewPersistedState({ ...d, enabledCategories: null });
    expect(s.enabledCategories).toBe(null);
  });

  it('parses enabledCategories array with dedupe and trim filter', () => {
    const d = defaultGraph2DWebviewPersistedState();
    const s = parseGraph2DWebviewPersistedState({
      ...d,
      enabledCategories: ['context', 'rule', 'context', '  ', 'skill'],
    });
    expect(s.enabledCategories).toEqual(['context', 'rule', 'skill']);
  });

  it('falls back when enabledCategories is invalid', () => {
    const d = defaultGraph2DWebviewPersistedState();
    const s = parseGraph2DWebviewPersistedState({
      ...d,
      enabledCategories: 'nope' as unknown as string[],
    });
    expect(s.enabledCategories).toBe(d.enabledCategories);
  });
});
