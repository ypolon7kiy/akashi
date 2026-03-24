/**
 * In-memory vscode.workspace.fs for Vitest integration tests.
 * Paths are normalized with path.normalize (use POSIX-style roots like /ws/... in tests).
 */
import * as path from 'node:path';

/** Thrown by the in-memory fs; mock `vscode.FileSystemError` to this class so `instanceof` matches production code. */
export class TestFileSystemError extends Error {
  readonly code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.name = 'FileSystemError';
    this.code = code;
  }
}

export const TestFileType = {
  Unknown: 0,
  File: 1,
  Directory: 2,
  SymbolicLink: 64,
} as const;

type Entry = { kind: 'file'; bytes: Uint8Array } | { kind: 'dir' };

export interface InMemoryWorkspaceFsApi {
  /** Remove all entries (call between tests when reusing a hoisted fs). */
  clear(): void;
  mkdirp(dirPath: string): void;
  writeFileText(filePath: string, text: string): void;
  has(fsPath: string): boolean;
  readFileText(fsPath: string): string | null;
}

/**
 * Creates workspace.fs-compatible async methods plus helpers to seed the tree.
 */
export function createInMemoryWorkspaceFs(): {
  fs: {
    stat(uri: { fsPath: string }): Promise<{
      type: number;
      ctime: number;
      mtime: number;
      size: number;
    }>;
    readFile(uri: { fsPath: string }): Promise<Uint8Array>;
    writeFile(uri: { fsPath: string }, content: Uint8Array): Promise<void>;
    createDirectory(uri: { fsPath: string }): Promise<void>;
    rename(
      from: { fsPath: string },
      to: { fsPath: string },
      opts?: { overwrite?: boolean }
    ): Promise<void>;
    delete(uri: { fsPath: string }, opts?: { recursive?: boolean; useTrash?: boolean }): Promise<void>;
  };
  api: InMemoryWorkspaceFsApi;
} {
  const entries = new Map<string, Entry>();

  const n = (p: string) => path.normalize(p);

  function notFound(): never {
    throw new TestFileSystemError('FileNotFound');
  }

  function ensureDirChain(dirPath: string): void {
    const nd = n(dirPath);
    if (nd === '/' || nd === '') {
      return;
    }
    const stack: string[] = [];
    let cur = nd;
    while (true) {
      if (entries.has(cur) && entries.get(cur)!.kind === 'dir') {
        break;
      }
      stack.push(cur);
      const parent = path.dirname(cur);
      if (parent === cur) {
        break;
      }
      cur = parent;
    }
    while (stack.length) {
      const d = stack.pop()!;
      const existing = entries.get(d);
      if (!existing) {
        entries.set(d, { kind: 'dir' });
      } else if (existing.kind !== 'dir') {
        throw new Error(`inMemoryFs: cannot create dir over file: ${d}`);
      }
    }
  }

  const api: InMemoryWorkspaceFsApi = {
    clear() {
      entries.clear();
    },
    mkdirp(dirPath: string) {
      ensureDirChain(dirPath);
      entries.set(n(dirPath), { kind: 'dir' });
    },
    writeFileText(filePath: string, text: string) {
      const p = n(filePath);
      ensureDirChain(path.dirname(p));
      entries.set(p, { kind: 'file', bytes: Buffer.from(text, 'utf8') });
    },
    has(fsPath: string) {
      return entries.has(n(fsPath));
    },
    readFileText(fsPath: string) {
      const e = entries.get(n(fsPath));
      if (!e || e.kind !== 'file') {
        return null;
      }
      return Buffer.from(e.bytes).toString('utf8');
    },
  };

  const fs = {
    async stat(uri: { fsPath: string }) {
      const p = n(uri.fsPath);
      const e = entries.get(p);
      if (!e) {
        notFound();
      }
      if (e.kind === 'dir') {
        return { type: TestFileType.Directory, ctime: 0, mtime: 0, size: 0 };
      }
      return { type: TestFileType.File, ctime: 0, mtime: 0, size: e.bytes.length };
    },

    async readFile(uri: { fsPath: string }) {
      const p = n(uri.fsPath);
      const e = entries.get(p);
      if (!e || e.kind !== 'file') {
        notFound();
      }
      return new Uint8Array(e.bytes);
    },

    async writeFile(uri: { fsPath: string }, content: Uint8Array) {
      const p = n(uri.fsPath);
      ensureDirChain(path.dirname(p));
      entries.set(p, { kind: 'file', bytes: new Uint8Array(content) });
    },

    async createDirectory(uri: { fsPath: string }) {
      const p = n(uri.fsPath);
      ensureDirChain(path.dirname(p));
      entries.set(p, { kind: 'dir' });
    },

    async rename(
      fromUri: { fsPath: string },
      toUri: { fsPath: string },
      _opts?: { overwrite?: boolean }
    ) {
      const a = n(fromUri.fsPath);
      const b = n(toUri.fsPath);
      const e = entries.get(a);
      if (!e) {
        notFound();
      }
      if (entries.has(b)) {
        throw new TestFileSystemError('FileExists');
      }
      ensureDirChain(path.dirname(b));

      const affectedKeys = [...entries.keys()].filter(
        (k) => k === a || k.startsWith(a + path.sep)
      );
      const pairs: { oldK: string; ent: Entry; newK: string }[] = [];
      for (const oldK of affectedKeys) {
        const ent = entries.get(oldK)!;
        const newK = oldK === a ? b : b + oldK.slice(a.length);
        pairs.push({ oldK, ent, newK });
      }
      for (const { oldK } of pairs) {
        entries.delete(oldK);
      }
      for (const { newK, ent } of pairs) {
        entries.set(newK, ent);
      }
    },

    async delete(uri: { fsPath: string }, opts?: { recursive?: boolean; useTrash?: boolean }) {
      const p = n(uri.fsPath);
      const e = entries.get(p);
      if (!e) {
        notFound();
      }
      if (e.kind === 'file') {
        entries.delete(p);
        return;
      }
      if (opts?.recursive) {
        const prefix = p.endsWith(path.sep) ? p : p + path.sep;
        for (const k of [...entries.keys()].sort((a, b) => b.length - a.length)) {
          if (k === p || k.startsWith(prefix)) {
            entries.delete(k);
          }
        }
      } else {
        const prefix = p.endsWith(path.sep) ? p : p + path.sep;
        for (const k of entries.keys()) {
          if (k.startsWith(prefix) && k !== p) {
            throw new Error('Directory not empty');
          }
        }
        entries.delete(p);
      }
    },
  };

  return { fs, api };
}

