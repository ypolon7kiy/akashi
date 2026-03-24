import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { GraphPanelEnvironment } from './domains/graph/ui/graphPanelEnvironment';
import { Graph2DPanel, registerGraphUi } from './domains/graph/ui/register';
import { createConfigDomain } from './domains/config';
import { resolveArtifactCreation } from './domains/sources/application/createArtifact';
import { createSourcesService } from './domains/sources/infrastructure/createSourcesService';
import { findArtifactTemplateById } from './domains/sources/registerSourcePresets';
import { appendLine, getLog, initLog } from './log';
import { buildSourcesSnapshotPayload } from './sidebar/host/sources/sourcesSnapshotPayload';
import { createSidebarViewProvider } from './sidebar/host/SidebarViewProvider';
import { isPathAllowedForSidebarFs } from './sidebar/host/fs/handleSourcesFsRequest';
import { validateSourceFileBaseName } from './sidebar/bridge/validateSourceFileBaseName';
import { snapshotWorkspaceFolders } from './sidebar/host/sidebarWorkspaceFolders';
import { runNewArtifactWizard } from './sidebar/host/runNewArtifactWizard';

export function activate(context: vscode.ExtensionContext): void {
  initLog(context);
  appendLine('[Akashi] Extension activating...');
  const config = createConfigDomain(context);
  const sourcesService = createSourcesService(
    context,
    config.getActiveSourcePresets,
    config.resolveToolUserRoots
  );
  void sourcesService.getLastSnapshot();

  const graphEnv: GraphPanelEnvironment = {
    getGraphPayload: async () => {
      const snap = await sourcesService.getLastSnapshot();
      return buildSourcesSnapshotPayload(
        snap,
        snapshotWorkspaceFolders(),
        config.getActiveSourcePresets
      );
    },
  };

  const disposables = [
    // Register UI/commands for each domain here
    ...registerGraphUi(context, graphEnv, config.generalConfig),
    // Graph bridge: lets graph nodes (and other callers) create preset-aware artifacts
    // without importing sidebar types. Graph right-click will call this command.
    vscode.commands.registerCommand(
      'akashi.sources.createArtifact',
      async (args: { templateId: string; fileName: string; workspaceRoot: string }) => {
        const template = findArtifactTemplateById(args?.templateId);
        if (!template) {
          void vscode.window.showErrorMessage(`Unknown artifact template: ${args?.templateId}`);
          return;
        }
        const nameErr = validateSourceFileBaseName((args.fileName ?? '').trim());
        if (nameErr) {
          void vscode.window.showErrorMessage(nameErr);
          return;
        }
        const roots = config.resolveToolUserRoots(os.homedir());
        const resolvedDir = template.targetDirResolver(args.workspaceRoot ?? '', roots);
        const resolved = resolveArtifactCreation({
          template,
          fileName: args.fileName ?? '',
          resolvedDir,
        });
        if (!resolved.ok) {
          void vscode.window.showErrorMessage(resolved.error);
          return;
        }
        if (!isPathAllowedForSidebarFs(resolved.absolutePath)) {
          void vscode.window.showErrorMessage('This path cannot be modified from Akashi.');
          return;
        }
        const fileUri = vscode.Uri.file(resolved.absolutePath);
        try {
          await vscode.workspace.fs.stat(fileUri);
          void vscode.window.showErrorMessage('A file or folder with that name already exists.');
          return;
        } catch {
          // absent — ok
        }
        const parentUri = vscode.Uri.file(path.dirname(resolved.absolutePath));
        await vscode.workspace.fs.createDirectory(parentUri);
        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(resolved.content, 'utf8'));
        await vscode.commands.executeCommand('akashi.sources.refresh');
      }
    ),
    vscode.commands.registerCommand('akashi.sources.newArtifact', async () => {
      await runNewArtifactWizard(config.getActiveSourcePresets);
    }),
    vscode.window.registerWebviewViewProvider(
      'akashi.sidebar',
      createSidebarViewProvider(context, sourcesService, config, {
        onAfterSourcesSnapshotRefreshed: () => {
          void Graph2DPanel.refreshIfOpen(graphEnv);
        },
      })
    ),
  ];

  context.subscriptions.push(...disposables);
  appendLine('[Akashi] Extension activated.');

  if (context.extensionMode === vscode.ExtensionMode.Development) {
    queueMicrotask(() => {
      void vscode.commands.executeCommand('workbench.view.extension.akashi');
      void vscode.commands.executeCommand('akashi.sidebar.focus');
      Graph2DPanel.createOrShow(context, graphEnv, config.generalConfig);
      getLog()?.show(false);
    });
  }
}

export function deactivate(): void {
  // No-op for now; VS Code will dispose resources via subscriptions.
}
