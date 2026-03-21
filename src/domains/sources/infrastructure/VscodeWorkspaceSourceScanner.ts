import * as vscode from 'vscode';
import * as os from 'node:os';
import { appendLine } from '../../../log';
import type {
  DiscoveredSource,
  SourceScanOptions,
  WorkspaceSourceScannerPort,
} from '../application/ports';
import { SourceKind, SourceScope } from '../domain/model';
import type { ToolUserRoots } from '../domain/toolUserRoots';
import { inferUserSourceKind, inferWorkspaceSourceKind } from './classifySourcePath';
import { collectHomeSourcePaths, selectWorkspaceGlobs } from './sourceDiscoveryPlan';
import { readToolUserRoots } from './providerUserRoots';

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
        : inferWorkspaceSourceKind(filePath);
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

function dedupeByPath(sources: DiscoveredSource[]): DiscoveredSource[] {
  const unique = new Map<string, DiscoveredSource>();
  for (const source of sources) {
    if (!unique.has(source.path)) {
      unique.set(source.path, source);
    }
  }
  return [...unique.values()];
}
