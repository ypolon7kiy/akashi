import type { SourcePresetDefinition } from '../../domain/sourcePresetDefinition';
import { SourceCategoryId } from '../../domain/sourceTags';
import { claudeHomePathTasks } from './homePathTasks';

const WORKSPACE_GLOBS = [
  { glob: '**/CLAUDE.md', category: SourceCategoryId.LlmGuideline },
  { glob: '**/claude.md', category: SourceCategoryId.LlmGuideline },
  { glob: '**/.claude/settings.json', category: SourceCategoryId.Config },
  { glob: '**/.claude/settings.local.json', category: SourceCategoryId.Config },
  { glob: '**/.claude/rules/**/*.md', category: SourceCategoryId.Rule },
  { glob: '**/.claude/hooks/**/*', category: SourceCategoryId.Hook },
  { glob: '**/.claude/skills/**/*', category: SourceCategoryId.Skill },
  { glob: '**/.mcp.json', category: SourceCategoryId.Mcp },
] as const;

export const claudePresetDefinition: SourcePresetDefinition = {
  id: 'claude',
  workspaceGlobContributions: [...WORKSPACE_GLOBS],
  homePathTasks: [...claudeHomePathTasks],
};
