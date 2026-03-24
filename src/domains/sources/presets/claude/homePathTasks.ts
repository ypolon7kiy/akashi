import * as path from 'node:path';
import type { HomePathTask } from '../../domain/sourcePresetDefinition';
import { SourceCategoryId } from '../../domain/sourceTags';

const PRESET_ID = 'claude' as const;

export const claudeHomePathTasks: readonly HomePathTask[] = [
  async (ctx) => {
    const { activePresets, roots, add, fileExists } = ctx;
    if (!activePresets.has(PRESET_ID)) {
      return;
    }
    const rows: {
      abs: string;
      category: (typeof SourceCategoryId)[keyof typeof SourceCategoryId];
    }[] = [
      {
        abs: path.join(roots.claudeUserRoot, 'CLAUDE.md'),
        category: SourceCategoryId.LlmGuideline,
      },
      {
        abs: path.join(roots.claudeUserRoot, 'settings.json'),
        category: SourceCategoryId.Config,
      },
      {
        abs: path.join(roots.claudeUserRoot, 'settings.local.json'),
        category: SourceCategoryId.Config,
      },
    ];
    for (const row of rows) {
      if (await fileExists(row.abs)) {
        add(row.abs, PRESET_ID, row.category);
      }
    }
  },
  async (ctx) => {
    const { activePresets, roots, add, collectFilesRecursiveUnderDir } = ctx;
    if (!activePresets.has(PRESET_ID)) {
      return;
    }
    const claudeSkills = path.join(roots.claudeUserRoot, 'skills');
    for (const f of await collectFilesRecursiveUnderDir(claudeSkills)) {
      add(f, PRESET_ID, SourceCategoryId.Skill);
    }
  },
  async (ctx) => {
    const { activePresets, roots, add, collectFilesRecursiveUnderDir } = ctx;
    if (!activePresets.has(PRESET_ID)) {
      return;
    }
    const rulesDir = path.join(roots.claudeUserRoot, 'rules');
    for (const f of await collectFilesRecursiveUnderDir(rulesDir)) {
      if (f.toLowerCase().endsWith('.md')) {
        add(f, PRESET_ID, SourceCategoryId.Rule);
      }
    }
  },
  async (ctx) => {
    const { activePresets, roots, add, collectFilesRecursiveUnderDir } = ctx;
    if (!activePresets.has(PRESET_ID)) {
      return;
    }
    const hooksDir = path.join(roots.claudeUserRoot, 'hooks');
    for (const f of await collectFilesRecursiveUnderDir(hooksDir)) {
      add(f, PRESET_ID, SourceCategoryId.Hook);
    }
  },
  async (ctx) => {
    const { activePresets, roots, add, collectFilesRecursiveUnderDir } = ctx;
    if (!activePresets.has(PRESET_ID)) {
      return;
    }
    const commandsDir = path.join(roots.claudeUserRoot, 'commands');
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
    const abs = path.join(homeDir, '.claude.json');
    if (await fileExists(abs)) {
      add(abs, PRESET_ID, SourceCategoryId.Config);
    }
  },
];
