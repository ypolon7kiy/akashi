import * as path from 'node:path';
import type { ArtifactTemplate, ArtifactPlannerContext } from '../../domain/artifactTemplate';
import { simpleFileTemplate } from '../../domain/artifactTemplateHelpers';
import { SourceCategoryId } from '../../domain/sourceTags';

const CODEX_CONFIG_TOML_STUB = `# Codex CLI configuration
# https://github.com/openai/codex

`;

function codexConfigTomlTemplate(
  id: string,
  label: string,
  scope: 'workspace' | 'user',
  absolutePath: (ctx: ArtifactPlannerContext) => string
): ArtifactTemplate {
  return {
    id,
    label,
    presetId: 'codex',
    category: SourceCategoryId.Config,
    scope,
    input: {
      title: 'config.toml',
      prompt: 'Creates config.toml if it does not exist (name field ignored)',
    },
    plan(ctx: ArtifactPlannerContext) {
      const abs = absolutePath(ctx);
      if (!abs) {
        return { ok: false, error: 'No target path could be determined.' };
      }
      return {
        ok: true,
        plan: {
          operations: [
            {
              type: 'writeFile',
              absolutePath: abs,
              content: CODEX_CONFIG_TOML_STUB,
            },
          ],
        },
      };
    },
  };
}

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
    label: 'New Context File (custom name)',
    presetId: 'codex',
    category: SourceCategoryId.LlmGuideline,
    scope: 'workspace',
    targetDir: (ws) => ws,
    suggestedExtension: '.md',
    initialContent: '# Guidelines\n\n',
  }),
  simpleFileTemplate({
    id: 'codex/agents-md/workspace',
    label: 'New .codex/AGENTS.md',
    presetId: 'codex',
    category: SourceCategoryId.LlmGuideline,
    scope: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.codex') : ''),
    suggestedExtension: '.md',
    initialContent: (fileName: string) => {
      const name = fileName.replace(/\.md$/i, '');
      return `# ${name}\n\n`;
    },
  }),
  simpleFileTemplate({
    id: 'codex/agents-md/user',
    label: 'New AGENTS.md (global Codex)',
    presetId: 'codex',
    category: SourceCategoryId.LlmGuideline,
    scope: 'user',
    targetDir: (_ws, roots) => roots.codexUserRoot,
    suggestedExtension: '.md',
    initialContent: (fileName: string) => {
      const name = fileName.replace(/\.md$/i, '');
      return `# ${name}\n\n`;
    },
  }),
  codexConfigTomlTemplate(
    'codex/config-toml/workspace',
    'New .codex/config.toml',
    'workspace',
    (ctx) => (ctx.workspaceRoot ? path.join(ctx.workspaceRoot, '.codex', 'config.toml') : '')
  ),
  codexConfigTomlTemplate(
    'codex/config-toml/user',
    'New config.toml (global Codex)',
    'user',
    (ctx) => path.join(ctx.roots.codexUserRoot, 'config.toml')
  ),
];
