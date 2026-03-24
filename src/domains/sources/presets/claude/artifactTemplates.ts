import * as path from 'node:path';
import type { ArtifactTemplate } from '../../domain/artifactTemplate';
import { SourceCategoryId } from '../../domain/sourceTags';

function skillContent(fileName: string): string {
  const name = fileName.replace(/\.md$/i, '');
  return `# ${name}\n\n`;
}

function ruleContent(fileName: string): string {
  const name = fileName.replace(/\.md$/i, '');
  return `---\ndescription: ${name}\n---\n\n`;
}

function commandContent(fileName: string): string {
  const name = fileName.replace(/\.md$/i, '');
  return `---\ndescription: ${name}\n---\n\n`;
}

export const claudeArtifactTemplates: readonly ArtifactTemplate[] = [
  {
    id: 'claude/skill/workspace',
    label: 'New Skill',
    presetId: 'claude',
    category: SourceCategoryId.Skill,
    scope: 'workspace',
    targetDirResolver: (workspaceRoot) =>
      workspaceRoot ? path.join(workspaceRoot, '.claude', 'skills') : '',
    suggestedExtension: '.md',
    initialContent: skillContent,
  },
  {
    id: 'claude/skill/user',
    label: 'New Skill (global)',
    presetId: 'claude',
    category: SourceCategoryId.Skill,
    scope: 'user',
    targetDirResolver: (_workspaceRoot, roots) => path.join(roots.claudeUserRoot, 'skills'),
    suggestedExtension: '.md',
    initialContent: skillContent,
  },
  {
    id: 'claude/rule/workspace',
    label: 'New Rule',
    presetId: 'claude',
    category: SourceCategoryId.Rule,
    scope: 'workspace',
    targetDirResolver: (workspaceRoot) =>
      workspaceRoot ? path.join(workspaceRoot, '.claude', 'rules') : '',
    suggestedExtension: '.md',
    initialContent: ruleContent,
  },
  {
    id: 'claude/rule/user',
    label: 'New Rule (global)',
    presetId: 'claude',
    category: SourceCategoryId.Rule,
    scope: 'user',
    targetDirResolver: (_workspaceRoot, roots) => path.join(roots.claudeUserRoot, 'rules'),
    suggestedExtension: '.md',
    initialContent: ruleContent,
  },
  {
    id: 'claude/command/workspace',
    label: 'New Command',
    presetId: 'claude',
    category: SourceCategoryId.Command,
    scope: 'workspace',
    targetDirResolver: (workspaceRoot) =>
      workspaceRoot ? path.join(workspaceRoot, '.claude', 'commands') : '',
    suggestedExtension: '.md',
    initialContent: commandContent,
  },
  {
    id: 'claude/command/user',
    label: 'New Command (global)',
    presetId: 'claude',
    category: SourceCategoryId.Command,
    scope: 'user',
    targetDirResolver: (_workspaceRoot, roots) => path.join(roots.claudeUserRoot, 'commands'),
    suggestedExtension: '.md',
    initialContent: commandContent,
  },
  {
    id: 'claude/context/workspace',
    label: 'New Context File',
    presetId: 'claude',
    category: SourceCategoryId.LlmGuideline,
    scope: 'workspace',
    targetDirResolver: (workspaceRoot) => workspaceRoot,
    suggestedExtension: '.md',
    initialContent: '# Guidelines\n\n',
  },
  {
    id: 'claude/hook/workspace',
    label: 'New Hook',
    presetId: 'claude',
    category: SourceCategoryId.Hook,
    scope: 'workspace',
    targetDirResolver: (workspaceRoot) =>
      workspaceRoot ? path.join(workspaceRoot, '.claude', 'hooks') : '',
    suggestedExtension: '.sh',
    initialContent: (fileName: string) => {
      const name = fileName.replace(/\.sh$/i, '');
      return `#!/bin/bash\n# Hook: ${name}\n\n`;
    },
  },
  {
    id: 'claude/hook/user',
    label: 'New Hook (global)',
    presetId: 'claude',
    category: SourceCategoryId.Hook,
    scope: 'user',
    targetDirResolver: (_workspaceRoot, roots) => path.join(roots.claudeUserRoot, 'hooks'),
    suggestedExtension: '.sh',
    initialContent: (fileName: string) => {
      const name = fileName.replace(/\.sh$/i, '');
      return `#!/bin/bash\n# Hook: ${name}\n\n`;
    },
  },
];
