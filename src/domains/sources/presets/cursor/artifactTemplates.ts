import * as path from 'node:path';
import type { ArtifactTemplate } from '../../domain/artifactTemplate';
import { simpleFileTemplate } from '../../domain/artifactTemplateHelpers';
import { SourceCategoryId } from '../../domain/sourceTags';

function skillContent(fileName: string): string {
  const name = fileName.replace(/\.md$/i, '');
  return `# ${name}\n\n`;
}

function ruleContent(fileName: string): string {
  const name = fileName.replace(/\.mdc?$/i, '');
  return `---\ndescription: ${name}\n---\n\n`;
}

function commandContent(fileName: string): string {
  const name = fileName.replace(/\.md$/i, '');
  return `---\ndescription: ${name}\n---\n\n`;
}

export const cursorArtifactTemplates: readonly ArtifactTemplate[] = [
  simpleFileTemplate({
    id: 'cursor/skill/workspace',
    label: 'New Skill',
    presetId: 'cursor',
    category: SourceCategoryId.Skill,
    scope: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.cursor', 'skills') : ''),
    suggestedExtension: '.md',
    initialContent: skillContent,
  }),
  simpleFileTemplate({
    id: 'cursor/skill/user',
    label: 'New Skill (global)',
    presetId: 'cursor',
    category: SourceCategoryId.Skill,
    scope: 'user',
    targetDir: (_ws, roots) => path.join(roots.cursorUserRoot, 'skills'),
    suggestedExtension: '.md',
    initialContent: skillContent,
  }),
  simpleFileTemplate({
    id: 'cursor/rule/workspace',
    label: 'New Rule',
    presetId: 'cursor',
    category: SourceCategoryId.Rule,
    scope: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.cursor', 'rules') : ''),
    suggestedExtension: '.mdc',
    initialContent: ruleContent,
  }),
  simpleFileTemplate({
    id: 'cursor/rule/user',
    label: 'New Rule (global)',
    presetId: 'cursor',
    category: SourceCategoryId.Rule,
    scope: 'user',
    targetDir: (_ws, roots) => path.join(roots.cursorUserRoot, 'rules'),
    suggestedExtension: '.mdc',
    initialContent: ruleContent,
  }),
  simpleFileTemplate({
    id: 'cursor/command/workspace',
    label: 'New Command',
    presetId: 'cursor',
    category: SourceCategoryId.Command,
    scope: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.cursor', 'commands') : ''),
    suggestedExtension: '.md',
    initialContent: commandContent,
  }),
  simpleFileTemplate({
    id: 'cursor/command/user',
    label: 'New Command (global)',
    presetId: 'cursor',
    category: SourceCategoryId.Command,
    scope: 'user',
    targetDir: (_ws, roots) => path.join(roots.cursorUserRoot, 'commands'),
    suggestedExtension: '.md',
    initialContent: commandContent,
  }),
  simpleFileTemplate({
    id: 'cursor/context/workspace',
    label: 'New Context File',
    presetId: 'cursor',
    category: SourceCategoryId.LlmGuideline,
    scope: 'workspace',
    targetDir: (ws) => ws,
    suggestedExtension: '.md',
    initialContent: '# Guidelines\n\n',
  }),
];
