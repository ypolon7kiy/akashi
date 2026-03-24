import * as path from 'node:path';
import type {
  ArtifactTemplate,
  ArtifactPlannerContext,
  HookLifecycleWizardOptions,
} from '../../domain/artifactTemplate';
import { simpleFileTemplate } from '../../domain/artifactTemplateHelpers';
import { SourceCategoryId } from '../../domain/sourceTags';

/** Default agent hook event for new Cursor hooks (cursor.com/docs/hooks). */
export const DEFAULT_CURSOR_HOOK_EVENT = 'postToolUse' as const;

export const CURSOR_HOOK_LIFECYCLE_EVENTS = [
  'postToolUse',
  'preToolUse',
  'afterFileEdit',
  'beforeShellExecution',
  'afterShellExecution',
  'sessionStart',
  'sessionEnd',
  'stop',
] as const;

const cursorHookLifecycleWizard: HookLifecycleWizardOptions = {
  events: [...CURSOR_HOOK_LIFECYCLE_EVENTS],
  defaultEvent: DEFAULT_CURSOR_HOOK_EVENT,
  promptMatcher: true,
};

function cursorRegisteredHookTemplate(
  id: string,
  label: string,
  scope: 'workspace' | 'user',
  hooksDir: (ctx: ArtifactPlannerContext) => string,
  hooksJsonPath: (ctx: ArtifactPlannerContext) => string,
  commandInHooksJson: (hookFileBaseName: string) => string
): ArtifactTemplate {
  return {
    id,
    label,
    presetId: 'cursor',
    category: SourceCategoryId.Hook,
    scope,
    hookLifecycleWizard: cursorHookLifecycleWizard,
    input: { title: 'Hook Name', prompt: 'Hook name (e.g. format-on-save)' },
    plan(ctx: ArtifactPlannerContext) {
      const dir = hooksDir(ctx);
      const jsonFile = hooksJsonPath(ctx);
      if (!dir || !jsonFile) {
        return { ok: false, error: 'No target path could be determined.' };
      }
      const name = ctx.userInput.trim();
      if (!name) {
        return { ok: false, error: 'Enter a name.' };
      }
      const scriptPath = path.join(dir, `${name}.sh`);
      const allowed = CURSOR_HOOK_LIFECYCLE_EVENTS as readonly string[];
      const event =
        ctx.hookLifecycleEvent && allowed.includes(ctx.hookLifecycleEvent)
          ? ctx.hookLifecycleEvent
          : DEFAULT_CURSOR_HOOK_EVENT;
      const hookEntry: Record<string, unknown> = { command: commandInHooksJson(name) };
      const m = ctx.hookMatcher?.trim();
      if (m) {
        hookEntry.matcher = m;
      }
      const matcherLabel = m ?? 'all tools';
      return {
        ok: true,
        plan: {
          operations: [
            {
              type: 'writeFile',
              absolutePath: scriptPath,
              content: `#!/bin/bash\n# Cursor hook: ${name}\n# JSON on stdin; exit 0 = ok, 2 = block\ncat > /dev/null\nexit 0\n`,
            },
            {
              type: 'jsonMerge',
              absolutePath: jsonFile,
              jsonPath: `hooks.${event}`,
              value: [hookEntry],
              ensureTopLevelVersionIfMissing: 1,
              description: `Register Cursor hook "${name}" in hooks.json (${event}, matcher: ${matcherLabel})`,
            },
          ],
          openAfterCreate: scriptPath,
        },
      };
    },
  };
}

function cursorMcpTemplate(
  id: string,
  label: string,
  scope: 'workspace' | 'user',
  mcpPath: (ctx: ArtifactPlannerContext) => string
): ArtifactTemplate {
  return {
    id,
    label,
    presetId: 'cursor',
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
              description: `Add starter MCP entry "${server}" to Cursor mcp.json (npx stub — edit for a real server).`,
            },
          ],
        },
      };
    },
  };
}

function cursorFixedAgentsMdTemplate(): ArtifactTemplate {
  return {
    id: 'cursor/agents-md-fixed/workspace',
    label: 'New AGENTS.md (project root)',
    presetId: 'cursor',
    category: SourceCategoryId.LlmGuideline,
    scope: 'workspace',
    input: {
      title: 'Document title',
      prompt: 'First-line heading in AGENTS.md',
      valueKind: 'freeText',
    },
    plan(ctx: ArtifactPlannerContext) {
      if (!ctx.workspaceRoot) {
        return { ok: false, error: 'No target path could be determined.' };
      }
      const abs = path.join(ctx.workspaceRoot, 'AGENTS.md');
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
    label: 'New Context File (custom name)',
    presetId: 'cursor',
    category: SourceCategoryId.LlmGuideline,
    scope: 'workspace',
    targetDir: (ws) => ws,
    suggestedExtension: '.md',
    initialContent: '# Guidelines\n\n',
  }),
  cursorFixedAgentsMdTemplate(),
  cursorRegisteredHookTemplate(
    'cursor/hook/workspace',
    'New Hook (script + hooks.json)',
    'workspace',
    (ctx) => (ctx.workspaceRoot ? path.join(ctx.workspaceRoot, '.cursor', 'hooks') : ''),
    (ctx) => (ctx.workspaceRoot ? path.join(ctx.workspaceRoot, '.cursor', 'hooks.json') : ''),
    (hookBase) => `.cursor/hooks/${hookBase}.sh`
  ),
  cursorRegisteredHookTemplate(
    'cursor/hook/user',
    'New Hook (script + global hooks.json)',
    'user',
    (ctx) => path.join(ctx.roots.cursorUserRoot, 'hooks'),
    (ctx) => path.join(ctx.roots.cursorUserRoot, 'hooks.json'),
    (hookBase) => `./hooks/${hookBase}.sh`
  ),
  cursorMcpTemplate(
    'cursor/mcp/workspace',
    'New MCP Server',
    'workspace',
    (ctx) => (ctx.workspaceRoot ? path.join(ctx.workspaceRoot, '.cursor', 'mcp.json') : '')
  ),
  cursorMcpTemplate(
    'cursor/mcp/user',
    'New MCP Server (global)',
    'user',
    (ctx) => path.join(ctx.roots.cursorUserRoot, 'mcp.json')
  ),
];
