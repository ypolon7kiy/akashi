import * as path from 'node:path';
import type { ArtifactTemplate } from '../../domain/artifactTemplate';
import { SourceCategoryId } from '../../domain/sourceTags';

export const antigravityArtifactTemplates: readonly ArtifactTemplate[] = [
  {
    id: 'antigravity/skill/workspace',
    label: 'New Skill',
    presetId: 'antigravity',
    category: SourceCategoryId.Skill,
    scope: 'workspace',
    // Antigravity skills follow the `<name>/SKILL.md` convention:
    // the user provides the skill folder name; `fixedFileName` sets the actual file.
    targetDirResolver: (workspaceRoot) =>
      workspaceRoot ? path.join(workspaceRoot, '.agent', 'skills') : '',
    suggestedExtension: '',
    fixedFileName: 'SKILL.md',
    initialContent: (folderName: string) => `# ${folderName}\n\n`,
  },
  {
    id: 'antigravity/skill/user',
    label: 'New Skill (global)',
    presetId: 'antigravity',
    category: SourceCategoryId.Skill,
    scope: 'user',
    targetDirResolver: (_workspaceRoot, roots) =>
      path.join(roots.geminiUserRoot, 'antigravity', 'skills'),
    suggestedExtension: '',
    fixedFileName: 'SKILL.md',
    initialContent: (folderName: string) => `# ${folderName}\n\n`,
  },
  {
    id: 'antigravity/context/workspace',
    label: 'New Context File',
    presetId: 'antigravity',
    category: SourceCategoryId.LlmGuideline,
    scope: 'workspace',
    targetDirResolver: (workspaceRoot) => workspaceRoot,
    suggestedExtension: '.md',
    initialContent: '# Guidelines\n\n',
  },
];
