import * as vscode from 'vscode';
import * as os from 'node:os';
import * as path from 'node:path';
import { appendLine } from '../../../log';
import type {
  DiscoveredSource,
  SourceScanOptions,
  WorkspaceSourceScannerPort,
} from '../application/ports';
import { SourceKind, SourceScope } from '../domain/model';
import { collectHomeSourcePaths, selectWorkspaceGlobs } from './sourceDiscoveryPlan';
import { readToolUserRoots, type ToolUserRoots } from './providerUserRoots';

export class VscodeWorkspaceSourceScanner implements WorkspaceSourceScannerPort {
  public async scanWorkspace(options: SourceScanOptions): Promise<DiscoveredSource[]> {
    const allowedKinds = options.allowedKinds;
    if (allowedKinds.size === 0) {
      appendLine('[Akashi][SourcesScanner] scanWorkspace skipped (no allowed kinds)');
      return [];
    }
    const workspaceSources = await this.scanWorkspaceSources(allowedKinds);
    const homeSources = options.includeHomeConfig ? await this.scanHomeSources(allowedKinds) : [];
    const deduped = dedupeByPath([...workspaceSources, ...homeSources]);
    appendLine(
      `[Akashi][SourcesScanner] scanWorkspace complete sourceCount=${deduped.length} includeHome=${options.includeHomeConfig ?? false}`
    );
    return deduped;
  }

  private async scanWorkspaceSources(
    allowedKinds: ReadonlySet<SourceKind>
  ): Promise<DiscoveredSource[]> {
    const patterns = selectWorkspaceGlobs(allowedKinds);
    if (patterns.length === 0) {
      return [];
    }
    const exclude = '**/{node_modules,dist,.git}/**';
    const matchSets = await Promise.all(
      patterns.map((glob) => vscode.workspace.findFiles(glob, exclude))
    );
    const uris = matchSets.flat();
    return uris
      .map((uri) => this.toDiscoveredSource(uri.fsPath, 'workspace'))
      .filter((s) => isAllowedDiscovered(s, allowedKinds));
  }

  private async scanHomeSources(
    allowedKinds: ReadonlySet<SourceKind>
  ): Promise<DiscoveredSource[]> {
    const home = os.homedir();
    const roots = readToolUserRoots(home);
    const paths = await collectHomeSourcePaths(home, allowedKinds, {
      claudeUserRoot: roots.claudeUserRoot,
      cursorUserRoot: roots.cursorUserRoot,
      geminiUserRoot: roots.geminiUserRoot,
      codexUserRoot: roots.codexUserRoot,
    });
    return paths
      .map((p) => this.toDiscoveredSource(p, 'user', roots))
      .filter((s) => isAllowedDiscovered(s, allowedKinds));
  }

  private toDiscoveredSource(
    filePath: string,
    origin: 'workspace' | 'user',
    userRoots?: ToolUserRoots
  ): DiscoveredSource {
    const kind =
      origin === 'user' && userRoots
        ? inferUserSourceKind(filePath, userRoots)
        : inferSourceKind(filePath);
    return {
      id: filePath,
      path: filePath,
      kind,
      scope: origin === 'user' ? SourceScope.User : SourceScope.File,
      origin,
    };
  }
}

function isAllowedDiscovered(
  source: DiscoveredSource,
  allowedKinds: ReadonlySet<SourceKind>
): boolean {
  return source.kind !== SourceKind.Unknown && allowedKinds.has(source.kind);
}

