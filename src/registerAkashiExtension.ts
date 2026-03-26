import * as os from 'node:os';
import * as vscode from 'vscode';
import type { GraphPanelEnvironment } from './domains/graph/ui/graphPanelEnvironment';
import { Graph2DPanel, registerGraphUi } from './domains/graph/ui/register';
import { createConfigDomain } from './domains/config';
import { executeCreationPlan } from './domains/sources/infrastructure/executeCreationPlan';
import { createSourcesService } from './domains/sources/infrastructure/createSourcesService';
import {
  buildArtifactCreatorMenuEntries,
  findArtifactCreatorById,
} from './domains/sources/registerSourcePresets';
import { createSourceFileWatcher } from './domains/sources/infrastructure/sourceFileWatcher';
import { appendLine, getLog } from './log';
import { buildSourcesSnapshotPayload } from './sidebar/host/sources/sourcesSnapshotPayload';
import { createSidebarViewProvider } from './sidebar/host/SidebarViewProvider';
import { snapshotWorkspaceFolders } from './sidebar/host/sidebarWorkspaceFolders';
import { inferWorkspaceRoot } from './sidebar/host/inferWorkspaceRoot';
import { runNewArtifactWizard } from './sidebar/host/runNewArtifactWizard';

/**
 * Registers Akashi commands, webviews, and graph UI. Used by {@link activate} and integration tests.
 */
export function registerAkashiExtension(context: vscode.ExtensionContext): void {
  const config = createConfigDomain(context);
  const sourcesService = createSourcesService(
    context,
    config.getActiveSourcePresets,
    config.resolveToolUserRoots,
    config.getExcludePatterns
  );
  void sourcesService.getLastSnapshot();

  const graphEnv: GraphPanelEnvironment = {
    getGraphPayload: async () => {
      const snap = await sourcesService.getLastSnapshot();
      const base = buildSourcesSnapshotPayload(
        snap,
        snapshotWorkspaceFolders(),
        config.getActiveSourcePresets
      );
      if (!base) {
        return null;
      }
      return { ...base, artifactCreators: buildArtifactCreatorMenuEntries() };
    },
    runArtifactCreator: async (templateId: string) => {
      const id = (templateId ?? '').trim();
      if (!id) {
        return;
      }
      const creator = findArtifactCreatorById(id);
      if (!creator) {
        void vscode.window.showErrorMessage(`Unknown artifact template: ${id}`);
        return;
      }
      if (creator.locality === 'workspace') {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders?.length) {
          void vscode.window.showErrorMessage(
            'Open a folder or workspace to create workspace-scoped artifacts.'
          );
          return;
        }
      }
      const roots = config.resolveToolUserRoots(os.homedir());
      const workspaceRoot = inferWorkspaceRoot();
      const planned = await creator.run({ workspaceRoot, roots });
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
    },
  };

  // Auto-detect file creation/change/deletion for preset-matched files.
  context.subscriptions.push(
    createSourceFileWatcher({
      onFilesChanged: () => {
        void vscode.commands.executeCommand('akashi.sources.refresh');
      },
    })
  );

  const disposables = [
    ...registerGraphUi(context, graphEnv, config.generalConfig),
    vscode.commands.registerCommand(
      'akashi.sources.createArtifact',
      async (args: {
        templateId: string;
        userInput: string;
        workspaceRoot: string;
        hookLifecycleEvent?: string;
        hookMatcher?: string;
        description?: string;
      }) => {
        const creator = findArtifactCreatorById(args?.templateId);
        if (!creator) {
          void vscode.window.showErrorMessage(`Unknown artifact template: ${args?.templateId}`);
          return;
        }
        const roots = config.resolveToolUserRoots(os.homedir());
        const planned = creator.planWithProvidedInput(
          { workspaceRoot: args.workspaceRoot ?? '', roots },
          {
            userInput: (args.userInput ?? '').trim(),
            hookLifecycleEvent: args.hookLifecycleEvent,
            hookMatcher: args.hookMatcher,
            description: args.description,
          }
        );
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
    ),
    vscode.commands.registerCommand('akashi.sources.newArtifact', async () => {
      await runNewArtifactWizard(config.getActiveSourcePresets, config.resolveToolUserRoots);
    }),
    vscode.window.registerWebviewViewProvider(
      'akashi.sidebar',
      createSidebarViewProvider(context, sourcesService, config, {
        onAfterSourcesSnapshotRefreshed: () => {
          void Graph2DPanel.refreshIfOpen(graphEnv);
        },
        onFilterChanged: (matchedPaths) => {
          Graph2DPanel.pushFilterIfOpen(matchedPaths);
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
