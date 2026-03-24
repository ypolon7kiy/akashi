import { describe, expect, it } from 'vitest';
import {
  apparentFontPxAtZoom,
  zoomScaledCanvasFontPx,
} from '@src/domains/graph/webview/graph2d/labelZoom';

describe('label zoom sizing', () => {
  it('keeps canvas-space font size at the base value', () => {
    expect(zoomScaledCanvasFontPx(11)).toBe(11);
    expect(zoomScaledCanvasFontPx(9.5)).toBe(9.5);
  });

  it('increases apparent font size when zoom increases', () => {
    const base = 11;
    expect(apparentFontPxAtZoom(base, 0.5)).toBe(5.5);
    expect(apparentFontPxAtZoom(base, 1)).toBe(11);
    expect(apparentFontPxAtZoom(base, 2)).toBe(22);
  });

  it('falls back to zoom=1 for invalid zoom values', () => {
    const base = 12;
    expect(apparentFontPxAtZoom(base, 0)).toBe(12);
    expect(apparentFontPxAtZoom(base, Number.NaN)).toBe(12);
    expect(apparentFontPxAtZoom(base, Number.POSITIVE_INFINITY)).toBe(12);
  });
});
