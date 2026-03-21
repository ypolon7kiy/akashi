import * as vscode from 'vscode';
import * as os from 'node:os';
import { appendLine } from '../../../log';
import type {
  DiscoveredSource,
  SourceScanOptions,
  WorkspaceSourceScannerPort,
} from '../application/ports';
import { SourceScope, type SourceCategory } from '../domain/model';
import type { SourcePresetId } from '../domain/sourcePresetDefinition';
import { SOURCE_RECORD_ID_FIELD_SEP, sourceRecordId } from '../../../shared/sourceRecordId';
import { buildSourceFacetTags } from '../domain/sourceTags';
import { readToolUserRoots } from './providerUserRoots';
import { collectHomeSourcePaths, selectWorkspaceGlobRows } from './sourceDiscoveryPlan';

export class VscodeWorkspaceSourceScanner implements WorkspaceSourceScannerPort {
  public async scanWorkspace(options: SourceScanOptions): Promise<DiscoveredSource[]> {
    const activePresets = options.activePresets;
    if (activePresets.size === 0) {
      appendLine('[Akashi][SourcesScanner] scanWorkspace skipped (no active presets)');
      return [];
    }
    const workspaceSources = await this.scanWorkspaceSources(activePresets);
    const homeSources = options.includeHomeConfig ? await this.scanHomeSources(activePresets) : [];
    const deduped = dedupeByRecordId([...workspaceSources, ...homeSources]);
    appendLine(
      `[Akashi][SourcesScanner] scanWorkspace complete sourceCount=${deduped.length} includeHome=${options.includeHomeConfig ?? false}`
    );
    return deduped;
  }

  private async scanWorkspaceSources(
    activePresets: ReadonlySet<SourcePresetId>
  ): Promise<DiscoveredSource[]> {
    const rows = selectWorkspaceGlobRows(activePresets);
    if (rows.length === 0) {
      return [];
    }
    const exclude = '**/{node_modules,dist,.git}/**';
    // One row per (path, preset). First matching glob row wins category if several globs hit the same file.
    const byPathPreset = new Map<
      string,
      { path: string; preset: SourcePresetId; category: SourceCategory }
    >();

    for (const row of rows) {
      const uris = await vscode.workspace.findFiles(row.glob, exclude);
      for (const uri of uris) {
        const fsPath = uri.fsPath;
        const key = `${row.presetId}${SOURCE_RECORD_ID_FIELD_SEP}${fsPath}`;
        if (!byPathPreset.has(key)) {
          byPathPreset.set(key, { path: fsPath, preset: row.presetId, category: row.category });
        }
      }
    }

    const out: DiscoveredSource[] = [];
    for (const meta of byPathPreset.values()) {
      out.push(this.toDiscoveredSource(meta.path, 'workspace', meta.preset, meta.category));
    }
    return out;
  }

  private async scanHomeSources(
    activePresets: ReadonlySet<SourcePresetId>
  ): Promise<DiscoveredSource[]> {
    const home = os.homedir();
    const roots = readToolUserRoots(home);
    const discovered = await collectHomeSourcePaths(home, activePresets, {
      claudeUserRoot: roots.claudeUserRoot,
      cursorUserRoot: roots.cursorUserRoot,
      geminiUserRoot: roots.geminiUserRoot,
      codexUserRoot: roots.codexUserRoot,
    });
    return discovered.map((d) => this.toDiscoveredSource(d.path, 'user', d.presetId, d.category));
  }

  private toDiscoveredSource(
    filePath: string,
    origin: 'workspace' | 'user',
    preset: SourcePresetId,
    category: SourceCategory
  ): DiscoveredSource {
    return {
      id: sourceRecordId(preset, origin, filePath),
      path: filePath,
      preset,
      category,
      scope: origin === 'user' ? SourceScope.User : SourceScope.File,
      origin,
      tags: buildSourceFacetTags({ category, preset, origin }),
    };
  }
}

function dedupeByRecordId(sources: DiscoveredSource[]): DiscoveredSource[] {
  const unique = new Map<string, DiscoveredSource>();
  for (const source of sources) {
    if (!unique.has(source.id)) {
      unique.set(source.id, source);
    }
  }
  return [...unique.values()];
}
