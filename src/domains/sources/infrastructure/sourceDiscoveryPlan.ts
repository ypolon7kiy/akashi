import type { Dirent } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { SourceKind as SourceKindType } from '../domain/model';
import { HOME_PATH_TASKS, WORKSPACE_GLOB_DEFINITIONS } from '../registerSourcePresets';

export interface CollectHomeSourcePathsOptions {
  readonly claudeUserRoot: string;
  readonly cursorUserRoot: string;
  readonly geminiUserRoot: string;
  readonly codexUserRoot: string;
}

export { WORKSPACE_GLOB_DEFINITIONS };

const SKIP_DIR_NAMES = new Set(['node_modules', '.git', 'dist']);

export function kindsIntersect(
  allowed: ReadonlySet<SourceKindType>,
  probeKinds: readonly SourceKindType[]
): boolean {
  return probeKinds.some((k) => allowed.has(k));
}

export function selectWorkspaceGlobs(allowedKinds: ReadonlySet<SourceKindType>): string[] {
  return WORKSPACE_GLOB_DEFINITIONS.filter((row) => kindsIntersect(allowedKinds, row.kinds)).map(
    (row) => row.glob
  );
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

async function collectFilesRecursiveUnderDir(rootDir: string): Promise<string[]> {
  const out: string[] = [];
  const stack: string[] = [rootDir];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries: Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (SKIP_DIR_NAMES.has(e.name)) {
          continue;
        }
        stack.push(full);
      } else if (e.isFile()) {
        out.push(full);
      }
    }
  }
  return out;
}

async function collectShallowFilesWithSuffix(dir: string, suffix: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(suffix))
      .map((e) => path.join(dir, e.name));
  } catch {
    return [];
  }
}

async function collectSkillMdRecursiveUnderDir(rootDir: string): Promise<string[]> {
  const all = await collectFilesRecursiveUnderDir(rootDir);
  return all.filter((p) => path.basename(p).toLowerCase() === 'skill.md');
}

/**
 * Absolute paths under the user home directory to scan when `includeHomeConfig` is true,
 * filtered by {@link allowedKinds}. Runs {@link HOME_PATH_TASKS} concurrently (`Promise.all`)
 * then returns the deduped path list.
 */
export async function collectHomeSourcePaths(
  homeDir: string,
  allowedKinds: ReadonlySet<SourceKindType>,
  options: CollectHomeSourcePathsOptions
): Promise<string[]> {
  const paths: string[] = [];
  const seen = new Set<string>();

  const add = (p: string): void => {
    if (!seen.has(p)) {
      seen.add(p);
      paths.push(p);
    }
  };

  const ctx = {
    homeDir,
    allowedKinds,
    roots: {
      claudeUserRoot: options.claudeUserRoot,
      cursorUserRoot: options.cursorUserRoot,
      geminiUserRoot: options.geminiUserRoot,
      codexUserRoot: options.codexUserRoot,
    },
    add,
    fileExists,
    collectShallowFilesWithSuffix,
    collectFilesRecursiveUnderDir,
    collectSkillMdRecursiveUnderDir,
  };

  await Promise.all(HOME_PATH_TASKS.map((task) => task(ctx)));

  return paths;
}
