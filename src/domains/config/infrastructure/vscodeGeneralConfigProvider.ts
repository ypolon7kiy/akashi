import * as vscode from 'vscode';
import { extractSidebarFileColorUserOverrides } from '../domain/extractSidebarFileColorUserOverrides';
import { normalizeSidebarFileColors } from '../domain/normalizeSidebarFileColors';
import { userOverridesSidebarFileColorsToCssLines } from '../domain/userOverridesSidebarFileColorsToCssLines';
import {
  type FrozenConfigValues,
  type GeneralConfigProvider,
} from '../../../shared/config/generalConfigProvider';

/**
 * Reads frozen slices once at construction (activation-time in extension).
 * Dynamic settings (presets, include-home, tool roots) are read elsewhere in this folder on each use.
 */
export function createGeneralConfigProvider(): GeneralConfigProvider {
  const cfg = vscode.workspace.getConfiguration('akashi');
  const inspectedFileColors = cfg.inspect('sidebar.fileColors');
  const rawFileColorsEffective = cfg.get('sidebar.fileColors');
  const rawFileColorUserOverrides = extractSidebarFileColorUserOverrides(inspectedFileColors);

  const frozen: FrozenConfigValues = {
    sidebarSourceCategoryFileColors: normalizeSidebarFileColors(rawFileColorsEffective),
    sidebarSourceCategoryFileColorCssInjectLines:
      userOverridesSidebarFileColorsToCssLines(rawFileColorUserOverrides),
  };

  return {
    getFrozen(key) {
      return frozen[key];
    },
  };
}
