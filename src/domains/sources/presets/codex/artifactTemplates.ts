import * as path from 'node:path';
import type { ArtifactTemplate } from '../../domain/artifactTemplate';
import { simpleFileTemplate } from '../../domain/artifactTemplateHelpers';
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
  simpleFileTemplate({
    id: 'codex/skill/workspace',
    label: 'New Skill',
    presetId: 'codex',
    category: SourceCategoryId.Skill,
    scope: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.codex', 'skills') : ''),
    suggestedExtension: '.md',
    initialContent: skillContent,
  }),
  simpleFileTemplate({
    id: 'codex/skill/user',
    label: 'New Skill (global)',
    presetId: 'codex',
    category: SourceCategoryId.Skill,
    scope: 'user',
    targetDir: (_ws, roots) => path.join(roots.codexUserRoot, 'skills'),
    suggestedExtension: '.md',
    initialContent: skillContent,
  }),
  simpleFileTemplate({
    id: 'codex/rule/workspace',
    label: 'New Rule',
    presetId: 'codex',
    category: SourceCategoryId.Rule,
    scope: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.codex', 'rules') : ''),
    suggestedExtension: '.rules',
    initialContent: ruleContent,
  }),
  simpleFileTemplate({
    id: 'codex/rule/user',
    label: 'New Rule (global)',
    presetId: 'codex',
    category: SourceCategoryId.Rule,
    scope: 'user',
    targetDir: (_ws, roots) => path.join(roots.codexUserRoot, 'rules'),
    suggestedExtension: '.rules',
    initialContent: ruleContent,
  }),
  simpleFileTemplate({
    id: 'codex/context/workspace',
    label: 'New Context File',
    presetId: 'codex',
    category: SourceCategoryId.LlmGuideline,
    scope: 'workspace',
    targetDir: (ws) => ws,
    suggestedExtension: '.md',
    initialContent: '# Guidelines\n\n',
  }),
];
