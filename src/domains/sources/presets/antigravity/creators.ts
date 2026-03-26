import * as path from 'node:path';
import type { ArtifactCreator } from '../../domain/artifactCreator';
import { FixedDocCreator } from '../../domain/creators/FixedDocCreator';
import { SimpleFileCreator } from '../../domain/creators/SimpleFileCreator';
import { SkillFileCreator } from '../../domain/creators/SkillFileCreator';
import { SourceCategoryId } from '../../domain/sourceTags';

export const antigravityArtifactCreators: readonly ArtifactCreator[] = [
  new SkillFileCreator({
    id: 'antigravity/skill/workspace',
    label: 'New Skill',
    presetId: 'antigravity',
    category: SourceCategoryId.Skill,
    locality: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.agent', 'skills') : ''),
    layout: { kind: 'folder', fixedFileName: 'SKILL.md' },
  }),
  new SkillFileCreator({
    id: 'antigravity/skill/user',
    label: 'New Skill (global)',
    presetId: 'antigravity',
    category: SourceCategoryId.Skill,
    locality: 'user',
    targetDir: (_ws, roots) => path.join(roots.geminiUserRoot, 'antigravity', 'skills'),
    layout: { kind: 'folder', fixedFileName: 'SKILL.md' },
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
