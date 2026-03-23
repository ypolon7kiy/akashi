import * as path from 'node:path';
import type { ArtifactTemplate } from '../../domain/artifactTemplate';
import { SourceCategoryId } from '../../domain/sourceTags';

function skillContent(fileName: string): string {
  const name = fileName.replace(/\.md$/i, '');
  return `# ${name}\n\n`;
}

function ruleContent(fileName: string): string {
  const name = fileName.replace(/\.mdc?$/i, '');
  return `---\ndescription: ${name}\n---\n\n`;
}

export const cursorArtifactTemplates: readonly ArtifactTemplate[] = [
  {
    id: 'cursor/skill/workspace',
    label: 'New Skill',
    presetId: 'cursor',
    category: SourceCategoryId.Skill,
    scope: 'workspace',
    targetDirResolver: (workspaceRoot) =>
      workspaceRoot ? path.join(workspaceRoot, '.cursor', 'skills') : '',
    suggestedExtension: '.md',
    initialContent: skillContent,
  },
  {
    id: 'cursor/skill/user',
    label: 'New Skill (global)',
    presetId: 'cursor',
    category: SourceCategoryId.Skill,
    scope: 'user',
    targetDirResolver: (_workspaceRoot, roots) => path.join(roots.cursorUserRoot, 'skills'),
    suggestedExtension: '.md',
    initialContent: skillContent,
  },
  {
    id: 'cursor/rule/workspace',
    label: 'New Rule',
    presetId: 'cursor',
    category: SourceCategoryId.Rule,
    scope: 'workspace',
    targetDirResolver: (workspaceRoot) =>
      workspaceRoot ? path.join(workspaceRoot, '.cursor', 'rules') : '',
    suggestedExtension: '.mdc',
    initialContent: ruleContent,
  },
  {
    id: 'cursor/rule/user',
    label: 'New Rule (global)',
    presetId: 'cursor',
    category: SourceCategoryId.Rule,
    scope: 'user',
    targetDirResolver: (_workspaceRoot, roots) => path.join(roots.cursorUserRoot, 'rules'),
    suggestedExtension: '.mdc',
    initialContent: ruleContent,
  },
  {
    id: 'cursor/context/workspace',
    label: 'New Context File',
    presetId: 'cursor',
    category: SourceCategoryId.LlmGuideline,
    scope: 'workspace',
    targetDirResolver: (workspaceRoot) => workspaceRoot,
    suggestedExtension: '.md',
    initialContent: '# Guidelines\n\n',
  },
];
