import * as path from 'node:path';
import type { HomePathTask } from '../../domain/sourcePresetDefinition';
import { SourceCategoryId } from '../../domain/sourceTags';

const PRESET_ID = 'cursor' as const;

export const cursorHomePathTasks: readonly HomePathTask[] = [
  async (ctx) => {
    const { activePresets, roots, add, fileExists } = ctx;
    if (!activePresets.has(PRESET_ID)) {
      return;
    }
    const abs = path.join(roots.cursorUserRoot, 'mcp.json');
    if (await fileExists(abs)) {
      add(abs, PRESET_ID, SourceCategoryId.Mcp);
    }
  },
  async (ctx) => {
    const { activePresets, roots, add, collectSkillMdRecursiveUnderDir } = ctx;
    if (!activePresets.has(PRESET_ID)) {
      return;
    }
    const cursorSkills = path.join(roots.cursorUserRoot, 'skills');
    for (const f of await collectSkillMdRecursiveUnderDir(cursorSkills)) {
      add(f, PRESET_ID, SourceCategoryId.Skill);
    }
  },
  async (ctx) => {
    const { activePresets, homeDir, add, fileExists } = ctx;
    if (!activePresets.has(PRESET_ID)) {
      return;
    }
    const cursorrules = path.join(homeDir, '.cursorrules');
    if (await fileExists(cursorrules)) {
      add(cursorrules, PRESET_ID, SourceCategoryId.Rule);
    }
  },
  async (ctx) => {
    const { activePresets, roots, add, collectShallowFilesWithSuffix } = ctx;
    if (!activePresets.has(PRESET_ID)) {
      return;
    }
    const rulesDir = path.join(roots.cursorUserRoot, 'rules');
    for (const f of await collectShallowFilesWithSuffix(rulesDir, '.mdc')) {
      add(f, PRESET_ID, SourceCategoryId.Rule);
    }
  },
];
