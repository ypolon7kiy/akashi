import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SourcesService } from '@src/domains/sources/application/SourcesService';
import type { SourceIndexSnapshot } from '@src/domains/sources/domain/model';
import { SourceCategoryId } from '@src/domains/sources/domain/sourceTags';
import { buildSourceFacetTags } from '@src/domains/sources/domain/sourceTags';
import { sourceRecordId } from '@src/shared/sourceRecordId';
import { isSourcesSnapshotPayload } from '@src/sidebar/bridge/sourceDescriptor';
import { SidebarMessageType } from '@src/sidebar/bridge/messages';
import type * as InMemoryFs from '../../helpers/inMemoryVscodeFs';

const hoisted = vi.hoisted(() => {
  /* Vitest hoisted() runs before ESM bindings init; CommonJS require is required here. */
  /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports */
  const { createRequire } = require('node:module') as typeof import('node:module');
  const { fileURLToPath } = require('node:url') as typeof import('node:url');
  /* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports */
  const hr = createRequire(fileURLToPath(import.meta.url));
  const {
    createInMemoryWorkspaceFs,
    createWorkspaceFolderFixture,
    TestFileSystemError,
    TestFileType,
  } = hr('../../helpers/inMemoryVscodeFs.ts') as typeof InMemoryFs;
  const mem = createInMemoryWorkspaceFs();
  const fixture = createWorkspaceFolderFixture({ workspaceRoot: '/ws', homeDir: '/home/tester' });
  return { ...mem, fixture, TestFileSystemError, TestFileType };
});

vi.mock('node:os', () => ({
  homedir: (): string => hoisted.fixture.homeDir,
}));

vi.mock('vscode', async () => {
  const path = await import('node:path');
  return {
    Uri: {
      file: (p: string): { fsPath: string; scheme: string } => ({
        fsPath: path.normalize(p),
        scheme: 'file',
      }),
    },
    FileSystemError: hoisted.TestFileSystemError,
    FileType: hoisted.TestFileType,
    workspace: {
      fs: hoisted.fs,
      get workspaceFolders() {
        return hoisted.fixture.workspaceFolders;
      },
      getWorkspaceFolder: (uri: { fsPath: string }) => hoisted.fixture.getWorkspaceFolder(uri),
      openTextDocument: vi.fn().mockResolvedValue({}),
    },
    window: {
      showTextDocument: vi.fn().mockResolvedValue({}),
      showWarningMessage: vi.fn(),
      showErrorMessage: vi.fn(),
    },
    commands: {
      executeCommand: vi.fn(),
    },
  };
});

vi.mock('@src/log', () => ({
  appendLine: vi.fn(),
  initLog: vi.fn(),
  getLog: vi.fn(),
}));

import { handleSidebarWebviewMessage } from '@src/sidebar/host/handleSidebarWebviewMessage';
import { createSidebarSourcesHostActions } from '@src/sidebar/host/sidebarSourcesHostActions';

const STAT = { byteLength: 10, updatedAt: '2025-01-01T00:00:00.000Z' };

function makeService() {
  const scanner = {
    scanWorkspace: vi.fn(() =>
      Promise.resolve([
        {
          id: sourceRecordId('cursor', 'workspace', '/ws/.cursor/rules/x.mdc'),
          path: '/ws/.cursor/rules/x.mdc',
          preset: 'cursor' as const,
          category: SourceCategoryId.Rule,
          locality: 'workspace' as const,
          tags: buildSourceFacetTags({
            category: SourceCategoryId.Rule,
            preset: 'cursor',
            locality: 'workspace',
          }),
        },
      ])
    ),
  };
  const fileStats = { statFile: vi.fn(() => Promise.resolve(STAT)) };
  let persisted: SourceIndexSnapshot | null = null;
  const snapshotStore = {
    load: vi.fn(() => Promise.resolve(persisted)),
    save: vi.fn((s: SourceIndexSnapshot) => {
      persisted = s;
      return Promise.resolve();
    }),
  };
  const service = new SourcesService(
    scanner,
    fileStats,
    snapshotStore,
    { info: vi.fn() },
    () => new Set(['cursor'])
  );
  return { service, scanner, snapshotStore };
}

