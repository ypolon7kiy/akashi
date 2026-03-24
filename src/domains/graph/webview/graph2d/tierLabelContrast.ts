import { parseCssColorToRgb, relativeLuminanceRgb } from '../../../../shared/colors/cssColorParse';

/**
 * Tier node fills (locality, category) are saturated; use a higher cutoff than editor-chrome “is light”
 * so labels stay readable on mid-tone fills.
 */
export const TIER_LABEL_LUMINANCE_THRESHOLD = 0.55;

/**
 * Preset hub fills (e.g. #A855F7, L≈0.22) sit below {@link TIER_LABEL_LUMINANCE_THRESHOLD}, which forced
 * white inside labels. Use a lower cutoff so preset labels stay black unless the fill is very dark.
 */
export const PRESET_TIER_LABEL_LUMINANCE_THRESHOLD = 0.2;

/** Cache keyed by fill, text colors, and threshold — palette is small and discrete. */
const _contrastCache = new Map<string, string>();

export function pickContrastingTierLabelColor(
  fillCss: string,
  lightText: string,
  darkText: string,
  luminanceThreshold: number = TIER_LABEL_LUMINANCE_THRESHOLD
): string {
  const key = `${fillCss}\0${lightText}\0${darkText}\0${luminanceThreshold}`;
  const cached = _contrastCache.get(key);
  if (cached !== undefined) {
    return cached;
  }
  const rgb = parseCssColorToRgb(fillCss);
  const result =
    !rgb || relativeLuminanceRgb(rgb) <= luminanceThreshold ? lightText : darkText;
  _contrastCache.set(key, result);
  return result;
}

/** Fill = best contrast on `fillCss`; stroke = the other of `lightText` / `darkText` for an outline. */
export function tierLabelContrastingPair(
  fillCss: string,
  lightText: string,
  darkText: string,
  luminanceThreshold: number = TIER_LABEL_LUMINANCE_THRESHOLD
): { fill: string; stroke: string } {
  const fill = pickContrastingTierLabelColor(fillCss, lightText, darkText, luminanceThreshold);
  return { fill, stroke: fill === lightText ? darkText : lightText };
}
