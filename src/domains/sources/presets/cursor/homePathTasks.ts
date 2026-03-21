import * as path from 'node:path';
import { SourceKind, type SourceKind as SourceKindType } from '../../domain/model';
import type { HomePathTask } from '../../domain/sourcePresetDefinition';

function kindsIntersect(
  allowed: ReadonlySet<SourceKindType>,
  probe: readonly SourceKindType[]
): boolean {
  return probe.some((k) => allowed.has(k));
}

export const cursorHomePathTasks: readonly HomePathTask[] = [
  async (ctx) => {
    const { allowedKinds, roots, add, fileExists } = ctx;
    if (!kindsIntersect(allowedKinds, [SourceKind.CursorMcpJson])) {
      return;
    }
    const abs = path.join(roots.cursorUserRoot, 'mcp.json');
    if (await fileExists(abs)) {
      add(abs);
    }
  },
  async (ctx) => {
    const { allowedKinds, roots, add, collectSkillMdRecursiveUnderDir } = ctx;
    if (!kindsIntersect(allowedKinds, [SourceKind.CursorSkillMd])) {
      return;
    }
    const cursorSkills = path.join(roots.cursorUserRoot, 'skills');
    for (const f of await collectSkillMdRecursiveUnderDir(cursorSkills)) {
      add(f);
    }
  },
  async (ctx) => {
    const { allowedKinds, homeDir, add, fileExists } = ctx;
    if (!kindsIntersect(allowedKinds, [SourceKind.CursorLegacyRules])) {
      return;
    }
    const cursorrules = path.join(homeDir, '.cursorrules');
    if (await fileExists(cursorrules)) {
      add(cursorrules);
    }
  },
  async (ctx) => {
    const { allowedKinds, roots, add, collectShallowFilesWithSuffix } = ctx;
    if (!kindsIntersect(allowedKinds, [SourceKind.CursorRulesMdc])) {
      return;
    }
    const rulesDir = path.join(roots.cursorUserRoot, 'rules');
    for (const f of await collectShallowFilesWithSuffix(rulesDir, '.mdc')) {
      add(f);
    }
  },
];
