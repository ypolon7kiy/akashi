import type { SourcePresetDefinition } from '../../domain/sourcePresetDefinition';
import { SourceCategoryId } from '../../domain/sourceTags';
import { codexArtifactCreators } from './creators';
import { codexHomePathTasks } from './homePathTasks';

const WORKSPACE_GLOBS = [
  { glob: '**/AGENTS.md', category: SourceCategoryId.LlmGuideline },
  { glob: '**/agents.md', category: SourceCategoryId.LlmGuideline },
  { glob: '**/.codex/AGENTS.md', category: SourceCategoryId.LlmGuideline },
  { glob: '**/.codex/agents.md', category: SourceCategoryId.LlmGuideline },
  { glob: '**/AGENTS.override.md', category: SourceCategoryId.LlmGuideline },
  { glob: '**/.agents.md', category: SourceCategoryId.LlmGuideline },
  { glob: '**/.codex/config.toml', category: SourceCategoryId.Config },
  { glob: '**/.codex/rules/**/*.rules', category: SourceCategoryId.Rule },
  { glob: '**/.codex/skills/**/*', category: SourceCategoryId.Skill },
  { glob: '**/.agents/skills/**/*', category: SourceCategoryId.Skill },
] as const;

export const codexPresetDefinition: SourcePresetDefinition = {
  id: 'codex',
  workspaceGlobContributions: [...WORKSPACE_GLOBS],
  homePathTasks: [...codexHomePathTasks],
  artifactCreators: codexArtifactCreators,
};
