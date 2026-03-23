import * as path from 'node:path';
import type { ArtifactTemplate } from '../../domain/artifactTemplate';
import { SourceCategoryId } from '../../domain/sourceTags';

function skillContent(fileName: string): string {
  const name = fileName.replace(/\.md$/i, '');
  return `# ${name}\n\n`;
}

function ruleContent(fileName: string): string {
  const name = fileName.replace(/\.rules$/i, '');
  return `# ${name}\n\n`;
}

export const codexArtifactTemplates: readonly ArtifactTemplate[] = [
  {
    id: 'codex/skill/workspace',
    label: 'New Skill',
    presetId: 'codex',
    category: SourceCategoryId.Skill,
    scope: 'workspace',
    targetDirResolver: (workspaceRoot) =>
      workspaceRoot ? path.join(workspaceRoot, '.codex', 'skills') : '',
    suggestedExtension: '.md',
    initialContent: skillContent,
  },
  {
    id: 'codex/skill/user',
    label: 'New Skill (global)',
    presetId: 'codex',
    category: SourceCategoryId.Skill,
    scope: 'user',
    targetDirResolver: (_workspaceRoot, roots) => path.join(roots.codexUserRoot, 'skills'),
    suggestedExtension: '.md',
    initialContent: skillContent,
  },
  {
    id: 'codex/rule/workspace',
    label: 'New Rule',
    presetId: 'codex',
    category: SourceCategoryId.Rule,
    scope: 'workspace',
    targetDirResolver: (workspaceRoot) =>
      workspaceRoot ? path.join(workspaceRoot, '.codex', 'rules') : '',
    suggestedExtension: '.rules',
    initialContent: ruleContent,
  },
  {
    id: 'codex/rule/user',
    label: 'New Rule (global)',
    presetId: 'codex',
    category: SourceCategoryId.Rule,
    scope: 'user',
    targetDirResolver: (_workspaceRoot, roots) => path.join(roots.codexUserRoot, 'rules'),
    suggestedExtension: '.rules',
    initialContent: ruleContent,
  },
  {
    id: 'codex/context/workspace',
    label: 'New Context File',
    presetId: 'codex',
    category: SourceCategoryId.LlmGuideline,
    scope: 'workspace',
    targetDirResolver: (workspaceRoot) => workspaceRoot,
    suggestedExtension: '.md',
    initialContent: '# Guidelines\n\n',
  },
];
