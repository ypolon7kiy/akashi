import type * as vscode from 'vscode';
import { SourcesService } from '../application/SourcesService';
import { sourceKindsForPresets, type ActiveSourcePresetsGetter } from '../domain/sourcePresets';
import { NodeSourceFileStats } from './NodeSourceFileStats';
import { VscodeSourcesLogger } from './VscodeSourcesLogger';
import { VscodeSourcesSnapshotStore } from './VscodeSourcesSnapshotStore';
import { VscodeWorkspaceSourceScanner } from './VscodeWorkspaceSourceScanner';
import { readActiveSourcePresets } from './vscodeSourcePresetConfig';

export function createSourcesService(
  context: vscode.ExtensionContext,
  getActiveSourcePresets: ActiveSourcePresetsGetter = readActiveSourcePresets
): SourcesService {
  return new SourcesService(
    new VscodeWorkspaceSourceScanner(),
    new NodeSourceFileStats(),
    new VscodeSourcesSnapshotStore(context),
    new VscodeSourcesLogger(),
    () => sourceKindsForPresets(getActiveSourcePresets())
  );
}
