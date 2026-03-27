import * as os from 'node:os';
import * as vscode from 'vscode';
import type { GraphPanelEnvironment } from './domains/graph/ui/graphPanelEnvironment';
import { Graph2DPanel, registerGraphUi } from './domains/graph/ui/register';
import type { AddonsPanelEnvironment, ProgressReporter } from './domains/addons/ui/addonsPanelEnvironment';
import { AddonsPanel, registerAddonsUi } from './domains/addons/ui/register';
import { AddonsService } from './domains/addons/application/AddonsService';
import { VscodeAddonsStore } from './domains/addons/infrastructure/VscodeAddonsStore';
import { AkashiMetaFileStore } from './domains/addons/infrastructure/AkashiMetaFileStore';
import { fetchMarketplaceJson } from './domains/addons/infrastructure/MarketplaceFetcher';
import { installFromMarketplace, installViaCreator, removeTrackedFiles, removeDirectory } from './domains/addons/infrastructure/CreatorBasedInstaller';
import type { AddonsCatalogPayload } from './shared/types/addonsCatalogPayload';
import type { OriginSource } from './domains/addons/domain/marketplaceOrigin';
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
import { inferWorkspaceRoot, pickWorkspaceRoot } from './sidebar/host/inferWorkspaceRoot';
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

  // ── Addons domain wiring ───────────────────────────────────────────
  const addonsStore = new VscodeAddonsStore(context);
  const metaStore = new AkashiMetaFileStore();
  const addonsService = new AddonsService(
    sourcesService,
    addonsStore,
    { fetch: fetchMarketplaceJson },
    { installFromMarketplace, installViaCreator, removeTrackedFiles, removeDirectory },
    metaStore
  );

  const addonsEnv: AddonsPanelEnvironment = {
    getAddonsCatalog: async () => {
      const roots = config.resolveToolUserRoots(os.homedir());
      const workspaceRoot = inferWorkspaceRoot();
      const catalog = await addonsService.getCatalog('claude', workspaceRoot, roots);
      if (!catalog) {
        return null;
      }
      // Map domain types to shared DTOs (shapes are nearly identical)
      const payload: AddonsCatalogPayload = {
        generatedAt: catalog.generatedAt,
        presetId: catalog.presetId,
        records: catalog.records.map((r) => ({
          id: r.id,
          path: r.path,
          preset: r.preset,
          category: r.category,
          locality: r.locality,
          tags: [...r.tags],
          metadata: r.metadata,
        })),
        artifacts: catalog.artifacts.map((a) => ({
          id: a.id,
          presetId: a.presetId,
          category: a.category,
          locality: a.locality,
          shape: a.shape,
          memberRecordIds: [...a.memberRecordIds],
          primaryPath: a.primaryPath,
        })),
        catalogPlugins: catalog.catalogPlugins,
        origins: catalog.origins,
      };
      return payload;
    },
    openAddonFile: async (path: string) => {
      try {
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(path));
        await vscode.window.showTextDocument(doc);
      } catch {
        void vscode.window.showInformationMessage(`Could not open: ${path}`);
      }
    },
    addOrigin: async (label: string, source: { kind: string; value: string }) => {
      let originSource: OriginSource;
      if (source.kind === 'github') {
        const parts = source.value.split('/');
        originSource = { kind: 'github', owner: parts[0] ?? '', repo: parts[1] ?? '' };
      } else if (source.kind === 'url') {
        originSource = { kind: 'url', url: source.value };
      } else {
        originSource = { kind: 'file', path: source.value };
      }
      await addonsService.addOrigin(label, originSource);
    },
    removeOrigin: async (originId: string) => {
      await addonsService.removeOrigin(originId);
    },
    toggleOrigin: async (originId: string, enabled: boolean) => {
      await addonsService.toggleOrigin(originId, enabled);
    },
    fetchOrigin: async (originId: string) => {
      const origins = addonsService.getOrigins();
      const origin = origins.find((o) => o.id === originId);
      if (!origin) return;
      try {
        await addonsService.fetchOriginCatalog(origin);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        void vscode.window.showErrorMessage(`Fetch failed: ${msg}`);
      }
    },
    installPlugin: async (pluginId: string, locality: 'workspace' | 'user', onProgress?: ProgressReporter) => {
      const roots = config.resolveToolUserRoots(os.homedir());
      let workspaceRoot: string;
      if (locality === 'workspace') {
        const picked = await pickWorkspaceRoot();
        if (!picked) {
          return { ok: false, error: 'Open a folder or workspace to install project-scoped addons.' };
        }
        workspaceRoot = picked;
      } else {
        workspaceRoot = inferWorkspaceRoot();
      }
      onProgress?.('Resolving plugin from catalog\u2026');
      const catalog = await addonsService.getCatalog('claude', workspaceRoot, roots);
      const plugin = catalog?.catalogPlugins.find((p) => p.id === pluginId);
      if (!plugin) {
        return { ok: false, error: 'Plugin not found in catalog' };
      }
      const result = await addonsService.installPlugin(plugin, locality, workspaceRoot, roots, onProgress);
      if (result.ok) {
        onProgress?.('Refreshing source index\u2026');
        await vscode.commands.executeCommand('akashi.sources.refresh');
      }
      return result;
    },
    deleteAddon: async (primaryPath?: string, pluginId?: string, onProgress?: ProgressReporter) => {
      const roots = config.resolveToolUserRoots(os.homedir());
      const workspaceRoot = inferWorkspaceRoot();
      onProgress?.('Removing addon files\u2026');
      const result = await addonsService.deleteAddon(workspaceRoot, roots, primaryPath, pluginId, onProgress);
      if (result.ok) {
        onProgress?.('Refreshing source index\u2026');
        await vscode.commands.executeCommand('akashi.sources.refresh');
      }
      return result;
    },
    moveToGlobal: async (addonId: string, onProgress?: ProgressReporter) => {
      // Find the installed addon's source file
      const roots = config.resolveToolUserRoots(os.homedir());
      const workspaceRoot = inferWorkspaceRoot();
      onProgress?.('Locating addon\u2026');
      const catalog = await addonsService.getCatalog('claude', workspaceRoot, roots);
      // Look up in artifacts first, then records
      const artifact = catalog?.artifacts.find((a) => a.id === addonId);
      const record = artifact
        ? { path: artifact.primaryPath, locality: artifact.locality }
        : catalog?.records.find((r) => r.id === addonId);
      if (!record) {
        return { ok: false, error: 'Addon not found' };
      }
      const addon = { primaryPath: 'path' in record ? record.path : artifact!.primaryPath, locality: record.locality };
      if (addon.locality === 'user') {
        return { ok: false, error: 'Already at global scope' };
      }
      // Derive name from path
      const norm = addon.primaryPath.replace(/\\/g, '/');
      const addonName = norm.endsWith('/SKILL.md')
        ? norm.slice(norm.slice(0, norm.lastIndexOf('/')).lastIndexOf('/') + 1, norm.lastIndexOf('/'))
        : norm.slice(norm.lastIndexOf('/') + 1).replace(/\.\w+$/, '');
      // Read the source file content
      try {
        onProgress?.(`Reading ${addon.primaryPath}\u2026`);
        const sourceUri = vscode.Uri.file(addon.primaryPath);
        const content = await vscode.workspace.fs.readFile(sourceUri);
        const textContent = new TextDecoder().decode(content);
        // Install at global scope via the creator infrastructure
        onProgress?.(`Creating global copy of "${addonName}"\u2026`);
        const { installViaCreator: install } = await import('./domains/addons/infrastructure/CreatorBasedInstaller');
        const creatorId = `claude/skill-folder/user`;
        const installResult = await install(creatorId, addonName, '', '', roots);
        if (!installResult.ok) {
          return { ok: false, error: installResult.error };
        }
        // If the creator-generated content is just a stub, overwrite with the original content
        if (installResult.createdPaths.length > 0 && textContent.length > 0) {
          onProgress?.(`Writing to ${installResult.createdPaths[0]}\u2026`);
          await vscode.workspace.fs.writeFile(
            vscode.Uri.file(installResult.createdPaths[0]),
            new TextEncoder().encode(textContent)
          );
        }
        // Delete the project-local file
        onProgress?.(`Removing project copy ${addon.primaryPath}\u2026`);
        await vscode.workspace.fs.delete(sourceUri);
        // Try to clean up empty parent dir (folder layout)
        try {
          const parentUri = vscode.Uri.file(addon.primaryPath.replace(/[/\\][^/\\]+$/, ''));
          const entries = await vscode.workspace.fs.readDirectory(parentUri);
          if (entries.length === 0) {
            await vscode.workspace.fs.delete(parentUri);
          }
        } catch {
          // Parent dir cleanup is best-effort
        }
        onProgress?.('Refreshing source index\u2026');
        await vscode.commands.executeCommand('akashi.sources.refresh');
        return { ok: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return { ok: false, error: msg };
      }
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
    ...registerAddonsUi(context, addonsEnv),
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
          void AddonsPanel.refreshIfOpen(addonsEnv);
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
      AddonsPanel.createOrShow(context, addonsEnv);
      getLog()?.show(false);
    });
  }
}
