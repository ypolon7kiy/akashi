import * as path from 'node:path';
import { SourceKind, type SourceKind as SourceKindType } from '../../domain/model';
import type { HomePathTask } from '../../domain/sourcePresetDefinition';

function kindsIntersect(
  allowed: ReadonlySet<SourceKindType>,
  probe: readonly SourceKindType[]
): boolean {
  return probe.some((k) => allowed.has(k));
}

export const antigravityHomePathTasks: readonly HomePathTask[] = [
  async (ctx) => {
    const { allowedKinds, roots, add, fileExists } = ctx;
    if (!kindsIntersect(allowedKinds, [SourceKind.GeminiMd])) {
      return;
    }
    const abs = path.join(roots.geminiUserRoot, 'GEMINI.md');
    if (await fileExists(abs)) {
      add(abs);
    }
  },
  async (ctx) => {
    const { allowedKinds, roots, add, collectSkillMdRecursiveUnderDir } = ctx;
    if (!kindsIntersect(allowedKinds, [SourceKind.GeminiAntigravitySkillMd])) {
      return;
    }
    const antigravitySkills = path.join(roots.geminiUserRoot, 'antigravity', 'skills');
    for (const f of await collectSkillMdRecursiveUnderDir(antigravitySkills)) {
      add(f);
    }
  },
];
