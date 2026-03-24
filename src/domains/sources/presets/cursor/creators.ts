import * as path from 'node:path';
import type { ArtifactCreator } from '../../domain/artifactCreator';
import { FixedDocCreator } from '../../domain/creators/FixedDocCreator';
import { SimpleFileCreator } from '../../domain/creators/SimpleFileCreator';
import { SourceCategoryId } from '../../domain/sourceTags';
import { CursorMcpCreator } from './creators/CursorMcpCreator';
import { CursorRegisteredHookCreator } from './creators/CursorRegisteredHookCreator';

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

export {
  DEFAULT_CURSOR_HOOK_EVENT,
  CURSOR_HOOK_LIFECYCLE_EVENTS,
} from './creators/CursorRegisteredHookCreator';

export const cursorArtifactCreators: readonly ArtifactCreator[] = [
  new SimpleFileCreator({
    id: 'cursor/skill/workspace',
    label: 'New Skill',
    presetId: 'cursor',
    category: SourceCategoryId.Skill,
    scope: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.cursor', 'skills') : ''),
    suggestedExtension: '.md',
    initialContent: skillContent,
  }),
  new SimpleFileCreator({
    id: 'cursor/skill/user',
    label: 'New Skill (global)',
    presetId: 'cursor',
    category: SourceCategoryId.Skill,
    scope: 'user',
    targetDir: (_ws, roots) => path.join(roots.cursorUserRoot, 'skills'),
    suggestedExtension: '.md',
    initialContent: skillContent,
  }),
  new SimpleFileCreator({
    id: 'cursor/rule/workspace',
    label: 'New Rule',
    presetId: 'cursor',
    category: SourceCategoryId.Rule,
    scope: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.cursor', 'rules') : ''),
    suggestedExtension: '.mdc',
    initialContent: ruleContent,
  }),
  new SimpleFileCreator({
    id: 'cursor/rule/user',
    label: 'New Rule (global)',
    presetId: 'cursor',
    category: SourceCategoryId.Rule,
    scope: 'user',
    targetDir: (_ws, roots) => path.join(roots.cursorUserRoot, 'rules'),
    suggestedExtension: '.mdc',
    initialContent: ruleContent,
  }),
  new SimpleFileCreator({
    id: 'cursor/command/workspace',
    label: 'New Command',
    presetId: 'cursor',
    category: SourceCategoryId.Command,
    scope: 'workspace',
    targetDir: (ws) => (ws ? path.join(ws, '.cursor', 'commands') : ''),
    suggestedExtension: '.md',
    initialContent: commandContent,
  }),
  new SimpleFileCreator({
    id: 'cursor/command/user',
    label: 'New Command (global)',
    presetId: 'cursor',
    category: SourceCategoryId.Command,
    scope: 'user',
    targetDir: (_ws, roots) => path.join(roots.cursorUserRoot, 'commands'),
    suggestedExtension: '.md',
    initialContent: commandContent,
  }),
  new SimpleFileCreator({
    id: 'cursor/context/workspace',
    label: 'New Context File (custom name)',
    presetId: 'cursor',
    category: SourceCategoryId.LlmGuideline,
    scope: 'workspace',
    targetDir: (ws) => ws,
    suggestedExtension: '.md',
    initialContent: '# Guidelines\n\n',
  }),
  new FixedDocCreator({
    id: 'cursor/agents-md-fixed/workspace',
    label: 'New AGENTS.md (project root)',
    presetId: 'cursor',
    category: SourceCategoryId.LlmGuideline,
    scope: 'workspace',
    requireNonEmptyTitle: true,
    inputTitle: 'Document title',
    inputPrompt: 'First-line heading in AGENTS.md',
    absolutePath: (ctx) => (ctx.workspaceRoot ? path.join(ctx.workspaceRoot, 'AGENTS.md') : ''),
    contentForTitle: (title) => `# ${title}\n\n`,
  }),
  new CursorRegisteredHookCreator({
    id: 'cursor/hook/workspace',
    label: 'New Hook (script + hooks.json)',
    scope: 'workspace',
    hooksDir: (ctx) => (ctx.workspaceRoot ? path.join(ctx.workspaceRoot, '.cursor', 'hooks') : ''),
    hooksJsonPath: (ctx) =>
      ctx.workspaceRoot ? path.join(ctx.workspaceRoot, '.cursor', 'hooks.json') : '',
    commandInHooksJson: (hookBase) => `.cursor/hooks/${hookBase}.sh`,
  }),
  new CursorRegisteredHookCreator({
    id: 'cursor/hook/user',
    label: 'New Hook (script + global hooks.json)',
    scope: 'user',
    hooksDir: (ctx) => path.join(ctx.roots.cursorUserRoot, 'hooks'),
    hooksJsonPath: (ctx) => path.join(ctx.roots.cursorUserRoot, 'hooks.json'),
    commandInHooksJson: (hookBase) => `./hooks/${hookBase}.sh`,
  }),
  new CursorMcpCreator({
    id: 'cursor/mcp/workspace',
    label: 'New MCP Server',
    scope: 'workspace',
    mcpPath: (ctx) =>
      ctx.workspaceRoot ? path.join(ctx.workspaceRoot, '.cursor', 'mcp.json') : '',
  }),
  new CursorMcpCreator({
    id: 'cursor/mcp/user',
    label: 'New MCP Server (global)',
    scope: 'user',
    mcpPath: (ctx) => path.join(ctx.roots.cursorUserRoot, 'mcp.json'),
  }),
];