export interface StandardWorkspaceFixtureOptions {
  workspaceRoot?: string;
  homeDir?: string;
  workspaceFolders?: { uri: { fsPath: string }; name: string; index: number }[];
}

/**
 * Builds vscode workspace folder + getWorkspaceFolder behavior for isPathAllowedForWorkspaceOrHome.
 */
export function createWorkspaceFolderFixture(opts: StandardWorkspaceFixtureOptions) {
  const workspaceRoot = path.normalize(opts.workspaceRoot ?? '/ws');
  const homeDir = path.normalize(opts.homeDir ?? '/home/tester');
  const folders =
    opts.workspaceFolders ??
    [{ uri: { fsPath: workspaceRoot }, name: 'ws', index: 0 }];

  function getWorkspaceFolder(uri: { fsPath: string }): { uri: { fsPath: string } } | undefined {
    const fp = path.normalize(uri.fsPath);
    for (const f of folders) {
      const root = path.normalize(f.uri.fsPath);
      if (fp === root) {
        return { uri: f.uri };
      }
      const rel = path.relative(root, fp);
      if (rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)) {
        return { uri: f.uri };
      }
    }
    return undefined;
  }

  return {
    workspaceRoot,
    homeDir,
    workspaceFolders: folders,
    getWorkspaceFolder,
  };
}