function isUnderRoot(filePath: string, rootDir: string): boolean {
  const rel = path.relative(path.normalize(rootDir), path.normalize(filePath));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/** Classify user-scope paths when tool roots may differ from default `~/.tool` layouts. */
function inferUserSourceKind(filePath: string, roots: ToolUserRoots): SourceKind {
  const basename = path.basename(filePath);
  const normalized = filePath.replace(/\\/g, '/');
  const { claudeUserRoot, cursorUserRoot, geminiUserRoot, codexUserRoot } = roots;

  if (basename === 'AGENTS.md' || basename === 'agents.md') {
    return SourceKind.AgentsMd;
  }
  if (basename === '.agents.md') {
    return SourceKind.DotAgentsMd;
  }
  if (basename === 'TEAM_GUIDE.md' || basename === 'team_guide.md') {
    return SourceKind.TeamGuideMd;
  }
  if (basename === 'AGENTS.override.md') {
    return SourceKind.CodexAgentsOverrideMd;
  }
  if (basename.toLowerCase() === 'skill.md') {
    const geminiSkills = path.join(geminiUserRoot, 'antigravity', 'skills');
    if (isUnderRoot(filePath, geminiSkills)) {
      return SourceKind.GeminiAntigravitySkillMd;
    }
    if (normalized.includes('/.agent/skills/')) {
      return SourceKind.GeminiAntigravitySkillMd;
    }
    if (normalized.includes('/.agents/skills/')) {
      return SourceKind.AgentsSkillMd;
    }
    const cursorSkills = path.join(cursorUserRoot, 'skills');
    if (isUnderRoot(filePath, cursorSkills)) {
      return SourceKind.CursorSkillMd;
    }
    const claudeSkills = path.join(claudeUserRoot, 'skills');
    if (isUnderRoot(filePath, claudeSkills)) {
      return SourceKind.ClaudeSkillMd;
    }
    const codexSkills = path.join(codexUserRoot, 'skills');
    if (isUnderRoot(filePath, codexSkills)) {
      return SourceKind.CodexSkillMd;
    }
    return SourceKind.Unknown;
  }
  if (
    (basename === 'CLAUDE.md' || basename === 'claude.md') &&
    isUnderRoot(filePath, claudeUserRoot)
  ) {
    return SourceKind.ClaudeMd;
  }
  const claudeHooks = path.join(claudeUserRoot, 'hooks');
  if (isUnderRoot(filePath, claudeHooks)) {
    return SourceKind.ClaudeHookFile;
  }
  const claudeRules = path.join(claudeUserRoot, 'rules');
  if (isUnderRoot(filePath, claudeRules) && basename.endsWith('.md')) {
    return SourceKind.ClaudeRulesMd;
  }
  if (
    (basename === 'settings.json' || basename === 'settings.local.json') &&
    isUnderRoot(filePath, claudeUserRoot)
  ) {
    return SourceKind.ClaudeSettingsJson;
  }
  if (
    (basename === 'GEMINI.md' || basename === 'gemini.md') &&
    isUnderRoot(filePath, geminiUserRoot)
  ) {
    return SourceKind.GeminiMd;
  }
  if (basename === '.cursorrules') {
    return SourceKind.CursorLegacyRules;
  }
  const cursorRules = path.join(cursorUserRoot, 'rules');
  if (basename.endsWith('.mdc') && isUnderRoot(filePath, cursorRules)) {
    return SourceKind.CursorRulesMdc;
  }
  if (basename === 'mcp.json' && isUnderRoot(filePath, cursorUserRoot)) {
    return SourceKind.CursorMcpJson;
  }
  if (basename === 'config.toml' && isUnderRoot(filePath, codexUserRoot)) {
    return SourceKind.CodexConfigToml;
  }
  const codexRules = path.join(codexUserRoot, 'rules');
  if (basename.endsWith('.rules') && isUnderRoot(filePath, codexRules)) {
    return SourceKind.CodexRulesFile;
  }
  if (basename === 'copilot-instructions.md' && normalized.includes('/.github/')) {
    return SourceKind.GithubCopilotInstructionsMd;
  }
  return SourceKind.Unknown;
}

function inferSourceKind(filePath: string): SourceKind {
  const basename = path.basename(filePath);
  const normalized = filePath.replace(/\\/g, '/');

  if (basename === 'AGENTS.md' || basename === 'agents.md') {
    return SourceKind.AgentsMd;
  }
  if (basename === '.agents.md') {
    return SourceKind.DotAgentsMd;
  }
  if (basename === 'TEAM_GUIDE.md' || basename === 'team_guide.md') {
    return SourceKind.TeamGuideMd;
  }
  if (basename === 'AGENTS.override.md') {
    return SourceKind.CodexAgentsOverrideMd;
  }
  if (basename.toLowerCase() === 'skill.md') {
    if (normalized.includes('/.gemini/antigravity/skills/')) {
      return SourceKind.GeminiAntigravitySkillMd;
    }
    if (normalized.includes('/.agent/skills/')) {
      return SourceKind.GeminiAntigravitySkillMd;
    }
    if (normalized.includes('/.agents/skills/')) {
      return SourceKind.AgentsSkillMd;
    }
    if (normalized.includes('/.cursor/skills/')) {
      return SourceKind.CursorSkillMd;
    }
    if (normalized.includes('/.claude/skills/')) {
      return SourceKind.ClaudeSkillMd;
    }
    if (normalized.includes('/.codex/skills/')) {
      return SourceKind.CodexSkillMd;
    }
    return SourceKind.Unknown;
  }
  if (basename === 'CLAUDE.md' || basename === 'claude.md') {
    return SourceKind.ClaudeMd;
  }
  if (normalized.includes('/.claude/hooks/')) {
    return SourceKind.ClaudeHookFile;
  }
  if (normalized.includes('/.claude/rules/') && basename.endsWith('.md')) {
    return SourceKind.ClaudeRulesMd;
  }
  if (
    (basename === 'settings.json' || basename === 'settings.local.json') &&
    normalized.includes('/.claude/')
  ) {
    return SourceKind.ClaudeSettingsJson;
  }
  if (basename === 'GEMINI.md' || basename === 'gemini.md') {
    return SourceKind.GeminiMd;
  }
  if (basename === '.cursorrules') {
    return SourceKind.CursorLegacyRules;
  }
  if (basename.endsWith('.mdc') && normalized.includes('/.cursor/rules/')) {
    return SourceKind.CursorRulesMdc;
  }
  if (basename === 'mcp.json' && normalized.includes('/.cursor/')) {
    return SourceKind.CursorMcpJson;
  }
  if (basename === 'config.toml' && normalized.includes('/.codex/')) {
    return SourceKind.CodexConfigToml;
  }
  if (basename.endsWith('.rules') && normalized.includes('/.codex/rules/')) {
    return SourceKind.CodexRulesFile;
  }
  if (basename === 'copilot-instructions.md' && normalized.includes('/.github/')) {
    return SourceKind.GithubCopilotInstructionsMd;
  }
  return SourceKind.Unknown;
}

function dedupeByPath(sources: DiscoveredSource[]): DiscoveredSource[] {
  const unique = new Map<string, DiscoveredSource>();
  for (const source of sources) {
    if (!unique.has(source.path)) {
      unique.set(source.path, source);
    }
  }
  return [...unique.values()];
}
