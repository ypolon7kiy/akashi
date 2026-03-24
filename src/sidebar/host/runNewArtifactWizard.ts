import * as vscode from 'vscode';
import type { ArtifactTemplate } from '../../domains/sources/domain/artifactTemplate';
import type { SourcePresetId } from '../../shared/sourcePresetId';
import { getArtifactTemplatesForContext } from '../../domains/sources/registerSourcePresets';
import { validateSourceFileBaseName } from '../bridge/validateSourceFileBaseName';

const PRESET_LABELS: Record<SourcePresetId, string> = {
  claude: 'Claude',
  cursor: 'Cursor',
  antigravity: 'Antigravity',
  codex: 'Codex',
};

type PresetQuickPickItem = vscode.QuickPickItem & { readonly presetId: SourcePresetId };

type TemplateQuickPickItem = vscode.QuickPickItem & { readonly template: ArtifactTemplate };

function inferWorkspaceRoot(): string {
  const editor = vscode.window.activeTextEditor;
  const uri = editor?.document.uri;
  if (uri?.scheme === 'file') {
    const wf = vscode.workspace.getWorkspaceFolder(uri);
    if (wf) {
      return wf.uri.fsPath;
    }
  }
  const first = vscode.workspace.workspaceFolders?.[0];
  return first?.uri.fsPath ?? '';
}

/**
 * Sidebar title-bar flow: preset → locality → artifact template → name, then `akashi.sources.createArtifact`.
 */
export async function runNewArtifactWizard(
  getActivePresets: () => ReadonlySet<SourcePresetId>
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

  const locality = await vscode.window.showQuickPick<
    vscode.QuickPickItem & { readonly scope: 'workspace' | 'user' }
  >(
    [
      { label: 'This workspace', scope: 'workspace', description: 'Project-scoped tool files' },
      { label: 'Global (user)', scope: 'user', description: 'User home tool configuration' },
    ],
    { title: 'Location', placeHolder: 'Where to create the artifact' }
  );
  if (!locality) {
    return;
  }

  let workspaceRoot = '';
  if (locality.scope === 'workspace') {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders?.length) {
      void vscode.window.showErrorMessage(
        'Open a folder or workspace to create workspace-scoped artifacts.'
      );
      return;
    }
    workspaceRoot = inferWorkspaceRoot();
  }

  const templates = [...getArtifactTemplatesForContext(presetId, locality.scope)];
  if (templates.length === 0) {
    void vscode.window.showErrorMessage('No artifact types for this preset and location.');
    return;
  }

  const templatePick = await vscode.window.showQuickPick<TemplateQuickPickItem>(
    templates.map((t) => ({
      label: t.label,
      description: t.category,
      template: t,
    })),
    { title: 'Artifact type', placeHolder: 'Choose what to create' }
  );
  if (!templatePick) {
    return;
  }

  const tpl = templatePick.template;
  const name = await vscode.window.showInputBox({
    title: tpl.input.title ?? 'Name',
    prompt: tpl.input.prompt,
    validateInput: (v) => {
      const base = validateSourceFileBaseName(v.trim());
      if (base) return base;
      return tpl.input.validate?.(v.trim()) ?? undefined;
    },
  });
  if (name === undefined) {
    return;
  }
  const trimmed = name.trim();
  const nameErr = validateSourceFileBaseName(trimmed);
  if (nameErr) {
    void vscode.window.showErrorMessage(nameErr);
    return;
  }

  await vscode.commands.executeCommand('akashi.sources.createArtifact', {
    templateId: tpl.id,
    userInput: trimmed,
    workspaceRoot,
  });
}
