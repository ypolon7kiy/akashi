import * as os from 'node:os';
import * as vscode from 'vscode';
import type { ArtifactCreator } from '../../domains/sources/domain/artifactCreator';
import type { SourcePresetId } from '../../shared/sourcePresetId';
import type { ToolUserRoots } from '../../shared/toolUserRoots';
import { getArtifactCreatorsForContext } from '../../domains/sources/registerSourcePresets';
import { executeCreationPlan } from '../../domains/sources/infrastructure/executeCreationPlan';
import { inferWorkspaceRoot } from './inferWorkspaceRoot';

const PRESET_LABELS: Record<SourcePresetId, string> = {
  claude: 'Claude',
  cursor: 'Cursor',
  antigravity: 'Antigravity',
  codex: 'Codex',
};

type PresetQuickPickItem = vscode.QuickPickItem & { readonly presetId: SourcePresetId };

type CreatorQuickPickItem = vscode.QuickPickItem & { readonly creator: ArtifactCreator };

/**
 * Sidebar title-bar flow: preset → locality → artifact creator, then `creator.run()` + execute plan.
 */
export async function runNewArtifactWizard(
  getActivePresets: () => ReadonlySet<SourcePresetId>,
  resolveToolUserRoots: (homeDir: string) => ToolUserRoots
): Promise<void> {
  const active = [...getActivePresets()].sort((a, b) => a.localeCompare(b));
  if (active.length === 0) {
    void vscode.window.showErrorMessage('No active source presets. Configure akashi.presets.');
    return;
  }

  let presetId: SourcePresetId;
  if (active.length === 1) {
    presetId = active[0]!;
  } else {
    const picked = await vscode.window.showQuickPick<PresetQuickPickItem>(
      active.map((id) => ({
        label: PRESET_LABELS[id],
        presetId: id,
      })),
      { title: 'Preset', placeHolder: 'Choose a tool preset' }
    );
    if (!picked) {
      return;
    }
    presetId = picked.presetId;
  }

  const localityPick = await vscode.window.showQuickPick<
    vscode.QuickPickItem & { readonly locality: 'workspace' | 'user' }
  >(
    [
      { label: 'This workspace', locality: 'workspace', description: 'Project-scoped tool files' },
      { label: 'Global (user)', locality: 'user', description: 'User home tool configuration' },
    ],
    { title: 'Location', placeHolder: 'Where to create the artifact' }
  );
  if (!localityPick) {
    return;
  }

  let workspaceRoot = '';
  if (localityPick.locality === 'workspace') {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders?.length) {
      void vscode.window.showErrorMessage(
        'Open a folder or workspace to create workspace-scoped artifacts.'
      );
      return;
    }
    workspaceRoot = inferWorkspaceRoot();
  }

  const creators = [...getArtifactCreatorsForContext(presetId, localityPick.locality)];
  if (creators.length === 0) {
    void vscode.window.showErrorMessage('No artifact types for this preset and location.');
    return;
  }

  const creatorPick = await vscode.window.showQuickPick<CreatorQuickPickItem>(
    creators.map((c) => ({
      label: c.label,
      description: c.category,
      creator: c,
    })),
    { title: 'Artifact type', placeHolder: 'Choose what to create' }
  );
  if (!creatorPick) {
    return;
  }

  const roots = resolveToolUserRoots(os.homedir());
  const planned = await creatorPick.creator.run({ workspaceRoot, roots });
  if (planned.kind === 'cancelled') {
    return;
  }
  if (planned.kind === 'error') {
    void vscode.window.showErrorMessage(planned.error);
    return;
  }

  const result = await executeCreationPlan(planned.plan);
  if (!result.ok) {
    void vscode.window.showErrorMessage(result.error);
    return;
  }
  if (result.openPath) {
    try {
      const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(result.openPath));
      await vscode.window.showTextDocument(doc);
    } catch {
      // Opening is best-effort (e.g. binary or missing file).
    }
  }
  await vscode.commands.executeCommand('akashi.sources.refresh');
}
