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

  it('preserves valid force settings', () => {
    const s = parseGraph2DWebviewPersistedState({
      controlsCollapsed: false,
      linkDistance: 80,
      chargeStrength: 300,
      centerStrength: 0.1,
      presetClusterStrength: 0.3,
      layerBandStrength: 0.2,
    });
    expect(s.controlsCollapsed).toBe(false);
    expect(s.linkDistance).toBe(80);
    expect(s.chargeStrength).toBe(300);
  });

  it('clamps out-of-range values to valid bounds', () => {
    const s = parseGraph2DWebviewPersistedState({
      linkDistance: 9999,
      chargeStrength: -10,
    });
    const d = defaultGraph2DWebviewPersistedState();
    // linkDistance is clamped to max (160)
    expect(s.linkDistance).toBe(160);
    // chargeStrength is clamped to min (20)
    expect(s.chargeStrength).toBe(20);
    // Other fields get defaults
    expect(s.controlsCollapsed).toBe(d.controlsCollapsed);
  });

  it('silently ignores removed linkStrength and collidePadding from old persisted state', () => {
    const s = parseGraph2DWebviewPersistedState({
      linkDistance: 72,
      linkStrength: 0.55,
      collidePadding: 6,
      chargeStrength: 200,
    });
    expect(s.linkDistance).toBe(72);
    expect(s.chargeStrength).toBe(200);
    expect('linkStrength' in s).toBe(false);
    expect('collidePadding' in s).toBe(false);
  });

  it('ignores legacy enabledPresets/enabledCategories fields without error', () => {
    const s = parseGraph2DWebviewPersistedState({
      enabledPresets: ['cursor'],
      enabledCategories: ['context'],
      linkDistance: 72,
    });
    // Should parse without error and return valid state
    expect(s.linkDistance).toBe(72);
    // No enabledPresets or enabledCategories on the result
    expect('enabledPresets' in s).toBe(false);
    expect('enabledCategories' in s).toBe(false);
  });
});
