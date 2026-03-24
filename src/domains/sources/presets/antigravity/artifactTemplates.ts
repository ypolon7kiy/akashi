import * as path from 'node:path';
import type { ArtifactTemplate } from '../../domain/artifactTemplate';
import { simpleFileTemplate, folderFileTemplate } from '../../domain/artifactTemplateHelpers';
import { SourceCategoryId } from '../../domain/sourceTags';

export const antigravityArtifactTemplates: readonly ArtifactTemplate[] = [
  folderFileTemplate({
    id: 'antigravity/skill/workspace',
    label: 'New Skill',
    presetId: 'antigravity',
    category: SourceCategoryId.Skill,
    scope: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.agent', 'skills') : ''),
    fixedFileName: 'SKILL.md',
    initialContent: (folderName: string) => `# ${folderName}\n\n`,
  }),
  folderFileTemplate({
    id: 'antigravity/skill/user',
    label: 'New Skill (global)',
    presetId: 'antigravity',
    category: SourceCategoryId.Skill,
    scope: 'user',
    targetDir: (_ws, roots) => path.join(roots.geminiUserRoot, 'antigravity', 'skills'),
    fixedFileName: 'SKILL.md',
    initialContent: (folderName: string) => `# ${folderName}\n\n`,
  }),
  simpleFileTemplate({
    id: 'antigravity/context/workspace',
    label: 'New Context File',
    presetId: 'antigravity',
    category: SourceCategoryId.LlmGuideline,
    scope: 'workspace',
    targetDir: (ws) => ws,
    suggestedExtension: '.md',
    initialContent: '# Guidelines\n\n',
  }),
];
