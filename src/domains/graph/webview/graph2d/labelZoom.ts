/**
 * Text is drawn under a canvas transform that already applies zoom (`ctx.scale(k, k)`).
 * To make labels visually scale with zoom, keep canvas-space font size at the base value.
 */
export function zoomScaledCanvasFontPx(baseFontPx: number): number {
  return baseFontPx;
}

/**
 * Convenience helper for tests/documentation: converts canvas-space font px to effective
 * on-screen px for a given zoom factor.
 */
export function apparentFontPxAtZoom(baseFontPx: number, zoomK: number): number {
  const k = Number.isFinite(zoomK) && zoomK > 0 ? zoomK : 1;
  return zoomScaledCanvasFontPx(baseFontPx) * k;
}
