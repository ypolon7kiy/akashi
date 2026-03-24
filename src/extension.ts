import * as os from 'node:os';
import * as vscode from 'vscode';
import type { GraphPanelEnvironment } from './domains/graph/ui/graphPanelEnvironment';
import { Graph2DPanel, registerGraphUi } from './domains/graph/ui/register';
import { createConfigDomain } from './domains/config';
import { executeCreationPlan } from './domains/sources/infrastructure/executeCreationPlan';
import { createSourcesService } from './domains/sources/infrastructure/createSourcesService';
import { findArtifactTemplateById } from './domains/sources/registerSourcePresets';
import { appendLine, getLog, initLog } from './log';
import { buildSourcesSnapshotPayload } from './sidebar/host/sources/sourcesSnapshotPayload';
import { createSidebarViewProvider } from './sidebar/host/SidebarViewProvider';
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
      async (args: { templateId: string; userInput: string; workspaceRoot: string }) => {
        const template = findArtifactTemplateById(args?.templateId);
        if (!template) {
          void vscode.window.showErrorMessage(`Unknown artifact template: ${args?.templateId}`);
          return;
        }
        const userInput = (args.userInput ?? '').trim();
        const nameErr = validateSourceFileBaseName(userInput);
        if (nameErr) {
          void vscode.window.showErrorMessage(nameErr);
          return;
        }
        const roots = config.resolveToolUserRoots(os.homedir());
        const planned = template.plan({ userInput, workspaceRoot: args.workspaceRoot ?? '', roots });
        if (!planned.ok) {
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
