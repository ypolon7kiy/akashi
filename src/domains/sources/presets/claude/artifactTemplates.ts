import * as path from 'node:path';
import type { ArtifactTemplate, ArtifactPlannerContext } from '../../domain/artifactTemplate';
import { simpleFileTemplate } from '../../domain/artifactTemplateHelpers';
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

function hookConfigTemplate(
  id: string,
  label: string,
  scope: 'workspace' | 'user',
  hooksDir: (ctx: ArtifactPlannerContext) => string,
  settingsPath: (ctx: ArtifactPlannerContext) => string
): ArtifactTemplate {
  return {
    id,
    label,
    presetId: 'claude',
    category: SourceCategoryId.Hook,
    scope,
    input: { title: 'Hook Name', prompt: 'Hook name (e.g. lint-on-save)' },
    plan(ctx: ArtifactPlannerContext) {
      const dir = hooksDir(ctx);
      if (!dir) {
        return { ok: false, error: 'No target directory could be determined.' };
      }
      if (!ctx.userInput) {
        return { ok: false, error: 'Enter a name.' };
      }
      const scriptPath = path.join(dir, `${ctx.userInput}.sh`);
      return {
        ok: true,
        plan: {
          operations: [
            {
              type: 'writeFile',
              absolutePath: scriptPath,
              content: `#!/bin/bash\n# Hook: ${ctx.userInput}\n\n`,
            },
            {
              type: 'jsonMerge',
              absolutePath: settingsPath(ctx),
              jsonPath: 'hooks',
              value: {
                [ctx.userInput]: {
                  command: scriptPath,
                  event: 'PostToolUse',
                },
              },
              description: `Register hook "${ctx.userInput}" in settings.json`,
            },
          ],
          openAfterCreate: scriptPath,
        },
      };
    },
  };
}

function mcpTemplate(
  id: string,
  label: string,
  scope: 'workspace' | 'user',
  mcpPath: (ctx: ArtifactPlannerContext) => string
): ArtifactTemplate {
  return {
    id,
    label,
    presetId: 'claude',
    category: SourceCategoryId.Mcp,
    scope,
    input: { title: 'MCP Server', prompt: 'Server name (e.g. my-mcp-server)' },
    plan(ctx: ArtifactPlannerContext) {
      const target = mcpPath(ctx);
      if (!target) {
        return { ok: false, error: 'No target path could be determined.' };
      }
      if (!ctx.userInput) {
        return { ok: false, error: 'Enter a name.' };
      }
      return {
        ok: true,
        plan: {
          operations: [
            {
              type: 'jsonMerge',
              absolutePath: target,
              jsonPath: 'mcpServers',
              value: {
                [ctx.userInput]: {
                  command: 'npx',
                  args: ['-y', ctx.userInput],
                },
              },
              description: `Add MCP server "${ctx.userInput}" to config`,
            },
          ],
        },
      };
    },
  };
}

export const claudeArtifactTemplates: readonly ArtifactTemplate[] = [
  simpleFileTemplate({
    id: 'claude/skill/workspace',
    label: 'New Skill',
    presetId: 'claude',
    category: SourceCategoryId.Skill,
    scope: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.claude', 'skills') : ''),
    suggestedExtension: '.md',
    initialContent: skillContent,
  }),
  simpleFileTemplate({
    id: 'claude/skill/user',
    label: 'New Skill (global)',
    presetId: 'claude',
    category: SourceCategoryId.Skill,
    scope: 'user',
    targetDir: (_ws, roots) => path.join(roots.claudeUserRoot, 'skills'),
    suggestedExtension: '.md',
    initialContent: skillContent,
  }),
  simpleFileTemplate({
    id: 'claude/rule/workspace',
    label: 'New Rule',
    presetId: 'claude',
    category: SourceCategoryId.Rule,
    scope: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.claude', 'rules') : ''),
    suggestedExtension: '.md',
    initialContent: ruleContent,
  }),
  simpleFileTemplate({
    id: 'claude/rule/user',
    label: 'New Rule (global)',
    presetId: 'claude',
    category: SourceCategoryId.Rule,
    scope: 'user',
    targetDir: (_ws, roots) => path.join(roots.claudeUserRoot, 'rules'),
    suggestedExtension: '.md',
    initialContent: ruleContent,
  }),
  simpleFileTemplate({
    id: 'claude/command/workspace',
    label: 'New Command',
    presetId: 'claude',
    category: SourceCategoryId.Command,
    scope: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.claude', 'commands') : ''),
    suggestedExtension: '.md',
    initialContent: commandContent,
  }),
  simpleFileTemplate({
    id: 'claude/command/user',
    label: 'New Command (global)',
    presetId: 'claude',
    category: SourceCategoryId.Command,
    scope: 'user',
    targetDir: (_ws, roots) => path.join(roots.claudeUserRoot, 'commands'),
    suggestedExtension: '.md',
    initialContent: commandContent,
  }),
  simpleFileTemplate({
    id: 'claude/context/workspace',
    label: 'New Context File',
    presetId: 'claude',
    category: SourceCategoryId.LlmGuideline,
    scope: 'workspace',
    targetDir: (ws) => ws,
    suggestedExtension: '.md',
    initialContent: '# Guidelines\n\n',
  }),
  simpleFileTemplate({
    id: 'claude/hook/workspace',
    label: 'New Hook Script',
    presetId: 'claude',
    category: SourceCategoryId.Hook,
    scope: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.claude', 'hooks') : ''),
    suggestedExtension: '.sh',
    initialContent: (fileName: string) => {
      const name = fileName.replace(/\.sh$/i, '');
      return `#!/bin/bash\n# Hook: ${name}\n\n`;
    },
  }),
  simpleFileTemplate({
    id: 'claude/hook/user',
    label: 'New Hook Script (global)',
    presetId: 'claude',
    category: SourceCategoryId.Hook,
    scope: 'user',
    targetDir: (_ws, roots) => path.join(roots.claudeUserRoot, 'hooks'),
    suggestedExtension: '.sh',
    initialContent: (fileName: string) => {
      const name = fileName.replace(/\.sh$/i, '');
      return `#!/bin/bash\n# Hook: ${name}\n\n`;
    },
  }),
  hookConfigTemplate(
    'claude/hook-config/workspace',
    'Register Hook (settings.json)',
    'workspace',
    (ctx) => (ctx.workspaceRoot ? path.join(ctx.workspaceRoot, '.claude', 'hooks') : ''),
    (ctx) => path.join(ctx.workspaceRoot, '.claude', 'settings.json')
  ),
  hookConfigTemplate(
    'claude/hook-config/user',
    'Register Hook (global settings)',
    'user',
    (ctx) => path.join(ctx.roots.claudeUserRoot, 'hooks'),
    (ctx) => path.join(ctx.roots.claudeUserRoot, 'settings.json')
  ),
  mcpTemplate(
    'claude/mcp/workspace',
    'New MCP Server',
    'workspace',
    (ctx) => (ctx.workspaceRoot ? path.join(ctx.workspaceRoot, '.mcp.json') : '')
  ),
  mcpTemplate(
    'claude/mcp/user',
    'New MCP Server (global)',
    'user',
    (ctx) => path.join(ctx.roots.claudeUserRoot, '.mcp.json')
  ),
];
