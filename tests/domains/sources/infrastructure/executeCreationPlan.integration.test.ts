import * as path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  const { createRequire } = require('node:module') as typeof import('node:module');
  const { fileURLToPath } = require('node:url') as typeof import('node:url');
  const hr = createRequire(fileURLToPath(import.meta.url));
  const {
    createInMemoryWorkspaceFs,
    createWorkspaceFolderFixture,
    TestFileSystemError,
    TestFileType,
  } = hr('../../../helpers/inMemoryVscodeFs.ts') as typeof import('../../../helpers/inMemoryVscodeFs');
  const mem = createInMemoryWorkspaceFs();
  const fixture = createWorkspaceFolderFixture({ workspaceRoot: '/ws', homeDir: '/home/tester' });
  const showWarningMessage = vi.fn();
  return { ...mem, fixture, showWarningMessage, TestFileSystemError, TestFileType };
});

vi.mock('node:os', () => ({
  homedir: (): string => hoisted.fixture.homeDir,
}));

vi.mock('vscode', () => ({
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
}));

import { executeCreationPlan } from '@src/domains/sources/infrastructure/executeCreationPlan';

describe('executeCreationPlan (integration)', () => {
  beforeEach(() => {
    hoisted.api.clear();
    hoisted.showWarningMessage.mockReset();
    hoisted.api.mkdirp('/ws');
  });

  it('writes a new file under workspace and returns openPath', async () => {
    const plan = {
      operations: [
        {
          type: 'writeFile' as const,
          absolutePath: '/ws/new-artifact.md',
          content: '# hello\n',
        },
      ],
    };
    const r = await executeCreationPlan(plan);
    expect(r).toEqual({ ok: true, openPath: '/ws/new-artifact.md' });
    expect(hoisted.api.readFileText('/ws/new-artifact.md')).toBe('# hello\n');
  });

  it('rejects when path is outside workspace and home', async () => {
    const plan = {
      operations: [
        {
          type: 'writeFile' as const,
          absolutePath: '/etc/passwd',
          content: 'x',
        },
      ],
    };
    const r = await executeCreationPlan(plan);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/Path not allowed/);
  });

  it('fails writeFile when file already exists', async () => {
    hoisted.api.writeFileText('/ws/exists.md', 'old');
    const plan = {
      operations: [
        {
          type: 'writeFile' as const,
          absolutePath: '/ws/exists.md',
          content: 'new',
        },
      ],
    };
    const r = await executeCreationPlan(plan);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toMatch(/Already exists/);
  });

  it('merges JSON when user continues', async () => {
    hoisted.showWarningMessage.mockResolvedValue('Continue' as unknown as string);
    hoisted.api.writeFileText('/ws/config.json', JSON.stringify({ a: 1 }));
    const plan = {
      operations: [
        {
          type: 'jsonMerge' as const,
          absolutePath: '/ws/config.json',
          jsonPath: '',
          value: { b: 2 },
          description: 'merge test',
        },
      ],
    };
    const r = await executeCreationPlan(plan);
    expect(r).toEqual({ ok: true, openPath: undefined });
    const parsed = JSON.parse(hoisted.api.readFileText('/ws/config.json')!) as Record<string, unknown>;
    expect(parsed.a).toBe(1);
    expect(parsed.b).toBe(2);
  });

  it('returns error when user cancels JSON merge', async () => {
    hoisted.showWarningMessage.mockResolvedValue(undefined);
    hoisted.api.writeFileText('/ws/hooks.json', '{}');
    const plan = {
      operations: [
        {
          type: 'jsonMerge' as const,
          absolutePath: '/ws/hooks.json',
          jsonPath: '',
          value: { x: 1 },
          description: 'd',
        },
      ],
    };
    const r = await executeCreationPlan(plan);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('Cancelled.');
  });
});
