import * as path from 'node:path';
import type { HomePathTask } from '../../domain/sourcePresetDefinition';
import { SourceCategoryId } from '../../domain/sourceTags';

const PRESET_ID = 'antigravity' as const;

export const antigravityHomePathTasks: readonly HomePathTask[] = [
  async (ctx) => {
    const { activePresets, roots, add, fileExists } = ctx;
    if (!activePresets.has(PRESET_ID)) {
      return;
    }
    const abs = path.join(roots.geminiUserRoot, 'GEMINI.md');
    if (await fileExists(abs)) {
      add(abs, PRESET_ID, SourceCategoryId.LlmGuideline);
    }
  },
  async (ctx) => {
    const { activePresets, roots, add, collectSkillMdRecursiveUnderDir } = ctx;
    if (!activePresets.has(PRESET_ID)) {
      return;
    }
    const antigravitySkills = path.join(roots.geminiUserRoot, 'antigravity', 'skills');
    for (const f of await collectSkillMdRecursiveUnderDir(antigravitySkills)) {
      add(f, PRESET_ID, SourceCategoryId.Skill);
    }
  },
];
