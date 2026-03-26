import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as InMemoryFs from '../../../helpers/inMemoryVscodeFs';

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
  } = hr('../../../helpers/inMemoryVscodeFs.ts') as typeof InMemoryFs;
  const mem = createInMemoryWorkspaceFs();
  const fixture = createWorkspaceFolderFixture({ workspaceRoot: '/ws', homeDir: '/home/tester' });
  const showWarningMessage = vi.fn();
  return { ...mem, fixture, showWarningMessage, TestFileSystemError, TestFileType };
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
    },
    window: {
      showWarningMessage: hoisted.showWarningMessage,
    },
  };
});

import {
  handleSidebarFsCreateFile,
  handleSidebarFsDelete,
  handleSidebarFsRename,
} from '@src/sidebar/host/fs/handleSourcesFsRequest';

const noConfirmWorkbench = {
  isConfirmDragAndDropEnabled: (): boolean => false,
  getDeleteFlowSettings: () => ({ enableTrash: false, confirmDelete: false }),
};

describe('handleSidebarFs* (integration, in-memory fs)', () => {
  beforeEach(() => {
    hoisted.api.clear();
    hoisted.showWarningMessage.mockReset();
    hoisted.api.mkdirp('/ws');
  });

  it('createFile writes empty file under workspace', async () => {
    const r = await handleSidebarFsCreateFile({ parentPath: '/ws', fileName: 'new.md' });
    expect(r).toEqual({ ok: true });
    expect(hoisted.api.has('/ws/new.md')).toBe(true);
    expect(hoisted.api.readFileText('/ws/new.md')).toBe('');
  });

  it('createFile rejects path outside allowlist', async () => {
    const r = await handleSidebarFsCreateFile({ parentPath: '/etc', fileName: 'x.md' });
    expect(r).toEqual({
      ok: false,
      error: 'This path cannot be modified from the Akashi sidebar.',
    });
  });

  it('rename moves file within workspace', async () => {
    hoisted.api.writeFileText('/ws/a.md', 'hi');
    const r = await handleSidebarFsRename(
      { fromPath: '/ws/a.md', toPath: '/ws/b.md' },
      noConfirmWorkbench
    );
    expect(r).toEqual({ ok: true });
    expect(hoisted.api.has('/ws/a.md')).toBe(false);
    expect(hoisted.api.readFileText('/ws/b.md')).toBe('hi');
  });

  it('rename rejects destination outside allowlist', async () => {
    hoisted.api.writeFileText('/ws/a.md', 'x');
    const r = await handleSidebarFsRename(
      { fromPath: '/ws/a.md', toPath: '/etc/b.md' },
      noConfirmWorkbench
    );
    expect(r.ok).toBe(false);
  });

  it('rename rejects moving folder into itself', async () => {
    hoisted.api.mkdirp('/ws/parent/child');
    const r = await handleSidebarFsRename(
      { fromPath: '/ws/parent', toPath: '/ws/parent/child/nested' },
      noConfirmWorkbench
    );
    expect(r).toEqual({
      ok: false,
      error: 'Cannot move a folder into itself or its descendant.',
    });
  });

  it('delete removes file', async () => {
    hoisted.api.writeFileText('/ws/del.md', 'x');
    const r = await handleSidebarFsDelete(
      { path: '/ws/del.md', isDirectory: false },
      noConfirmWorkbench
    );
    expect(r).toEqual({ ok: true });
    expect(hoisted.api.has('/ws/del.md')).toBe(false);
  });

  it('delete shows confirm when configured and maps dismiss to SIDEBAR_FS_CANCELLED', async () => {
    hoisted.api.writeFileText('/ws/z.md', 'z');
    hoisted.showWarningMessage.mockResolvedValue(undefined);
    const workbench = {
      isConfirmDragAndDropEnabled: (): boolean => false,
      getDeleteFlowSettings: () => ({ enableTrash: true, confirmDelete: true }),
    };
    const r = await handleSidebarFsDelete({ path: '/ws/z.md', isDirectory: false }, workbench);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('SIDEBAR_FS_CANCELLED');
    expect(hoisted.api.has('/ws/z.md')).toBe(true);
  });
});
