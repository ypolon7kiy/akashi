import * as path from 'node:path';
import type {
  ArtifactTemplate,
  ArtifactPlannerContext,
  HookLifecycleWizardOptions,
} from '../../domain/artifactTemplate';
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

/** Default lifecycle event for new Claude Code command hooks (see code.claude.com/docs/hooks). */
export const DEFAULT_CLAUDE_HOOK_EVENT = 'PostToolUse' as const;

/** Values shown in the new-artifact wizard for Claude registered hooks. */
export const CLAUDE_HOOK_LIFECYCLE_EVENTS = [
  'PostToolUse',
  'PreToolUse',
  'Stop',
  'SubagentStop',
  'SessionStart',
  'SessionEnd',
  'Notification',
] as const;

const claudeHookLifecycleWizard: HookLifecycleWizardOptions = {
  events: [...CLAUDE_HOOK_LIFECYCLE_EVENTS],
  defaultEvent: DEFAULT_CLAUDE_HOOK_EVENT,
  promptMatcher: true,
};

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
    hookLifecycleWizard: claudeHookLifecycleWizard,
    input: { title: 'Hook Name', prompt: 'Hook name (e.g. lint-on-save)' },
    plan(ctx: ArtifactPlannerContext) {
      const dir = hooksDir(ctx);
      if (!dir) {
        return { ok: false, error: 'No target directory could be determined.' };
      }
      const name = ctx.userInput.trim();
      if (!name) {
        return { ok: false, error: 'Enter a name.' };
      }
      const scriptPath = path.join(dir, `${name}.sh`);
      const allowed = CLAUDE_HOOK_LIFECYCLE_EVENTS as readonly string[];
      const hookEvent =
        ctx.hookLifecycleEvent && allowed.includes(ctx.hookLifecycleEvent)
          ? ctx.hookLifecycleEvent
          : DEFAULT_CLAUDE_HOOK_EVENT;
      const matcher = ctx.hookMatcher?.trim() ?? '';
      const newBlock = {
        matcher,
        hooks: [{ type: 'command', command: scriptPath }],
      };
      const matcherLabel = matcher === '' ? 'all tools' : matcher;
      return {
        ok: true,
        plan: {
          operations: [
            {
              type: 'writeFile',
              absolutePath: scriptPath,
              content: `#!/bin/bash\n# Hook: ${name}\n\n`,
            },
            {
              type: 'jsonMerge',
              absolutePath: settingsPath(ctx),
              jsonPath: `hooks.${hookEvent}`,
              value: [newBlock],
              description: `Register hook "${name}" in settings.json (hooks.${hookEvent}, matcher: ${matcherLabel})`,
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
      const server = ctx.userInput.trim();
      if (!server) {
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
                [server]: {
                  command: 'npx',
                  args: ['-y', server],
                },
              },
              description: `Add starter MCP entry "${server}" (npx stub — edit .mcp.json for a real server config).`,
            },
          ],
        },
      };
    },
  };
}

function claudeFixedClaudeMdTemplate(
  id: string,
  label: string,
  scope: 'workspace' | 'user',
  absolutePath: (ctx: ArtifactPlannerContext) => string
): ArtifactTemplate {
  return {
    id,
    label,
    presetId: 'claude',
    category: SourceCategoryId.LlmGuideline,
    scope,
    input: {
      title: 'Document title',
      prompt: 'First-line heading in CLAUDE.md',
      valueKind: 'freeText',
    },
    plan(ctx: ArtifactPlannerContext) {
      const abs = absolutePath(ctx);
      if (!abs) {
        return { ok: false, error: 'No target path could be determined.' };
      }
      const title = ctx.userInput.trim();
      return {
        ok: true,
        plan: {
          operations: [
            {
              type: 'writeFile',
              absolutePath: abs,
              content: `# ${title}\n\n`,
            },
          ],
          openAfterCreate: abs,
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
    label: 'New Context File (custom name)',
    presetId: 'claude',
    category: SourceCategoryId.LlmGuideline,
    scope: 'workspace',
    targetDir: (ws) => ws,
    suggestedExtension: '.md',
    initialContent: '# Guidelines\n\n',
  }),
  claudeFixedClaudeMdTemplate(
    'claude/claude-md/workspace',
    'New CLAUDE.md (project root)',
    'workspace',
    (ctx) => (ctx.workspaceRoot ? path.join(ctx.workspaceRoot, 'CLAUDE.md') : '')
  ),
  claudeFixedClaudeMdTemplate(
    'claude/claude-md/user',
    'New CLAUDE.md (global)',
    'user',
    (ctx) => path.join(ctx.roots.claudeUserRoot, 'CLAUDE.md')
  ),
  simpleFileTemplate({
    id: 'claude/hook/workspace',
    label: 'New Hook script only (manual settings)',
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
    label: 'New Hook script only — global (manual settings)',
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
    'New Hook (script + settings.json)',
    'workspace',
    (ctx) => (ctx.workspaceRoot ? path.join(ctx.workspaceRoot, '.claude', 'hooks') : ''),
    (ctx) => path.join(ctx.workspaceRoot, '.claude', 'settings.json')
  ),
  hookConfigTemplate(
    'claude/hook-config/user',
    'New Hook (script + global settings.json)',
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
