import * as path from 'node:path';
import type { HomePathTask } from '../../domain/sourcePresetDefinition';
import { SourceCategoryId } from '../../domain/sourceTags';

const PRESET_ID = 'codex' as const;

async function collectCodexHomeDirectoryPaths(
  codexHomeDir: string,
  add: (
    p: string,
    presetId: typeof PRESET_ID,
    category: (typeof SourceCategoryId)[keyof typeof SourceCategoryId]
  ) => void,
  fileExists: (p: string) => Promise<boolean>,
  collectFilesRecursiveUnderDir: (dir: string) => Promise<string[]>
): Promise<void> {
  const files: {
    segments: string[];
    category: (typeof SourceCategoryId)[keyof typeof SourceCategoryId];
  }[] = [
    { segments: ['AGENTS.md'], category: SourceCategoryId.LlmGuideline },
    { segments: ['agents.md'], category: SourceCategoryId.LlmGuideline },
    { segments: ['config.toml'], category: SourceCategoryId.Config },
    { segments: ['AGENTS.override.md'], category: SourceCategoryId.LlmGuideline },
  ];
  for (const row of files) {
    const abs = path.join(codexHomeDir, ...row.segments);
    if (await fileExists(abs)) {
      add(abs, PRESET_ID, row.category);
    }
  }
  const rulesDir = path.join(codexHomeDir, 'rules');
  for (const f of await collectFilesRecursiveUnderDir(rulesDir)) {
    if (f.toLowerCase().endsWith('.rules')) {
      add(f, PRESET_ID, SourceCategoryId.Rule);
    }
  }
}

export const codexHomePathTasks: readonly HomePathTask[] = [
  async (ctx) => {
    const { activePresets, roots, add, fileExists, collectFilesRecursiveUnderDir } = ctx;
    if (!activePresets.has(PRESET_ID)) {
      return;
    }
    const codexRoot = path.normalize(roots.codexUserRoot);
    await collectCodexHomeDirectoryPaths(codexRoot, add, fileExists, collectFilesRecursiveUnderDir);
  },
  async (ctx) => {
    const { activePresets, roots, add, collectFilesRecursiveUnderDir } = ctx;
    if (!activePresets.has(PRESET_ID)) {
      return;
    }
    const codexRoot = path.normalize(roots.codexUserRoot);
    const codexSkills = path.join(codexRoot, 'skills');
    for (const f of await collectFilesRecursiveUnderDir(codexSkills)) {
      add(f, PRESET_ID, SourceCategoryId.Skill);
    }
  },
  async (ctx) => {
    const { activePresets, homeDir, add, collectFilesRecursiveUnderDir } = ctx;
    if (!activePresets.has(PRESET_ID)) {
      return;
    }
    const userAgentsSkills = path.join(homeDir, '.agents', 'skills');
    for (const f of await collectFilesRecursiveUnderDir(userAgentsSkills)) {
      add(f, PRESET_ID, SourceCategoryId.Skill);
    }
  },
];
