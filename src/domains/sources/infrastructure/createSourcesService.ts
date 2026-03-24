import type * as vscode from 'vscode';
import type {
  ActiveSourcePresetsGetter,
  ToolUserRootsResolver,
} from '../../../shared/config/workspaceConfigTypes';
import { SourcesService } from '../application/SourcesService';
import { NodeSourceFileStats } from './NodeSourceFileStats';
import { VscodeSourcesLogger } from './VscodeSourcesLogger';
import { VscodeSourcesSnapshotStore } from './VscodeSourcesSnapshotStore';
import { VscodeWorkspaceSourceScanner } from './VscodeWorkspaceSourceScanner';

export function createSourcesService(
  context: vscode.ExtensionContext,
  getActiveSourcePresets: ActiveSourcePresetsGetter,
  resolveToolUserRoots: ToolUserRootsResolver
): SourcesService {
  return new SourcesService(
    new VscodeWorkspaceSourceScanner(resolveToolUserRoots),
    new NodeSourceFileStats(),
    new VscodeSourcesSnapshotStore(context),
    new VscodeSourcesLogger(),
    getActiveSourcePresets
  );
}
