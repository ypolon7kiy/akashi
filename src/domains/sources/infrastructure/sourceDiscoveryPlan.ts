import type { Dirent } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { SourceCategory } from '../domain/model';
import type { SourcePresetId } from '../../../shared/sourcePresetId';
import { SOURCE_RECORD_ID_FIELD_SEP } from '../../../shared/sourceRecordId';
import { HOME_PATH_TASKS, WORKSPACE_GLOB_SCAN_ROWS } from '../registerSourcePresets';

export interface CollectHomeSourcePathsOptions {
  readonly claudeUserRoot: string;
  readonly cursorUserRoot: string;
  readonly geminiUserRoot: string;
  readonly codexUserRoot: string;
  readonly skipDirNames: ReadonlySet<string>;
}

export interface HomeDiscoveredPath {
  readonly path: string;
  readonly presetId: SourcePresetId;
  readonly category: SourceCategory;
}

export { WORKSPACE_GLOB_SCAN_ROWS };

export function selectWorkspaceGlobRows(
  activePresets: ReadonlySet<SourcePresetId>
): typeof WORKSPACE_GLOB_SCAN_ROWS {
  return WORKSPACE_GLOB_SCAN_ROWS.filter((row) => activePresets.has(row.presetId));
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

async function collectFilesRecursiveUnderDir(
  rootDir: string,
  skipDirNames: ReadonlySet<string>
): Promise<string[]> {
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
        if (skipDirNames.has(e.name)) {
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

async function collectSkillMdRecursiveUnderDir(
  rootDir: string,
  skipDirNames: ReadonlySet<string>
): Promise<string[]> {
  const all = await collectFilesRecursiveUnderDir(rootDir, skipDirNames);
  return all.filter((p) => path.basename(p).toLowerCase() === 'skill.md');
}

/**
 * Absolute paths under the user home directory when `includeHomeConfig` is true,
 * each tagged with owning preset and category. Runs {@link HOME_PATH_TASKS} concurrently.
 */
export async function collectHomeSourcePaths(
  homeDir: string,
  activePresets: ReadonlySet<SourcePresetId>,
  options: CollectHomeSourcePathsOptions
): Promise<HomeDiscoveredPath[]> {
  const out: HomeDiscoveredPath[] = [];
  const seen = new Set<string>();

  const add = (p: string, presetId: SourcePresetId, category: SourceCategory): void => {
    const key = `${presetId}${SOURCE_RECORD_ID_FIELD_SEP}${p}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ path: p, presetId, category });
    }
  };

  const { skipDirNames } = options;

  const ctx = {
    homeDir,
    activePresets,
    roots: {
      claudeUserRoot: options.claudeUserRoot,
      cursorUserRoot: options.cursorUserRoot,
      geminiUserRoot: options.geminiUserRoot,
      codexUserRoot: options.codexUserRoot,
    },
    add,
    fileExists,
    collectShallowFilesWithSuffix,
    collectFilesRecursiveUnderDir: (rootDir: string) =>
      collectFilesRecursiveUnderDir(rootDir, skipDirNames),
    collectSkillMdRecursiveUnderDir: (rootDir: string) =>
      collectSkillMdRecursiveUnderDir(rootDir, skipDirNames),
  };

  await Promise.all(HOME_PATH_TASKS.map((task) => task(ctx)));

  return out;
}
