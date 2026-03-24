import { parseCssColorToRgb } from '../../../shared/colors/cssColorParse';
import {
  SIDEBAR_SOURCE_CATEGORY_KEYS,
  type SidebarSourceCategoryKey,
} from '../../../shared/sourceCategoryKeys';

export interface GraphCategoryColorPair {
  fill: string;
  hover: string;
}

export type GraphSourceCategoryPalette = Readonly<
  Record<SidebarSourceCategoryKey, GraphCategoryColorPair>
>;

/** Hover fallbacks used when a fill cannot be converted to canvas RGB (e.g. var()/hsl()). */
export const GRAPH_SOURCE_CATEGORY_HOVER_FALLBACKS: GraphSourceCategoryPalette = {
  context: { fill: '#3B82F6', hover: '#93C5FD' },
  rule: { fill: '#F59E0B', hover: '#FCD34D' },
  skill: { fill: '#10B981', hover: '#6EE7B7' },
  hook: { fill: '#EF4444', hover: '#FCA5A5' },
  config: { fill: '#6B7280', hover: '#D1D5DB' },
  mcp: { fill: '#8B5CF6', hover: '#C4B5FD' },
  unknown: { fill: '#9CA3AF', hover: '#D1D5DB' },
};

function mixTowardWhite(r: number, g: number, b: number, t: number): string {
  const rr = Math.round(r + (255 - r) * t);
  const gg = Math.round(g + (255 - g) * t);
  const bb = Math.round(b + (255 - b) * t);
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(rr)}${h(gg)}${h(bb)}`;
}

/**
 * Canvas-friendly hover fill when the user supplies a parseable hex/rgb color.
 * `var(--vscode-*)` and `hsl()` fall back to `undefined`.
 */
export function deriveCategoryHoverFromFill(fill: string): string | undefined {
  const rgb = parseCssColorToRgb(fill);
  if (!rgb) {
    return undefined;
  }
  return mixTowardWhite(rgb.r, rgb.g, rgb.b, 0.5);
}

/** Resolve frozen category fills into canvas fill/hover pairs used by graph category nodes. */
export function resolveGraphSourceCategoryPalette(
  fills: Readonly<Record<SidebarSourceCategoryKey, string>>
): GraphSourceCategoryPalette {
  const out = {} as Record<SidebarSourceCategoryKey, GraphCategoryColorPair>;
  for (const key of SIDEBAR_SOURCE_CATEGORY_KEYS) {
    const fill = fills[key];
    const hover =
      deriveCategoryHoverFromFill(fill) ?? GRAPH_SOURCE_CATEGORY_HOVER_FALLBACKS[key].hover;
    out[key] = { fill, hover };
  }
  return out;
}
