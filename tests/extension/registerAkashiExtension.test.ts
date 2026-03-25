import { describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  const createConfigDomain = vi.fn(() => ({
    generalConfig: { getFrozen: vi.fn(() => ({})) },
    getActiveSourcePresets: () => new Set<string>(),
    getIncludeHomeConfig: () => false,
    resolveToolUserRoots: () => ({
      claudeUserRoot: '/h/.claude',
      cursorUserRoot: '/h/.cursor',
      geminiUserRoot: '/h/.gemini',
      codexUserRoot: '/h/.codex',
    }),
    workbenchFsSettings: {
      isConfirmDragAndDropEnabled: (): boolean => false,
      getDeleteFlowSettings: () => ({ enableTrash: false, confirmDelete: false }),
    },
    onIndexingSettingsChanged: () => ({ dispose: vi.fn() }),
  }));
  const createSourcesService = vi.fn(() => ({
    getLastSnapshot: vi.fn(() => Promise.resolve(null)),
    indexWorkspace: vi.fn(() => Promise.resolve()),
  }));
  const registerGraphUi = vi.fn(() => []);
  const graphCreateOrShow = vi.fn();
  const Graph2DPanel = {
    refreshIfOpen: vi.fn(),
    createOrShow: graphCreateOrShow,
  };
  const createSidebarViewProvider = vi.fn(() => ({}));
  const registerCommand = vi.fn(() => ({ dispose: vi.fn() }));
  const registerWebviewViewProvider = vi.fn(() => ({ dispose: vi.fn() }));
  return {
    createConfigDomain,
    createSourcesService,
    registerGraphUi,
    Graph2DPanel,
    graphCreateOrShow,
    createSidebarViewProvider,
    registerCommand,
    registerWebviewViewProvider,
  };
});

vi.mock('../../src/domains/config', () => ({
  createConfigDomain: hoisted.createConfigDomain,
}));

vi.mock('../../src/domains/sources/infrastructure/createSourcesService', () => ({
  createSourcesService: hoisted.createSourcesService,
}));

vi.mock('../../src/domains/graph/ui/register', () => ({
  registerGraphUi: hoisted.registerGraphUi,
  Graph2DPanel: hoisted.Graph2DPanel,
}));

vi.mock('../../src/sidebar/host/SidebarViewProvider', () => ({
  createSidebarViewProvider: hoisted.createSidebarViewProvider,
}));

vi.mock('../../src/sidebar/host/runNewArtifactWizard', () => ({
  runNewArtifactWizard: vi.fn(),
}));

vi.mock('../../src/domains/sources/registerSourcePresets', () => ({
  findArtifactCreatorById: vi.fn(),
  buildArtifactCreatorMenuEntries: vi.fn(() => []),
  buildWatcherGlobPatterns: vi.fn(() => ['**/CLAUDE.md']),
}));

vi.mock('../../src/domains/sources/infrastructure/executeCreationPlan', () => ({
  executeCreationPlan: vi.fn(),
}));

vi.mock('../../src/log', () => ({
  appendLine: vi.fn(),
  getLog: vi.fn(() => undefined),
  initLog: vi.fn(),
}));

vi.mock('vscode', () => ({
  ExtensionMode: { Production: 1, Development: 2 },
  Uri: { file: (p: string) => ({ fsPath: p, scheme: 'file' }) },
  commands: {
    registerCommand: hoisted.registerCommand,
    executeCommand: vi.fn(),
  },
  window: {
    registerWebviewViewProvider: hoisted.registerWebviewViewProvider,
    showErrorMessage: vi.fn(),
    showTextDocument: vi.fn(),
  },
  workspace: {
    openTextDocument: vi.fn(),
    workspaceFolders: undefined,
    createFileSystemWatcher: vi.fn(() => ({
      onDidCreate: vi.fn(),
      onDidChange: vi.fn(),
      onDidDelete: vi.fn(),
      dispose: vi.fn(),
    })),
  },
  Disposable: class {
    constructor(private fn: () => void) {}
    dispose() {
      this.fn();
    }
  },
}));

import * as vscode from 'vscode';
import { registerAkashiExtension } from '../../src/registerAkashiExtension';

describe('registerAkashiExtension', () => {
  it('registers commands and sidebar webview; skips dev-only graph open in Production', async () => {
    hoisted.registerCommand.mockClear();
    hoisted.registerWebviewViewProvider.mockClear();
    hoisted.graphCreateOrShow.mockClear();

    const subscriptions: { dispose: () => void }[] = [];
    const context = {
      subscriptions,
      extensionMode: vscode.ExtensionMode.Production,
      extensionUri: vscode.Uri.file('/ext/akashi'),
    } as vscode.ExtensionContext;

    registerAkashiExtension(context);

    expect(hoisted.createConfigDomain).toHaveBeenCalledWith(context);
    expect(hoisted.createSourcesService).toHaveBeenCalled();
    expect(hoisted.registerCommand).toHaveBeenCalledWith(
      'akashi.sources.createArtifact',
      expect.any(Function)
    );
    expect(hoisted.registerCommand).toHaveBeenCalledWith(
      'akashi.sources.newArtifact',
      expect.any(Function)
    );
    expect(hoisted.registerWebviewViewProvider).toHaveBeenCalledWith(
      'akashi.sidebar',
      expect.anything()
    );
    expect(subscriptions.length).toBeGreaterThan(0);

    await Promise.resolve();
    expect(hoisted.graphCreateOrShow).not.toHaveBeenCalled();
  });
});
