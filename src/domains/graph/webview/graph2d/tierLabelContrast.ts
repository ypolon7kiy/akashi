import { parseCssColorToRgb, relativeLuminanceRgb } from '../cssColorParse';

/**
 * Tier node fills are saturated; use a higher cutoff than editor-chrome “is light” (0.45 when
 * editor-adaptive rim lands in canvasThemeColors) so labels stay readable on mid-tone fills.
 */
export const TIER_LABEL_LUMINANCE_THRESHOLD = 0.55;

/** Cache keyed by `${fillCss}\0${lightText}\0${darkText}` — palette is small and discrete. */
const _contrastCache = new Map<string, string>();

export function pickContrastingTierLabelColor(
  fillCss: string,
  lightText: string,
  darkText: string
): string {
  const key = `${fillCss}\0${lightText}\0${darkText}`;
  const cached = _contrastCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const rgb = parseCssColorToRgb(fillCss);
  const result =
    !rgb || relativeLuminanceRgb(rgb) <= TIER_LABEL_LUMINANCE_THRESHOLD ? lightText : darkText;
  _contrastCache.set(key, result);
  return result;
}
