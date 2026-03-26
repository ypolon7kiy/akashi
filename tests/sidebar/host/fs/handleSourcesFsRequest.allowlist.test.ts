import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockWorkspaceFolders: { uri: { fsPath: string }; name: string; index: number }[] = [];
let mockHome = '/home/tester';

vi.mock('node:os', () => ({
  homedir: (): string => mockHome,
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
  },
}));

// SUT import after `vi.mock` blocks so the module loads with mocked `vscode` / `node:os` (Vitest hoists mocks).
import { isPathAllowedForSidebarFs } from '@src/sidebar/host/fs/handleSourcesFsRequest';

describe('isPathAllowedForSidebarFs', () => {
  beforeEach(() => {
    mockWorkspaceFolders.length = 0;
    mockHome = '/home/tester';
  });

  afterEach(() => {
    mockWorkspaceFolders.length = 0;
  });

  it('allows paths inside an open workspace folder', () => {
    mockWorkspaceFolders.push({ uri: { fsPath: '/projects/app' }, name: 'app', index: 0 });
    expect(isPathAllowedForSidebarFs('/projects/app/src/foo.ts')).toBe(true);
    expect(isPathAllowedForSidebarFs('/projects/app')).toBe(true);
  });

  it('denies paths outside workspace when workspace is open', () => {
    mockWorkspaceFolders.push({ uri: { fsPath: '/projects/app' }, name: 'app', index: 0 });
    expect(isPathAllowedForSidebarFs('/other/outside')).toBe(false);
  });

  it('allows paths under home when outside workspace', () => {
    mockWorkspaceFolders.push({ uri: { fsPath: '/projects/app' }, name: 'app', index: 0 });
    expect(isPathAllowedForSidebarFs('/home/tester/.config/akashi/x.md')).toBe(true);
  });

  it('denies paths outside workspace and outside home', () => {
    mockWorkspaceFolders.push({ uri: { fsPath: '/projects/app' }, name: 'app', index: 0 });
    expect(isPathAllowedForSidebarFs('/tmp/not-home')).toBe(false);
  });

  it('allows home paths when no workspace folder is open', () => {
    mockWorkspaceFolders.length = 0;
    expect(isPathAllowedForSidebarFs('/home/tester/.bashrc')).toBe(true);
  });

  it('denies non-home paths when no workspace is open', () => {
    mockWorkspaceFolders.length = 0;
    expect(isPathAllowedForSidebarFs('/tmp/x')).toBe(false);
  });
});
