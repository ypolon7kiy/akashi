import * as vscode from 'vscode';
import type { GeneralConfigProvider } from '../../shared/config/generalConfigProvider';
import type {
  ActiveSourcePresetsGetter,
  IncludeHomeConfigGetter,
  ToolUserRootsResolver,
  WorkbenchSidebarFsSettings,
} from '../../shared/config/workspaceConfigTypes';
import { akashiSourcesIndexingSettingsAffected } from './infrastructure/akashiIndexingConfiguration';
import { readIncludeHomeConfig } from './infrastructure/vscodeAkashiIncludeHome';
import { readActiveSourcePresets } from './infrastructure/vscodeAkashiPresets';
import { createGeneralConfigProvider } from './infrastructure/vscodeGeneralConfigProvider';
import { readToolUserRoots } from './infrastructure/vscodeToolUserRoots';
import { createWorkbenchSidebarFsSettings } from './infrastructure/vscodeWorkbenchSidebarFsSettings';

export interface ConfigDomain {
  generalConfig: GeneralConfigProvider;
  getActiveSourcePresets: ActiveSourcePresetsGetter;
  getIncludeHomeConfig: IncludeHomeConfigGetter;
  resolveToolUserRoots: ToolUserRootsResolver;
  workbenchFsSettings: WorkbenchSidebarFsSettings;
  /** Subscribe to changes of settings that affect source indexing. Returns a disposable. */
  onIndexingSettingsChanged(cb: () => Promise<void>): vscode.Disposable;
}

/**
 * Bootstraps all extension configuration providers and owns the VS Code
 * `onDidChangeConfiguration` subscription. The returned ConfigDomain is the
 * single entry-point for all configuration concerns; other domains receive only
 * the abstract interfaces they need.
 */
export function createConfigDomain(context: vscode.ExtensionContext): ConfigDomain {
  const generalConfig = createGeneralConfigProvider();
  const workbenchFsSettings = createWorkbenchSidebarFsSettings();

  const indexingCallbacks = new Set<() => Promise<void>>();

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (!akashiSourcesIndexingSettingsAffected(e)) {
        return;
      }
      for (const cb of indexingCallbacks) {
        void cb();
      }
    })
  );

  return {
    generalConfig,
    getActiveSourcePresets: readActiveSourcePresets,
    getIncludeHomeConfig: readIncludeHomeConfig,
    resolveToolUserRoots: readToolUserRoots,
    workbenchFsSettings,
    onIndexingSettingsChanged(cb) {
      indexingCallbacks.add(cb);
      return {
        dispose: () => {
          indexingCallbacks.delete(cb);
        },
      };
    },
  };
}
