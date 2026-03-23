import { parseCssColorToRgb, relativeLuminanceRgb } from '../cssColorParse';

/**
 * Tier node fills are saturated; use a higher cutoff than editor-chrome “is light” (0.45 when
 * editor-adaptive rim lands in canvasThemeColors) so labels stay readable on mid-tone fills.
 */
export const TIER_LABEL_LUMINANCE_THRESHOLD = 0.55;

export function pickContrastingTierLabelColor(
  fillCss: string,
  lightText: string,
  darkText: string
): string {
  const rgb = parseCssColorToRgb(fillCss);
  if (!rgb) {
    return darkText;
  }
  const L = relativeLuminanceRgb(rgb);
  return L > TIER_LABEL_LUMINANCE_THRESHOLD ? darkText : lightText;
}
