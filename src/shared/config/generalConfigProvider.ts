import type { SidebarSourceCategoryKey } from '../sourceCategoryKeys';

export const FROZEN_CONFIG_KEYS = {
  sidebarSourceCategoryFileColors: 'sidebarSourceCategoryFileColors',
  /** User override layers only; lines for `:root` injection (theme fallbacks when absent). */
  sidebarSourceCategoryFileColorCssInjectLines: 'sidebarSourceCategoryFileColorCssInjectLines',
} as const;

export type FrozenConfigKey = (typeof FROZEN_CONFIG_KEYS)[keyof typeof FROZEN_CONFIG_KEYS];

/** Normalized effective `akashi.sidebar.fileColors` (defaults merged); frozen until reload. */
export type FrozenSidebarSourceCategoryFileColors = Readonly<
  Record<SidebarSourceCategoryKey, string>
>;

export interface FrozenConfigValues {
  [FROZEN_CONFIG_KEYS.sidebarSourceCategoryFileColors]: FrozenSidebarSourceCategoryFileColors;
  [FROZEN_CONFIG_KEYS.sidebarSourceCategoryFileColorCssInjectLines]: readonly string[];
}

export interface GeneralConfigProvider {
  getFrozen<K extends FrozenConfigKey>(key: K): FrozenConfigValues[K];
}
