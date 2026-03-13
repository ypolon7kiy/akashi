import * as vscode from 'vscode';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { appendLine } from '../../../log';
import type {
  DiscoveredSource,
  SourceScanOptions,
  WorkspaceSourceScannerPort,
} from '../application/ports';
import { SourceKind, SourceScope } from '../domain/model';

export class VscodeWorkspaceSourceScanner implements WorkspaceSourceScannerPort {
  public async scanWorkspace(options: SourceScanOptions = {}): Promise<DiscoveredSource[]> {
    const workspaceSources = await this.scanWorkspaceSources();
    const homeSources = options.includeHomeConfig ? await this.scanHomeSources() : [];
    return dedupeByPath([...workspaceSources, ...homeSources]);
  }

  private async scanWorkspaceSources(): Promise<DiscoveredSource[]> {
    const patterns = [
      '**/{AGENTS.md,agents.md,.agents.md,TEAM_GUIDE.md,team_guide.md,CLAUDE.md,claude.md,GEMINI.md,gemini.md,.cursorrules}',
      '**/.cursor/rules/*.mdc',
      '**/.cursor/mcp.json',
      '**/.github/copilot-instructions.md',
    ];
    const exclude = '**/{node_modules,dist,.git}/**';
    const matchSets = await Promise.all(
      patterns.map((glob) => vscode.workspace.findFiles(glob, exclude))
    );
    const uris = matchSets.flat();
    return uris.map((uri) => this.toDiscoveredSource(uri.fsPath, 'workspace'));
  }

  private async scanHomeSources(): Promise<DiscoveredSource[]> {
    const home = os.homedir();
    const candidates = [
      path.join(home, '.cursor', 'mcp.json'),
      path.join(home, '.codex', 'config.toml'),
      path.join(home, '.claude', 'CLAUDE.md'),
      path.join(home, '.gemini', 'GEMINI.md'),
    ];
    const discovered: DiscoveredSource[] = [];
    await Promise.all(
      candidates.map(async (candidate) => {
        if (await fileExists(candidate)) {
          discovered.push(this.toDiscoveredSource(candidate, 'user'));
        }
      })
    );
    return discovered;
  }

  private toDiscoveredSource(filePath: string, origin: 'workspace' | 'user'): DiscoveredSource {
    const source: DiscoveredSource = {
      id: filePath,
      path: filePath,
      kind: inferSourceKind(filePath),
      scope: origin === 'user' ? SourceScope.User : SourceScope.File,
      origin,
    };
    appendLine(
      `[Akashi][SourcesScanner] Found source: kind=${source.kind} origin=${source.origin} path=${source.path}`
    );
    return source;
  }
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

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}
