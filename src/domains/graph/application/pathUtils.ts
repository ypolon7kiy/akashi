/**
 * Path helpers for graph layout (browser + Node; no node:path).
 */

export function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}

export function dirnamePath(fsPath: string): string {
  const trimmed = fsPath.replace(/[/\\]+$/, '');
  const match = /^(.*)[/\\][^/\\]+$/.exec(trimmed);
  return match ? match[1] : '';
}

/** True if filePath is rootPath or a path nested under rootPath. */
export function pathIsUnder(filePath: string, rootPath: string): boolean {
  const f = toPosix(filePath).replace(/\/+$/, '');
  const r = toPosix(rootPath).replace(/\/+$/, '');
  if (f === r) {
    return true;
  }
  return f.startsWith(r + '/');
}

export function relativeUnderRoot(rootPath: string, absolutePath: string): string {
  const r = toPosix(rootPath).replace(/\/+$/, '');
  const a = toPosix(absolutePath);
  if (a === r) {
    return '';
  }
  if (!a.startsWith(r + '/')) {
    return '';
  }
  return a.slice(r.length + 1);
}

export function joinRootSegments(rootPath: string, relativePosixParts: string[]): string[] {
  const sep = rootPath.includes('\\') ? '\\' : '/';
  let acc = rootPath.replace(/[/\\]+$/, '');
  const out: string[] = [];
  for (const part of relativePosixParts) {
    acc = acc + sep + part;
    out.push(acc);
  }
  return out;
}

/** Pick longest workspace folder path that contains the file (nested workspaces). */
export function resolveWorkspaceRoot(
  filePath: string,
  workspaceRoots: readonly string[]
): string | null {
  let best: string | null = null;
  for (const r of workspaceRoots) {
    if (!pathIsUnder(filePath, r)) {
      continue;
    }
    if (!best || r.length > best.length) {
      best = r;
    }
  }
  return best;
}
