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
    const paths = await collectHomeSourcePaths(home, allowedKinds);
    return paths
      .map((p) => this.toDiscoveredSource(p, 'user'))
      .filter((s) => isAllowedDiscovered(s, allowedKinds));
  }

  private toDiscoveredSource(filePath: string, origin: 'workspace' | 'user'): DiscoveredSource {
    return {
      id: filePath,
      path: filePath,
      kind: inferSourceKind(filePath),
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
