import * as path from 'node:path';
import type { ArtifactCreator } from '../../domain/artifactCreator';
import { FixedDocCreator } from '../../domain/creators/FixedDocCreator';
import { FolderFileCreator } from '../../domain/creators/FolderFileCreator';
import { SimpleFileCreator } from '../../domain/creators/SimpleFileCreator';
import { SourceCategoryId } from '../../domain/sourceTags';

export const antigravityArtifactCreators: readonly ArtifactCreator[] = [
  new FolderFileCreator({
    id: 'antigravity/skill/workspace',
    label: 'New Skill',
    presetId: 'antigravity',
    category: SourceCategoryId.Skill,
    locality: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.agent', 'skills') : ''),
    fixedFileName: 'SKILL.md',
    initialContent: (folderName: string) => `# ${folderName}\n\n`,
  }),
  new FolderFileCreator({
    id: 'antigravity/skill/user',
    label: 'New Skill (global)',
    presetId: 'antigravity',
    category: SourceCategoryId.Skill,
    locality: 'user',
    targetDir: (_ws, roots) => path.join(roots.geminiUserRoot, 'antigravity', 'skills'),
    fixedFileName: 'SKILL.md',
    initialContent: (folderName: string) => `# ${folderName}\n\n`,
  }),
  new SimpleFileCreator({
    id: 'antigravity/context/workspace',
    label: 'New Context File (custom name)',
    presetId: 'antigravity',
    category: SourceCategoryId.LlmGuideline,
    locality: 'workspace',
    targetDir: (ws) => ws,
    suggestedExtension: '.md',
    initialContent: '# Guidelines\n\n',
  }),
  new FixedDocCreator({
    id: 'antigravity/gemini/workspace',
    label: 'New GEMINI.md (project root)',
    presetId: 'antigravity',
    category: SourceCategoryId.LlmGuideline,
    locality: 'workspace',
    requireNonEmptyTitle: true,
    inputTitle: 'Document title',
    inputPrompt: 'First-line heading in GEMINI.md',
    absolutePath: (ctx) => (ctx.workspaceRoot ? path.join(ctx.workspaceRoot, 'GEMINI.md') : ''),
    contentForTitle: (title) => `# ${title}\n\n`,
  }),
  new FixedDocCreator({
    id: 'antigravity/gemini/user',
    label: 'New GEMINI.md (global)',
    presetId: 'antigravity',
    category: SourceCategoryId.LlmGuideline,
    locality: 'user',
    requireNonEmptyTitle: false,
    defaultTitleIfEmpty: 'GEMINI',
    inputTitle: 'Document title',
    inputPrompt: 'Heading for GEMINI.md (e.g. GEMINI or project name)',
    absolutePath: (ctx) => path.join(ctx.roots.geminiUserRoot, 'GEMINI.md'),
    contentForTitle: (title) => `# ${title}\n\n`,
  }),
];
