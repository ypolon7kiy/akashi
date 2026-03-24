import * as path from 'node:path';
import type { ArtifactCreator } from '../../domain/artifactCreator';
import { SimpleFileCreator } from '../../domain/creators/SimpleFileCreator';
import { SourceCategoryId } from '../../domain/sourceTags';
import { CodexConfigTomlCreator } from './creators/CodexConfigTomlCreator';

function skillContent(fileName: string): string {
  const name = fileName.replace(/\.md$/i, '');
  return `# ${name}\n\n`;
}

function ruleContent(fileName: string): string {
  const name = fileName.replace(/\.rules$/i, '');
  return `# ${name}\n\n`;
}

export const codexArtifactCreators: readonly ArtifactCreator[] = [
  new SimpleFileCreator({
    id: 'codex/skill/workspace',
    label: 'New Skill',
    presetId: 'codex',
    category: SourceCategoryId.Skill,
    locality: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.codex', 'skills') : ''),
    suggestedExtension: '.md',
    initialContent: skillContent,
  }),
  new SimpleFileCreator({
    id: 'codex/skill/user',
    label: 'New Skill (global)',
    presetId: 'codex',
    category: SourceCategoryId.Skill,
    locality: 'user',
    targetDir: (_ws, roots) => path.join(roots.codexUserRoot, 'skills'),
    suggestedExtension: '.md',
    initialContent: skillContent,
  }),
  new SimpleFileCreator({
    id: 'codex/rule/workspace',
    label: 'New Rule',
    presetId: 'codex',
    category: SourceCategoryId.Rule,
    locality: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.codex', 'rules') : ''),
    suggestedExtension: '.rules',
    initialContent: ruleContent,
  }),
  new SimpleFileCreator({
    id: 'codex/rule/user',
    label: 'New Rule (global)',
    presetId: 'codex',
    category: SourceCategoryId.Rule,
    locality: 'user',
    targetDir: (_ws, roots) => path.join(roots.codexUserRoot, 'rules'),
    suggestedExtension: '.rules',
    initialContent: ruleContent,
  }),
  new SimpleFileCreator({
    id: 'codex/context/workspace',
    label: 'New Context File (custom name)',
    presetId: 'codex',
    category: SourceCategoryId.LlmGuideline,
    locality: 'workspace',
    targetDir: (ws) => ws,
    suggestedExtension: '.md',
    initialContent: '# Guidelines\n\n',
  }),
  new SimpleFileCreator({
    id: 'codex/agents-md/workspace',
    label: 'New .codex/AGENTS.md',
    presetId: 'codex',
    category: SourceCategoryId.LlmGuideline,
    locality: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.codex') : ''),
    suggestedExtension: '.md',
    initialContent: (fileName: string) => {
      const name = fileName.replace(/\.md$/i, '');
      return `# ${name}\n\n`;
    },
  }),
  new SimpleFileCreator({
    id: 'codex/agents-md/user',
    label: 'New AGENTS.md (global Codex)',
    presetId: 'codex',
    category: SourceCategoryId.LlmGuideline,
    locality: 'user',
    targetDir: (_ws, roots) => roots.codexUserRoot,
    suggestedExtension: '.md',
    initialContent: (fileName: string) => {
      const name = fileName.replace(/\.md$/i, '');
      return `# ${name}\n\n`;
    },
  }),
  new CodexConfigTomlCreator({
    id: 'codex/config-toml/workspace',
    label: 'New .codex/config.toml',
    locality: 'workspace',
    absolutePath: (ctx) =>
      ctx.workspaceRoot ? path.join(ctx.workspaceRoot, '.codex', 'config.toml') : '',
  }),
  new CodexConfigTomlCreator({
    id: 'codex/config-toml/user',
    label: 'New config.toml (global Codex)',
    locality: 'user',
    absolutePath: (ctx) => path.join(ctx.roots.codexUserRoot, 'config.toml'),
  }),
];
