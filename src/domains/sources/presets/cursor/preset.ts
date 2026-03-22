import type { SourcePresetDefinition } from '../../domain/sourcePresetDefinition';
import { SourceCategoryId } from '../../domain/sourceTags';
import { cursorHomePathTasks } from './homePathTasks';

const WORKSPACE_GLOBS = [
  { glob: '**/AGENTS.md', category: SourceCategoryId.LlmGuideline },
  { glob: '**/agents.md', category: SourceCategoryId.LlmGuideline },
  { glob: '**/.cursorrules', category: SourceCategoryId.Rule },
  { glob: '**/.cursor/rules/**/*.mdc', category: SourceCategoryId.Rule },
  { glob: '**/.cursor/rules/**/*.md', category: SourceCategoryId.Rule },
  { glob: '**/.cursor/mcp.json', category: SourceCategoryId.Mcp },
  { glob: '**/.cursor/hooks.json', category: SourceCategoryId.Hook },
  { glob: '**/.cursor/skills/**/*', category: SourceCategoryId.Skill },
  { glob: '**/.agents/skills/**/*', category: SourceCategoryId.Skill },
] as const;

export const cursorPresetDefinition: SourcePresetDefinition = {
  id: 'cursor',
  workspaceGlobContributions: [...WORKSPACE_GLOBS],
  homePathTasks: [...cursorHomePathTasks],
};
