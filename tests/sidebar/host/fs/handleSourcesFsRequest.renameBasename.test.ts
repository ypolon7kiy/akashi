import * as path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWorkspaceFolders: { uri: { fsPath: string }; name: string; index: number }[] = [];

const { mockFsStat, mockFsRename } = vi.hoisted(() => ({
  mockFsStat: vi.fn(),
  mockFsRename: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: (): string => '/home/tester',
}));

vi.mock('vscode', () => ({
  Uri: {
    file: (p: string): { fsPath: string } => ({ fsPath: path.normalize(p) }),
  },
  workspace: {
    get workspaceFolders(): typeof mockWorkspaceFolders {
      return mockWorkspaceFolders;
    },
    getWorkspaceFolder(uri: { fsPath: string }): { uri: { fsPath: string } } | undefined {
      for (const f of mockWorkspaceFolders) {
        const root = f.uri.fsPath;
        const rel = path.relative(root, uri.fsPath);
        if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) {
          return { uri: f.uri };
        }
      }
      return undefined;
    },
    fs: {
      stat: mockFsStat,
      rename: mockFsRename,
    },
  },
}));

import { handleSidebarFsRename } from '@src/sidebar/host/fs/handleSourcesFsRequest';

const workbenchFs = {
  isConfirmDragAndDropEnabled: (): boolean => true,
  getDeleteFlowSettings: () => ({ enableTrash: true, confirmDelete: true }),
};

describe('handleSidebarFsRename (destination basename)', () => {
  beforeEach(() => {
    mockWorkspaceFolders.length = 0;
    mockWorkspaceFolders.push({ uri: { fsPath: '/projects/app' }, name: 'app', index: 0 });
    mockFsStat.mockReset();
    mockFsRename.mockReset();
  });

  it('rejects invalid destination names before touching workspace.fs', async () => {
    const out = await handleSidebarFsRename(
      {
        fromPath: '/projects/app/a.md',
        toPath: '/projects/app/bad|name.md',
      },
      workbenchFs
    );

    expect(out).toEqual({
      ok: false,
      error: 'Name cannot contain / \\ : * ? " < > |',
    });
    expect(mockFsStat).not.toHaveBeenCalled();
    expect(mockFsRename).not.toHaveBeenCalled();
  });
});
