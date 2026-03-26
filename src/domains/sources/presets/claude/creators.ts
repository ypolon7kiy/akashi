import * as path from 'node:path';
import type { ArtifactCreator } from '../../domain/artifactCreator';
import { FixedDocCreator } from '../../domain/creators/FixedDocCreator';
import { SimpleFileCreator } from '../../domain/creators/SimpleFileCreator';
import { SkillFileCreator } from '../../domain/creators/SkillFileCreator';
import { SourceCategoryId } from '../../domain/sourceTags';
import { ClaudeMcpCreator } from './creators/ClaudeMcpCreator';
import { ClaudeRegisteredHookCreator } from './creators/ClaudeRegisteredHookCreator';

function ruleContent(fileName: string): string {
  const name = fileName.replace(/\.md$/i, '');
  return `---\ndescription: ${name}\n---\n\n`;
}

function commandContent(fileName: string): string {
  const name = fileName.replace(/\.md$/i, '');
  return `---\ndescription: ${name}\n---\n\n`;
}

export {
  DEFAULT_CLAUDE_HOOK_EVENT,
  CLAUDE_HOOK_LIFECYCLE_EVENTS,
} from './creators/ClaudeRegisteredHookCreator';

export const claudeArtifactCreators: readonly ArtifactCreator[] = [
  new SkillFileCreator({
    id: 'claude/skill/workspace',
    label: 'New Skill',
    presetId: 'claude',
    category: SourceCategoryId.Skill,
    locality: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.claude', 'skills') : ''),
    layout: { kind: 'flat', suggestedExtension: '.md' },
  }),
  new SkillFileCreator({
    id: 'claude/skill/user',
    label: 'New Skill (global)',
    presetId: 'claude',
    category: SourceCategoryId.Skill,
    locality: 'user',
    targetDir: (_ws, roots) => path.join(roots.claudeUserRoot, 'skills'),
    layout: { kind: 'flat', suggestedExtension: '.md' },
  }),
  new SimpleFileCreator({
    id: 'claude/rule/workspace',
    label: 'New Rule',
    presetId: 'claude',
    category: SourceCategoryId.Rule,
    locality: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.claude', 'rules') : ''),
    suggestedExtension: '.md',
    initialContent: ruleContent,
  }),
  new SimpleFileCreator({
    id: 'claude/rule/user',
    label: 'New Rule (global)',
    presetId: 'claude',
    category: SourceCategoryId.Rule,
    locality: 'user',
    targetDir: (_ws, roots) => path.join(roots.claudeUserRoot, 'rules'),
    suggestedExtension: '.md',
    initialContent: ruleContent,
  }),
  new SimpleFileCreator({
    id: 'claude/command/workspace',
    label: 'New Command',
    presetId: 'claude',
    category: SourceCategoryId.Command,
    locality: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.claude', 'commands') : ''),
    suggestedExtension: '.md',
    initialContent: commandContent,
  }),
  new SimpleFileCreator({
    id: 'claude/command/user',
    label: 'New Command (global)',
    presetId: 'claude',
    category: SourceCategoryId.Command,
    locality: 'user',
    targetDir: (_ws, roots) => path.join(roots.claudeUserRoot, 'commands'),
    suggestedExtension: '.md',
    initialContent: commandContent,
  }),
  new SimpleFileCreator({
    id: 'claude/context/workspace',
    label: 'New Context File (custom name)',
    presetId: 'claude',
    category: SourceCategoryId.LlmGuideline,
    locality: 'workspace',
    targetDir: (ws) => ws,
    suggestedExtension: '.md',
    initialContent: '# Guidelines\n\n',
  }),
  new FixedDocCreator({
    id: 'claude/claude-md/workspace',
    label: 'New CLAUDE.md (project root)',
    presetId: 'claude',
    category: SourceCategoryId.LlmGuideline,
    locality: 'workspace',
    requireNonEmptyTitle: true,
    inputTitle: 'Document title',
    inputPrompt: 'First-line heading in CLAUDE.md',
    absolutePath: (ctx) => (ctx.workspaceRoot ? path.join(ctx.workspaceRoot, 'CLAUDE.md') : ''),
    contentForTitle: (title) => `# ${title}\n\n`,
  }),
  new FixedDocCreator({
    id: 'claude/claude-md/user',
    label: 'New CLAUDE.md (global)',
    presetId: 'claude',
    category: SourceCategoryId.LlmGuideline,
    locality: 'user',
    requireNonEmptyTitle: true,
    inputTitle: 'Document title',
    inputPrompt: 'First-line heading in CLAUDE.md',
    absolutePath: (ctx) => path.join(ctx.roots.claudeUserRoot, 'CLAUDE.md'),
    contentForTitle: (title) => `# ${title}\n\n`,
  }),
  new SimpleFileCreator({
    id: 'claude/hook/workspace',
    label: 'New Hook script only (manual settings)',
    presetId: 'claude',
    category: SourceCategoryId.Hook,
    locality: 'workspace',
    inputTitle: 'Hook Name',
    inputPrompt: 'Hook name (e.g. lint-on-save)',
    targetDir: (ws) => (ws ? path.join(ws, '.claude', 'hooks') : ''),
    suggestedExtension: '.sh',
    initialContent: (fileName: string) => {
      const name = fileName.replace(/\.sh$/i, '');
      return `#!/bin/bash\n# Hook: ${name}\n\n`;
    },
  }),
  new SimpleFileCreator({
    id: 'claude/hook/user',
    label: 'New Hook script only — global (manual settings)',
    presetId: 'claude',
    category: SourceCategoryId.Hook,
    locality: 'user',
    inputTitle: 'Hook Name',
    inputPrompt: 'Hook name (e.g. lint-on-save)',
    targetDir: (_ws, roots) => path.join(roots.claudeUserRoot, 'hooks'),
    suggestedExtension: '.sh',
    initialContent: (fileName: string) => {
      const name = fileName.replace(/\.sh$/i, '');
      return `#!/bin/bash\n# Hook: ${name}\n\n`;
    },
  }),
  new ClaudeRegisteredHookCreator({
    id: 'claude/hook-config/workspace',
    label: 'New Hook (script + settings.json)',
    locality: 'workspace',
    hooksDir: (ctx) => (ctx.workspaceRoot ? path.join(ctx.workspaceRoot, '.claude', 'hooks') : ''),
    settingsPath: (ctx) => path.join(ctx.workspaceRoot, '.claude', 'settings.json'),
  }),
  new ClaudeRegisteredHookCreator({
    id: 'claude/hook-config/user',
    label: 'New Hook (script + global settings.json)',
    locality: 'user',
    hooksDir: (ctx) => path.join(ctx.roots.claudeUserRoot, 'hooks'),
    settingsPath: (ctx) => path.join(ctx.roots.claudeUserRoot, 'settings.json'),
  }),
  new ClaudeMcpCreator({
    id: 'claude/mcp/workspace',
    label: 'New MCP Server',
    locality: 'workspace',
    mcpPath: (ctx) => (ctx.workspaceRoot ? path.join(ctx.workspaceRoot, '.mcp.json') : ''),
  }),
  new ClaudeMcpCreator({
    id: 'claude/mcp/user',
    label: 'New MCP Server (global)',
    locality: 'user',
    mcpPath: (ctx) => path.join(ctx.roots.claudeUserRoot, '.mcp.json'),
  }),
];
