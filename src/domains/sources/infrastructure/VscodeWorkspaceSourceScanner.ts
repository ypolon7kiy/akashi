import * as vscode from 'vscode';
import * as os from 'node:os';
import { appendLine } from '../../../log';
import type {
  DiscoveredSource,
  SourceScanOptions,
  WorkspaceSourceScannerPort,
} from '../application/ports';
import type { SourceCategory } from '../domain/model';
import type { SourceLocality } from '../domain/artifactKind';
import type { ExcludePatternsGetter } from '../../../shared/config/excludePatterns';
import type { ToolUserRootsResolver } from '../../../shared/config/workspaceConfigTypes';
import type { SourcePresetId } from '../../../shared/sourcePresetId';
import { SOURCE_RECORD_ID_FIELD_SEP, sourceRecordId } from '../../../shared/sourceRecordId';
import { buildSourceFacetTags } from '../domain/sourceTags';
import { collectHomeSourcePaths, selectWorkspaceGlobRows } from './sourceDiscoveryPlan';

export class VscodeWorkspaceSourceScanner implements WorkspaceSourceScannerPort {
  public constructor(
    private readonly resolveToolUserRoots: ToolUserRootsResolver,
    private readonly getExcludePatterns: ExcludePatternsGetter
  ) {}

  public async scanWorkspace(options: SourceScanOptions): Promise<DiscoveredSource[]> {
    const activePresets = options.activePresets;
    if (activePresets.size === 0) {
      appendLine('[Akashi][SourcesScanner] scanWorkspace skipped (no active presets)');
      return [];
    }
    const excludePatterns = await this.getExcludePatterns();
    const [workspaceSources, homeSources] = await Promise.all([
      this.scanWorkspaceSources(activePresets, excludePatterns.findFilesExcludeGlob),
      options.includeHomeConfig
        ? this.scanHomeSources(activePresets, excludePatterns.homeScanSkipDirNames)
        : Promise.resolve([]),
    ]);
    const deduped = dedupeByRecordId([...workspaceSources, ...homeSources]);
    appendLine(
      `[Akashi][SourcesScanner] scanWorkspace complete sourceCount=${deduped.length} includeHome=${options.includeHomeConfig ?? false}`
    );
    return deduped;
  }

  private async scanWorkspaceSources(
    activePresets: ReadonlySet<SourcePresetId>,
    excludeGlob: string
  ): Promise<DiscoveredSource[]> {
    const rows = selectWorkspaceGlobRows(activePresets);
    if (rows.length === 0) {
      return [];
    }
    // One row per (path, preset). First matching glob row wins category if several globs hit the same file.
    const byPathPreset = new Map<
      string,
      { path: string; preset: SourcePresetId; category: SourceCategory }
    >();

    await Promise.all(
      rows.map(async (row) => {
        const uris = await vscode.workspace.findFiles(row.glob, excludeGlob);
        for (const uri of uris) {
          const fsPath = uri.fsPath;
          const key = `${row.presetId}${SOURCE_RECORD_ID_FIELD_SEP}${fsPath}`;
          if (!byPathPreset.has(key)) {
            byPathPreset.set(key, { path: fsPath, preset: row.presetId, category: row.category });
          }
        }
      })
    );

    const out: DiscoveredSource[] = [];
    for (const meta of byPathPreset.values()) {
      out.push(this.toDiscoveredSource(meta.path, 'workspace', meta.preset, meta.category));
    }
    return out;
  }

  private async scanHomeSources(
    activePresets: ReadonlySet<SourcePresetId>,
    skipDirNames: ReadonlySet<string>
  ): Promise<DiscoveredSource[]> {
    const home = os.homedir();
    const roots = this.resolveToolUserRoots(home);
    const discovered = await collectHomeSourcePaths(home, activePresets, {
      claudeUserRoot: roots.claudeUserRoot,
      cursorUserRoot: roots.cursorUserRoot,
      geminiUserRoot: roots.geminiUserRoot,
      codexUserRoot: roots.codexUserRoot,
      skipDirNames,
    });
    return discovered.map((d) => this.toDiscoveredSource(d.path, 'user', d.presetId, d.category));
  }

  private toDiscoveredSource(
    filePath: string,
    locality: SourceLocality,
    preset: SourcePresetId,
    category: SourceCategory
  ): DiscoveredSource {
    return {
      id: sourceRecordId(preset, locality, filePath),
      path: filePath,
      preset,
      category,
      locality,
      tags: buildSourceFacetTags({ category, preset, locality }),
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
