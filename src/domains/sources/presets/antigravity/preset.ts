import type { SourcePresetDefinition } from '../../domain/sourcePresetDefinition';
import { SourceCategoryId } from '../../domain/sourceTags';
import { antigravityHomePathTasks } from './homePathTasks';

const WORKSPACE_GLOBS = [
  { glob: '**/GEMINI.md', category: SourceCategoryId.LlmGuideline },
  { glob: '**/gemini.md', category: SourceCategoryId.LlmGuideline },
  { glob: '**/.gemini/settings.json', category: SourceCategoryId.Config },
  { glob: '**/.agent/skills/**/SKILL.md', category: SourceCategoryId.Skill },
] as const;

export const antigravityPresetDefinition: SourcePresetDefinition = {
  id: 'antigravity',
  workspaceGlobContributions: [...WORKSPACE_GLOBS],
  homePathTasks: [...antigravityHomePathTasks],
};