describe('handleSidebarWebviewMessage (integration)', () => {
  beforeEach(() => {
    hoisted.api.clear();
    hoisted.api.mkdirp('/ws');
  });

  it('SourcesGetSnapshotRequest returns payload when snapshot exists', async () => {
    const { service } = makeService();
    await service.indexWorkspace({ includeHomeConfig: false });

    const webview = { postMessage: vi.fn(() => Promise.resolve()) };
    const notify = vi.fn();
    const actions = createSidebarSourcesHostActions({
      sourcesService: service,
      getActiveSourcePresets: () => new Set(['cursor']),
      getIncludeHomeConfig: () => false,
      getWebview: () => webview as never,
      notifySnapshotRefreshed: notify,
    });

    const configDomain = {
      getActiveSourcePresets: () => new Set(['cursor']),
      getIncludeHomeConfig: () => false,
      workbenchFsSettings: {
        isConfirmDragAndDropEnabled: (): boolean => false,
        getDeleteFlowSettings: () => ({ enableTrash: false, confirmDelete: false }),
      },
    } as never;

    await handleSidebarWebviewMessage(
      webview as never,
      {
        type: SidebarMessageType.SourcesGetSnapshotRequest,
        requestId: 'snap-1',
      },
      {
        sourcesService: service,
        configDomain,
        actions,
      }
    );

    const responseCalls = webview.postMessage.mock.calls
      .map((c) => c[0])
      .filter((m) => m.type === SidebarMessageType.SourcesResponse && m.requestId === 'snap-1');
    expect(responseCalls.length).toBe(1);
    const msg = responseCalls[0];
    expect(msg.ok).toBe(true);
    expect(isSourcesSnapshotPayload(msg.payload)).toBe(true);
  });

  it('SourcesIndexWorkspaceRequest runs index and responds with snapshot payload', async () => {
    const { service, scanner } = makeService();
    const webview = { postMessage: vi.fn(() => Promise.resolve()) };
    const actions = createSidebarSourcesHostActions({
      sourcesService: service,
      getActiveSourcePresets: () => new Set(['cursor']),
      getIncludeHomeConfig: () => true,
      getWebview: () => webview as never,
      notifySnapshotRefreshed: vi.fn(),
    });
    const configDomain = {
      getActiveSourcePresets: () => new Set(['cursor']),
      getIncludeHomeConfig: () => true,
      workbenchFsSettings: {
        isConfirmDragAndDropEnabled: (): boolean => false,
        getDeleteFlowSettings: () => ({ enableTrash: false, confirmDelete: false }),
      },
    } as never;

    await handleSidebarWebviewMessage(
      webview as never,
      {
        type: SidebarMessageType.SourcesIndexWorkspaceRequest,
        requestId: 'idx-1',
      },
      {
        sourcesService: service,
        configDomain,
        actions,
      }
    );

    expect(scanner.scanWorkspace).toHaveBeenCalled();
    const responseCalls = webview.postMessage.mock.calls
      .map((c) => c[0])
      .filter((m) => m.type === SidebarMessageType.SourcesResponse && m.requestId === 'idx-1');
    expect(responseCalls.length).toBe(1);
    expect(responseCalls[0].ok).toBe(true);
    expect(isSourcesSnapshotPayload(responseCalls[0].payload)).toBe(true);
  });

  it('SourcesFsCreateFile creates file and ends with SourcesResponse ok', async () => {
    const { service } = makeService();
    const webview = { postMessage: vi.fn(() => Promise.resolve()) };
    const actions = createSidebarSourcesHostActions({
      sourcesService: service,
      getActiveSourcePresets: () => new Set(['cursor']),
      getIncludeHomeConfig: () => false,
      getWebview: () => webview as never,
      notifySnapshotRefreshed: vi.fn(),
    });
    const configDomain = {
      getActiveSourcePresets: () => new Set(['cursor']),
      getIncludeHomeConfig: () => false,
      workbenchFsSettings: {
        isConfirmDragAndDropEnabled: (): boolean => false,
        getDeleteFlowSettings: () => ({ enableTrash: false, confirmDelete: false }),
      },
    } as never;

    await handleSidebarWebviewMessage(
      webview as never,
      {
        type: SidebarMessageType.SourcesFsCreateFile,
        requestId: 'fs-1',
        payload: { parentPath: '/ws', fileName: 'from-webview.md' },
      },
      {
        sourcesService: service,
        configDomain,
        actions,
      }
    );

    expect(hoisted.api.has('/ws/from-webview.md')).toBe(true);
    const final = webview.postMessage.mock.calls
      .map((c) => c[0])
      .filter((m) => m.type === SidebarMessageType.SourcesResponse && m.requestId === 'fs-1');
    expect(final.length).toBeGreaterThanOrEqual(1);
    expect(final[final.length - 1].ok).toBe(true);
  });
});
