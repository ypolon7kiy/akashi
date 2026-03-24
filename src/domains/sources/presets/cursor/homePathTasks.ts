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
    const { activePresets, roots, add, fileExists } = ctx;
    if (!activePresets.has(PRESET_ID)) {
      return;
    }
    const abs = path.join(roots.cursorUserRoot, 'hooks.json');
    if (await fileExists(abs)) {
      add(abs, PRESET_ID, SourceCategoryId.Hook);
    }
  },
  async (ctx) => {
    const { activePresets, roots, add, collectFilesRecursiveUnderDir } = ctx;
    if (!activePresets.has(PRESET_ID)) {
      return;
    }
    const cursorSkills = path.join(roots.cursorUserRoot, 'skills');
    for (const f of await collectFilesRecursiveUnderDir(cursorSkills)) {
      add(f, PRESET_ID, SourceCategoryId.Skill);
    }
  },
  async (ctx) => {
    const { activePresets, roots, add, collectFilesRecursiveUnderDir } = ctx;
    if (!activePresets.has(PRESET_ID)) {
      return;
    }
    const commandsDir = path.join(roots.cursorUserRoot, 'commands');
    for (const f of await collectFilesRecursiveUnderDir(commandsDir)) {
      if (f.toLowerCase().endsWith('.md')) {
        add(f, PRESET_ID, SourceCategoryId.Command);
      }
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
    const { activePresets, roots, add, collectFilesRecursiveUnderDir } = ctx;
    if (!activePresets.has(PRESET_ID)) {
      return;
    }
    const rulesDir = path.join(roots.cursorUserRoot, 'rules');
    for (const f of await collectFilesRecursiveUnderDir(rulesDir)) {
      const lower = f.toLowerCase();
      if (lower.endsWith('.mdc') || lower.endsWith('.md')) {
        add(f, PRESET_ID, SourceCategoryId.Rule);
      }
    }
  },
];
