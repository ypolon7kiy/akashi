import type { GeneralConfigProvider } from '../../../shared/config/generalConfigProvider';
import { FROZEN_CONFIG_KEYS } from '../../../shared/config/generalConfigProvider';

/** `<style>` block for `<head>` (after bundled sidebar CSS). */
export function buildSidebarCategoryColorStyleBlock(generalConfig: GeneralConfigProvider): string {
  const lines = generalConfig.getFrozen(
    FROZEN_CONFIG_KEYS.sidebarSourceCategoryFileColorCssInjectLines
  );
  if (lines.length === 0) {
    return '';
  }
  return `<style id="akashi-sidebar-category-colors">\n:root {\n${lines.join('\n')}\n}\n</style>`;
}
