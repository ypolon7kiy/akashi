# Plan: Content-Aware Secondary Discovery — Strategy Pattern

## Context

The sources domain discovers artifacts purely by structural analysis (globs, path checks) — it never reads file contents. This means it knows what *exists* but not what's *effective*. Settings files declare what's enabled, `.mcp.json` declares server configurations, `plugin.json` declares components — all invisible to the current index.

**Goal**: Introduce a generic **content inspection** layer using the Strategy pattern. Any discovered file can have one or more **inspection strategies** attached. Each strategy reads the file content and produces secondary discovery directives. The system is open for extension (new strategies) without modifying the core orchestration.

---

## Architecture: Strategy-Based Content Inspection

```
Phase 1 (existing, unchanged):
  Preset Globs + Home Tasks -> DiscoveredSource[] -> stat() -> IndexedSourceEntry[]

Phase 2 (new — strategy-driven, two explicit passes):
  Pre-scan inspectors (phase 1):
    match inspectors against phase-1 entries
    -> read file content in parallel (once per unique path, size-guarded via known byteLength)
    -> each inspector produces InspectionResult
    -> resolve annotations

  Post-scan inspectors (phase 2):
    execute DirectoryScanDirectives from pre-scan in parallel
    -> stat secondaries -> build secondary IndexedSourceEntry[]
    -> match post-scan inspectors against secondary entries
    -> read + inspect in parallel -> produce more annotations

  Merge all records + annotations -> linkArtifacts() -> save snapshot (v8)
```

Key principles:
- **Multiple strategies can inspect the same file** — settings.json inspected for plugins, hooks, permissions
- **Explicit two-pass orchestration** — no unbounded recursion, clear dependency flow
- **Pre-scan / post-scan phases** — pre-scan inspectors see only structural entries, post-scan inspectors see secondaries and resolved annotations from pre-scan
- **Parallel I/O** — file reads and directory scans use `Promise.all` across independent paths
- **Content cache** — each unique path is read once; the cache is a `Map<string, string>` keyed by normalized path, shared across all inspectors matching that path

### Performance Constraint

Content inspection adds I/O to the indexing hot path (`performIndexWorkspace` fires on workspace open and on file-change events via 800ms debounce). To keep this bounded:
- Pre-scan reads are limited to files already discovered by phase-1 globs (typically 4-6 files for the Claude preset)
- Directory scans in post-scan phase are bounded by the number of installed plugins
- **Latency target**: content inspection should complete within **200ms on a warm local filesystem**
- If the target is exceeded (e.g., many plugins on NFS), content inspection can be made **opt-in per indexing request** via a flag, skipping it on file-change re-indexes and running only on full workspace-open indexes

---

## Domain Model

### Step 1: Shared Scope Type — `src/shared/settingsScope.ts` (new file)

```typescript
/**
 * The three settings scopes used by Claude Code's layered configuration.
 * Shared across sources and addons domains.
 * Precedence: local > project > user.
 */
export type SettingsScope = 'user' | 'project' | 'local';
```

This replaces the existing `CliScope` in `src/domains/addons/domain/cliTypes.ts` and the proposed `InspectionScope`, eliminating the duplication. Update `cliTypes.ts` to import from shared.

### Step 2: Core Abstractions — `src/domains/sources/domain/contentInspection.ts` (new file)

```typescript
import type { SourcePresetId } from '../../../shared/sourcePresetId';
import type { SettingsScope } from '../../../shared/settingsScope';
import type { IndexedSourceEntry, SourceCategory } from './model';
import type { SourceLocality } from './artifactKind';

// ---------------------------------------------------------------------------
// Annotation value — constrained to JSON-safe serializable types
// ---------------------------------------------------------------------------

/** Serializable annotation value. No `unknown` — every branch is JSON-safe. */
export type AnnotationValue =
  | string
  | number
  | boolean
  | null
  | readonly string[];

// ---------------------------------------------------------------------------
// Inspector phase
// ---------------------------------------------------------------------------

/**
 * Pre-scan inspectors run on phase-1 (structural) entries.
 * Post-scan inspectors run on secondary entries discovered during directory scans.
 */
export type InspectorPhase = 1 | 2;

// ---------------------------------------------------------------------------
// Core strategy interface
// ---------------------------------------------------------------------------

/**
 * Predicate: should this strategy run for a given entry?
 * Pure — no I/O.
 */
export type EntryMatcher = (entry: IndexedSourceEntry) => boolean;

/**
 * A single content inspection strategy.
 * Receives file content as string, returns structured directives.
 * PURE FUNCTION — no I/O, no side effects.
 */
export interface ContentInspector {
  /** Unique strategy id. Use INSPECTOR_IDS constants, not string literals. */
  readonly id: string;
  readonly presetId: SourcePresetId;
  /** Which pass this inspector runs in (1 = pre-scan, 2 = post-scan). */
  readonly phase: InspectorPhase;
  /** When does this strategy activate? */
  readonly match: EntryMatcher;
  /**
   * Parse file content -> produce discovery directives.
   * Called once per matched entry. May return empty result.
   */
  readonly inspect: (
    content: string,
    entry: IndexedSourceEntry,
    ctx: InspectionContext
  ) => InspectionResult;
}

// ---------------------------------------------------------------------------
// Context — what inspectors can see
// ---------------------------------------------------------------------------

/**
 * Read-only context available to all inspectors.
 * Pre-scan inspectors get minimal context.
 * Post-scan inspectors also see resolved annotations from pre-scan.
 */
export interface InspectionContext {
  readonly homeDir: string;
  readonly workspaceRoot: string;
  /**
   * Check whether a path already exists in the phase-1 index.
   * Narrow API — inspectors do NOT see the full entry list.
   */
  readonly hasIndexedPath: (path: string) => boolean;
  /**
   * Annotations resolved from pre-scan inspectors.
   * Available to post-scan inspectors only (empty map for pre-scan).
   */
  readonly resolvedAnnotations: ReadonlyMap<string, AnnotationValue>;
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

/**
 * Output of a single inspector — all fields optional.
 * The orchestrator merges results from all inspectors.
 */
export interface InspectionResult {
  /** Which inspector produced this. */
  readonly inspectorId: string;
  /** Concrete file paths to add to the index. */
  readonly secondaryPaths?: readonly SecondaryPathDirective[];
  /** Directories to recursively scan for files, then add to the index. */
  readonly directoryScans?: readonly DirectoryScanDirective[];
  /** Key-value annotations to attach to the snapshot. */
  readonly annotations?: readonly InspectionAnnotation[];
  /** Non-fatal issues encountered during inspection. */
  readonly diagnostics?: readonly InspectionDiagnostic[];
}

// ---------------------------------------------------------------------------
// Directives
// ---------------------------------------------------------------------------

/** A single file to add to the index from secondary discovery. */
export interface SecondaryPathDirective {
  readonly path: string;
  readonly category: SourceCategory;
  readonly locality: SourceLocality;
  readonly provenance: DiscoveryProvenance;
}

/** A prefix-to-category mapping rule, evaluated in array order. */
export interface CategoryPrefixRule {
  readonly prefix: string;
  readonly category: SourceCategory;
}

/**
 * A directory to recursively scan, categorizing found files.
 *
 * Uses a declarative ordered array of prefix rules instead of a runtime function,
 * so the directive remains JSON-serializable and iteration order is explicit.
 */
export interface DirectoryScanDirective {
  readonly rootPath: string;
  readonly locality: SourceLocality;
  readonly provenance: DiscoveryProvenance;
  /**
   * Ordered prefix-to-category rules.
   * Evaluated in array order; first matching prefix wins.
   * Longest prefixes should come first to avoid shadowing.
   */
  readonly categoryRules: readonly CategoryPrefixRule[];
  /** Category for files that don't match any prefix rule. null = skip file. */
  readonly fallbackCategory: SourceCategory | null;
  /**
   * Exact relative paths to include regardless of prefix matching.
   * E.g., { '.mcp.json': 'mcp', '.claude-plugin/plugin.json': 'config' }
   */
  readonly exactPaths?: Readonly<Record<string, SourceCategory>>;
  /**
   * Directory names to skip during recursive walk.
   * Defaults to DEFAULT_SCAN_SKIP_DIRS if not provided.
   */
  readonly skipDirNames?: readonly string[];
}

/** Sensible defaults for directory names to skip during plugin scans. */
export const DEFAULT_SCAN_SKIP_DIRS: ReadonlySet<string> = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', '.next', '__pycache__',
]);

// ---------------------------------------------------------------------------
// Provenance
// ---------------------------------------------------------------------------

/** Tracks how a secondary entry was discovered. */
export interface DiscoveryProvenance {
  /** Inspector strategy that produced this directive. */
  readonly inspectorId: string;
  /** Stable path of the anchor entry (survives re-indexing). */
  readonly anchorPath: string;
  /** Opaque origin label (e.g., plugin id, MCP server name). */
  readonly originLabel?: string;
}

// ---------------------------------------------------------------------------
// Annotations
// ---------------------------------------------------------------------------

/** A typed key-value annotation produced by an inspector. */
export interface InspectionAnnotation {
  /** Dot-path key. Use annotation key builder functions, not string literals. */
  readonly key: string;
  readonly value: AnnotationValue;
  /** Which scope/layer produced this. */
  readonly scope?: SettingsScope;
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

export type DiagnosticSeverity = 'error' | 'warning';

/** Non-fatal issue encountered during content inspection. */
export interface InspectionDiagnostic {
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  /** Path of the file that caused the issue. */
  readonly filePath: string;
  /** Inspector that encountered the issue. */
  readonly inspectorId: string;
}
```

### Step 3: Extend Existing Domain Types

**`src/domains/sources/domain/model.ts`**:
```typescript
export interface IndexedSourceEntry {
  // ...existing fields...
  /** Present only for entries discovered via content inspection. */
  readonly provenance?: DiscoveryProvenance;
}

export interface SourceIndexSnapshot {
  // ...existing fields...
  // Note: resolved annotations stored in a SEPARATE globalState key
  // (sources.resolvedAnnotations.v8) to avoid bloating the main snapshot.
}
```

**`src/domains/sources/domain/artifact.ts`**:
```typescript
export interface IndexedArtifact {
  // ...existing fields...
  /** Origin label if all members share the same provenance origin. */
  readonly originLabel?: string;
}
```

All new fields optional — backward compatible with v7. Snapshot writes as **v8**.

### Step 4: New Port — `SourceFileContentPort`

**`src/domains/sources/application/ports.ts`**:
```typescript
/**
 * Read file content and list directories for content inspection.
 * Implementations must enforce size limits and path validation.
 */
export interface SourceFileContentPort {
  /**
   * Read file as UTF-8 string.
   * Returns null if file doesn't exist or exceeds maxBytes.
   * If knownByteLength is provided, skips the internal stat for size check.
   */
  readFileContent(
    path: string,
    options?: { maxBytes?: number; knownByteLength?: number }
  ): Promise<string | null>;
  /**
   * List files recursively under a directory.
   * Must validate rootDir against allowed path prefixes before scanning.
   */
  listFilesRecursive(
    rootDir: string,
    skipDirNames?: ReadonlySet<string>
  ): Promise<readonly string[]>;
}
```

**`src/domains/sources/infrastructure/NodeSourceFileContent.ts`** (new file):
```typescript
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { collectFilesRecursiveUnderDir } from './sourceDiscoveryPlan';
// ^ Export this existing function rather than reimplementing the walk

const DEFAULT_MAX_BYTES = 1_048_576; // 1 MB

export class NodeSourceFileContent implements SourceFileContentPort {
  constructor(
    private readonly allowedPathPrefixes: readonly string[]
  ) {}

  async readFileContent(
    filePath: string,
    options?: { maxBytes?: number; knownByteLength?: number }
  ): Promise<string | null> {
    const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES;
    try {
      // Skip stat if caller already has the byte length from phase-1 metadata
      if (options?.knownByteLength !== undefined) {
        if (options.knownByteLength > maxBytes) return null;
      } else {
        const stat = await fs.stat(filePath);
        if (stat.size > maxBytes) return null;
      }
      return await fs.readFile(filePath, 'utf-8');
    } catch {
      return null;
    }
  }

  async listFilesRecursive(
    rootDir: string,
    skipDirNames?: ReadonlySet<string>
  ): Promise<readonly string[]> {
    // Path traversal guard: rootDir must be under an allowed prefix
    const normalizedRoot = path.resolve(rootDir);
    const allowed = this.allowedPathPrefixes.some(
      (prefix) => normalizedRoot.startsWith(path.resolve(prefix))
    );
    if (!allowed) return [];

    // Delegate to the existing exported walker
    return collectFilesRecursiveUnderDir(normalizedRoot, skipDirNames ?? new Set());
  }
}
```

The `allowedPathPrefixes` are injected at construction (e.g., `[homeDir, workspaceRoot]`), preventing arbitrary path traversal from malicious `installed_plugins.json` entries.

**Also modify** `src/domains/sources/infrastructure/sourceDiscoveryPlan.ts` — export `collectFilesRecursiveUnderDir` (currently module-private).

### Step 5: Extend Preset Definition

**`src/domains/sources/domain/sourcePresetDefinition.ts`**:
```typescript
export interface SourcePresetDefinition {
  readonly id: SourcePresetId;
  readonly workspaceGlobContributions: readonly WorkspaceGlobContribution[];
  readonly homePathTasks: readonly HomePathTask[];
  readonly artifactCreators: readonly ArtifactCreator[];
  /** Content inspection strategies contributed by this preset. Optional. */
  readonly contentInspectors?: readonly ContentInspector[];
}
```

**`src/domains/sources/registerSourcePresets.ts`** — flatten:
```typescript
export const CONTENT_INSPECTORS: readonly ContentInspector[] =
  SOURCE_PRESET_DEFINITIONS.flatMap(p => p.contentInspectors ?? []);
```

### Step 6: Move `parsePluginManifest` to Shared

**Move**: `src/domains/addons/domain/pluginManifest.ts` -> `src/shared/pluginManifest.ts`

This is a pure function with no domain dependencies. Moving it to `shared/` eliminates the cross-domain coupling between sources and addons. Update the import in `src/domains/addons/` to point to the new location.

Re-export from addons domain for backward compatibility (verify `CreatorBasedInstaller.ts` import still resolves):
```typescript
// src/domains/addons/domain/pluginManifest.ts
export { parsePluginManifest, DEFAULT_PLUGIN_DIRS } from '../../../shared/pluginManifest';
export type { PluginManifest } from '../../../shared/pluginManifest';
```

### Step 7: Orchestration in SourcesService

**`src/domains/sources/application/SourcesService.ts`** — new constructor param `contentReader: SourceFileContentPort`, new method:

```typescript
private async runContentInspection(
  phase1Records: readonly IndexedSourceEntry[],
  inspectors: readonly ContentInspector[]
): Promise<{
  secondaryRecords: readonly IndexedSourceEntry[];
  resolvedAnnotations: Readonly<Record<string, AnnotationValue>>;
  diagnostics: readonly InspectionDiagnostic[];
}>
```

**Two-pass orchestration (explicit, parallel I/O, no recursion):**

```typescript
// ── Pass 1: Pre-scan inspectors ──────────────────────────────
const preScanInspectors = inspectors.filter(i => i.phase === 1);
const indexedPaths = new Set(phase1Records.map(r => r.path));

// Group entries by unique path -> matching inspectors
const pathToInspectors = groupMatchedInspectors(phase1Records, preScanInspectors);

// Read all matched files in PARALLEL, build content cache
const contentCache = new Map<string, string>();
await Promise.all(
  [...pathToInspectors.keys()].map(async (path) => {
    const entry = pathToInspectors.get(path)!.entry;
    const content = await this.contentReader.readFileContent(path, {
      knownByteLength: entry.metadata.byteLength,  // skip redundant stat
    });
    if (content !== null) {
      contentCache.set(path, content);
    } else {
      diagnostics.push(buildMissingFileDiagnostic(path, entry));
    }
  })
);

// Run inspectors (pure, sync) using cached content
const pass1Results: InspectionResult[] = [];
for (const [path, { entry, inspectors }] of pathToInspectors) {
  const content = contentCache.get(path);
  if (!content) continue;
  const ctx: InspectionContext = {
    homeDir, workspaceRoot,
    hasIndexedPath: (p) => indexedPaths.has(p),
    resolvedAnnotations: new Map(),  // empty for pre-scan
  };
  for (const inspector of inspectors) {
    pass1Results.push(inspector.inspect(content, entry, ctx));
  }
}

// Resolve pre-scan annotations
const pass1Annotations = pass1Results.flatMap(r => r.annotations ?? []);
const resolvedAnnotations = resolveAnnotations(pass1Annotations, ['local','project','user']);

// ── Pass 2: Directory scans + post-scan inspectors ───────────
const scanDirectives = pass1Results.flatMap(r => r.directoryScans ?? []);

// Execute ALL directory scans in PARALLEL
const secondaryEntries = (await Promise.all(
  scanDirectives.map(async (directive) => {
    const skipSet = directive.skipDirNames
      ? new Set(directive.skipDirNames)
      : DEFAULT_SCAN_SKIP_DIRS;
    const files = await this.contentReader.listFilesRecursive(directive.rootPath, skipSet);
    return categorizeFiles(files, directive);
  })
)).flat();

// Stat all secondaries in parallel
const secondaryRecords = await Promise.all(
  secondaryEntries.map(async (item) => {
    const metadata = await this.fileStats.statFile(item.path);
    return { ...item, metadata };
  })
);

// Run post-scan inspectors on secondaries (parallel reads, sync inspectors)
const postScanInspectors = inspectors.filter(i => i.phase === 2);
// ... same pattern: group, parallel read, run pure inspectors ...
// Post-scan DirectoryScanDirectives are IGNORED (no further passes).
```

**Note on TOCTOU**: If `readFileContent` returns null for an entry that exists in the index (file changed between stat and read — e.g., grew beyond maxBytes), the entry is retained in the index with its structural metadata, but an inspection diagnostic is emitted to indicate partial indexing.

The `performIndexWorkspace` method becomes:
```typescript
private async performIndexWorkspace(request): Promise<SourceIndexSnapshot> {
  const activePresets = request.activePresets ?? this.getActiveSourcePresets();

  // Phase 1: Structural discovery (unchanged)
  const discovered = await this.scanner.scanWorkspace({ ... });
  const phase1Records = await Promise.all(
    discovered.map(async (item) => {
      const metadata = await this.fileStats.statFile(item.path);
      return { ...item, metadata };
    })
  );

  // Phase 2: Content inspection (two-pass, parallel I/O)
  const inspectors = this.getActiveInspectors(activePresets);
  const { secondaryRecords, resolvedAnnotations, diagnostics } =
    await this.runContentInspection(phase1Records, inspectors);

  // Log diagnostics
  for (const d of diagnostics) {
    this.logger.info(`[Akashi][Sources] ${d.severity}: ${d.message} (${d.filePath})`);
  }

  // Merge and link
  const allRecords = [...phase1Records, ...secondaryRecords];
  const artifacts = linkArtifacts(allRecords);
  const snapshot: SourceIndexSnapshot = {
    generatedAt: new Date().toISOString(),
    sourceCount: allRecords.length,
    records: allRecords,
    artifacts,
  };
  this.snapshot = snapshot;
  await this.snapshotStore.save(snapshot);

  // Store resolved annotations in a SEPARATE globalState key to avoid bloating snapshot
  await this.snapshotStore.saveAnnotations(resolvedAnnotations);

  return snapshot;
}
```

### Step 8: Annotation Precedence Resolver — `src/domains/sources/domain/annotationResolver.ts` (new file)

```typescript
import type { InspectionAnnotation, AnnotationValue } from './contentInspection';

/**
 * Resolve annotations with scope precedence.
 * For each unique key, the highest-priority scope wins.
 *
 * @param annotations — all annotations from inspectors
 * @param scopePriority — ordered highest-first, e.g. ['local', 'project', 'user']
 * @returns record of key -> resolved value (JSON-serializable)
 */
export function resolveAnnotations(
  annotations: readonly InspectionAnnotation[],
  scopePriority: readonly string[]
): Readonly<Record<string, AnnotationValue>> {
  const byKey = new Map<string, { value: AnnotationValue; priority: number }>();
  for (const a of annotations) {
    const priority = a.scope ? scopePriority.indexOf(a.scope) : scopePriority.length;
    const existing = byKey.get(a.key);
    const effectivePriority = priority === -1 ? scopePriority.length + 1 : priority;
    if (!existing || effectivePriority < existing.priority) {
      byKey.set(a.key, { value: a.value, priority: effectivePriority });
    }
  }
  const result: Record<string, AnnotationValue> = {};
  for (const [key, { value }] of byKey) {
    result[key] = value;
  }
  return result;
}
```

### Step 9: Claude Preset Inspectors — `src/domains/sources/presets/claude/inspectors.ts` (new file)

#### Inspector ID Constants

```typescript
export const INSPECTOR_IDS = {
  PLUGIN_ENABLEMENT: 'claude:plugin-enablement',
  INSTALLED_PLUGINS: 'claude:installed-plugins',
  MCP_SERVERS: 'claude:mcp-servers',
  HOOKS_CONFIG: 'claude:hooks-config',
  PLUGIN_MANIFEST: 'claude:plugin-manifest',
} as const;
```

#### Annotation Key Builders

```typescript
import { DEFAULT_PLUGIN_DIRS } from '../../../shared/pluginManifest';

export const ANNOTATION_KEYS = {
  pluginEnabled: (pluginId: string) => `enabledPlugins.${pluginId}` as const,
  mcpServer: (name: string) => `mcpServers.${name}.command` as const,
  hookEvent: (event: string) => `hooks.${event}` as const,
  pluginMeta: (pluginId: string, field: string) => `pluginMeta.${pluginId}.${field}` as const,
} as const;
```

#### Shared JSON Parse Helper

```typescript
function parseJsonContent(
  content: string,
  filePath: string,
  inspectorId: string
): { parsed: unknown; diagnostic?: InspectionDiagnostic } {
  try {
    return { parsed: JSON.parse(content) };
  } catch {
    return {
      parsed: null,
      diagnostic: {
        severity: 'warning',
        message: `Invalid JSON in ${path.basename(filePath)}`,
        filePath,
        inspectorId,
      },
    };
  }
}
```

#### Inspector Definitions

**Inspector A: `claude:plugin-enablement`** (pre-scan)
- Match: `category === 'config' && path ends with settings.json or settings.local.json`
- Inspect: uses `parseJsonContent` -> extract `enabledPlugins` -> annotations using `ANNOTATION_KEYS.pluginEnabled()`
- Scope derived from path: `settings.local.json` -> `'local'`, project `settings.json` -> `'project'`, home `settings.json` -> `'user'`

**Inspector B: `claude:installed-plugins`** (pre-scan)
- Match: `path ends with plugins/installed_plugins.json`
- Inspect: uses `parseJsonContent` -> for each entry with `installPath`, produce `DirectoryScanDirective`:
  ```typescript
  {
    rootPath: entry.installPath,
    locality: 'user',
    provenance: {
      inspectorId: INSPECTOR_IDS.INSTALLED_PLUGINS,
      anchorPath: entry.path,
      originLabel: entry.id,
    },
    categoryRules: [
      // Derived from DEFAULT_PLUGIN_DIRS — not hardcoded strings
      { prefix: `${DEFAULT_PLUGIN_DIRS.skills}/`, category: 'skill' },
      { prefix: `${DEFAULT_PLUGIN_DIRS.hooks}/`, category: 'hook' },
      { prefix: `${DEFAULT_PLUGIN_DIRS.agents}/`, category: 'context' },
      { prefix: `${DEFAULT_PLUGIN_DIRS.commands}/`, category: 'command' },
      { prefix: `${DEFAULT_PLUGIN_DIRS.outputStyles}/`, category: 'config' },
      { prefix: 'scripts/', category: 'hook' },
    ],
    fallbackCategory: null,
    exactPaths: {
      '.mcp.json': 'mcp',
      '.claude-plugin/plugin.json': 'config',
    },
    skipDirNames: ['node_modules', '.git', 'dist', 'build', 'out'],
  }
  ```
- Scans all installed plugins (not just enabled) so the index is complete. Consumers use `resolvedAnnotations` to determine effectiveness.

**Inspector C: `claude:mcp-servers`** (pre-scan)
- Match: `category === 'mcp' && path ends with .mcp.json`
- Inspect: uses `parseJsonContent` -> extract `mcpServers` keys -> annotations using `ANNOTATION_KEYS.mcpServer()`
- Produce `SecondaryPathDirective` for local script paths referenced in `command` fields

**Inspector D: `claude:hooks-config`** (pre-scan)
- Match: `category === 'config' && path ends with settings.json`
- Inspect: uses `parseJsonContent` (shared with Inspector A — same file content from cache, no re-parse needed since both receive the same string) -> extract `hooks` object -> annotations using `ANNOTATION_KEYS.hookEvent()`

**Inspector E: `claude:plugin-manifest`** (post-scan)
- Match: `path ends with .claude-plugin/plugin.json`
- Inspect: reuse `parsePluginManifest()` from `src/shared/pluginManifest.ts`
- Produce annotations using `ANNOTATION_KEYS.pluginMeta()` about plugin metadata (name, version, declared components)

### Step 10: Home Path Task Addition

**`src/domains/sources/presets/claude/homePathTasks.ts`** — add task to discover `installed_plugins.json`:
```typescript
async (ctx) => {
  const { activePresets, roots, add, fileExists } = ctx;
  if (!activePresets.has(PRESET_ID)) return;
  const abs = path.join(roots.claudeUserRoot, 'plugins', 'installed_plugins.json');
  if (await fileExists(abs)) {
    add(abs, PRESET_ID, SourceCategoryId.Config);
  }
}
```

### Step 11: Linker Annotation

**`src/domains/sources/domain/artifactLinker.ts`** — after building each artifact, if all member entries share the same `provenance?.originLabel`, propagate to `artifact.originLabel`. No changes to linkage rules.

### Step 12: Snapshot Version Bump & Annotation Storage

**`src/domains/sources/infrastructure/VscodeSourcesSnapshotStore.ts`**:
- Snapshot write key: `sources.lastSnapshot.v8`
- Annotations stored separately: `sources.resolvedAnnotations.v8`
- On load: try v8 first, fall back to v7 (v7 has no provenance or annotations)
- On save: clean up v7 keys
- New method: `saveAnnotations(annotations: Readonly<Record<string, AnnotationValue>>): Promise<void>`
- New method: `loadAnnotations(): Readonly<Record<string, AnnotationValue>> | undefined`

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/shared/settingsScope.ts` | Shared `SettingsScope` type used by both sources and addons |
| `src/domains/sources/domain/contentInspection.ts` | Core abstractions: ContentInspector, InspectionResult, directives, annotations, diagnostics |
| `src/domains/sources/domain/annotationResolver.ts` | Generic scope-precedence annotation resolver |
| `src/domains/sources/infrastructure/NodeSourceFileContent.ts` | Size-guarded file reader + path-validated directory lister (delegates to exported `collectFilesRecursiveUnderDir`) |
| `src/domains/sources/presets/claude/inspectors.ts` | Claude-specific inspector strategies A-E, ID constants, annotation key builders, shared JSON parse helper |
| `src/shared/pluginManifest.ts` | Moved from addons domain — pure plugin.json parser |

## Files to Modify

| File | Change |
|------|--------|
| `src/domains/sources/domain/model.ts` | Add `provenance?` to entry |
| `src/domains/sources/domain/artifact.ts` | Add `originLabel?` |
| `src/domains/sources/application/ports.ts` | Add `SourceFileContentPort` |
| `src/domains/sources/application/SourcesService.ts` | Add content reader param, `runContentInspection` (two-pass parallel), merge into `performIndexWorkspace` |
| `src/domains/sources/domain/sourcePresetDefinition.ts` | Add `contentInspectors?` |
| `src/domains/sources/domain/artifactLinker.ts` | Propagate provenance `originLabel` to artifacts |
| `src/domains/sources/registerSourcePresets.ts` | Flatten `CONTENT_INSPECTORS` |
| `src/domains/sources/presets/claude/preset.ts` | Register Claude inspectors |
| `src/domains/sources/presets/claude/homePathTasks.ts` | Add `installed_plugins.json` discovery |
| `src/domains/sources/infrastructure/VscodeSourcesSnapshotStore.ts` | Bump to v8, separate annotations key, v7 fallback |
| `src/domains/sources/infrastructure/sourceDiscoveryPlan.ts` | Export `collectFilesRecursiveUnderDir` |
| `src/domains/sources/infrastructure/createSourcesService.ts` | Instantiate `NodeSourceFileContent` with `[homeDir, workspaceRoot]` as `allowedPathPrefixes` |
| `src/domains/addons/domain/pluginManifest.ts` | Re-export from `src/shared/pluginManifest.ts` |
| `src/domains/addons/domain/cliTypes.ts` | Import `SettingsScope` from `src/shared/settingsScope.ts`, remove local `CliScope` |

## Reusable Functions

| Function | Location | Reuse |
|----------|----------|-------|
| `parsePluginManifest()` | `src/shared/pluginManifest.ts` (moved) | Inspector E |
| `DEFAULT_PLUGIN_DIRS` | same file | Category rules in Inspector B (derive prefixes, don't hardcode) |
| `collectFilesRecursiveUnderDir()` | `src/domains/sources/infrastructure/sourceDiscoveryPlan.ts` | Called by `NodeSourceFileContent.listFilesRecursive` (export, don't reimplement) |
| `CliInstalledPlugin` type | `src/domains/addons/domain/cliTypes.ts` | Shape reference for installed_plugins.json |
| `isPathAllowedForWorkspaceOrHome()` | `src/domains/sources/infrastructure/pathUnderRoot.ts` | Additional path validation in orchestrator |

---

## Test Plan

### Unit Tests (pure domain, no I/O)
1. **`tests/domains/sources/domain/annotationResolver.test.ts`** — scope precedence: single scope, multi-scope override, missing keys, custom priority order, unknown scope treated as lowest priority
2. **`tests/domains/sources/domain/contentInspection.test.ts`** — `categoryRules` resolution logic (array order, first match wins, exact paths, fallback category, null fallback skips)
3. **`tests/domains/sources/presets/claude/inspectors.test.ts`** — each inspector with:
   - Valid JSON -> correct directives and annotations (verify annotation keys match `ANNOTATION_KEYS.*` constants)
   - Empty JSON -> empty result (no crash)
   - Malformed JSON -> diagnostic with `severity: 'warning'`, no throw (via shared `parseJsonContent`)
   - Edge cases per inspector (e.g., `enabledPlugins: {}`, unknown scope strings)
   - Inspector B: verify `categoryRules` prefixes match `DEFAULT_PLUGIN_DIRS` values
   - Inspector B: verify `skipDirNames` is populated
4. **`tests/domains/sources/domain/artifactLinker.test.ts`** — add cases for `originLabel` propagation: all members same origin -> propagated; mixed origins -> not propagated; no provenance -> no label

### Integration Tests
5. **`tests/domains/sources/application/contentInspection.test.ts`** — SourcesService with mocked ports:
   - Scanner returns settings.json + installed_plugins.json entries
   - Content reader returns realistic JSON
   - **Verify content cache**: same path read only once even with multiple matching inspectors
   - Verify secondary records appear with correct provenance (`anchorPath` is stable)
   - Verify annotations resolved with correct precedence
   - Verify diagnostics emitted for malformed files
   - **Verify two-pass boundary**: post-scan `DirectoryScanDirectives` are NOT executed
   - **Verify parallel I/O**: content reads and directory scans use `Promise.all` (mock timing assertions)
   - Verify `knownByteLength` passed to `readFileContent` to skip redundant stat
6. **`tests/domains/sources/infrastructure/NodeSourceFileContent.test.ts`**:
   - File exists -> returns content
   - File missing -> returns null
   - File exceeds maxBytes -> returns null
   - `knownByteLength` > maxBytes -> returns null without stat call
   - `listFilesRecursive` with path outside `allowedPathPrefixes` -> returns `[]`
   - `listFilesRecursive` with valid path -> returns files
   - `listFilesRecursive` with `skipDirNames` -> skips `node_modules` etc.
7. **`tests/shared/pluginManifest.test.ts`** — verify existing tests still pass at new location
8. **`tests/shared/settingsScope.test.ts`** — verify `CliScope` and `InspectionScope` both resolve to same type

### Regression
9. All existing `artifactLinker.test.ts` cases pass unchanged
10. All existing `sourceDiscoveryPlan.test.ts` cases pass unchanged
11. Snapshot deserialization handles v7 format (missing `provenance`)
12. Addons domain tests pass with re-exported `parsePluginManifest` and shared `SettingsScope`

---

## Implementation Sequence

1. **Foundation** (zero behavioral change):
   - `src/shared/settingsScope.ts`
   - `contentInspection.ts` types
   - `annotationResolver.ts`
   - `SourceFileContentPort` in ports.ts
   - Export `collectFilesRecursiveUnderDir` from `sourceDiscoveryPlan.ts`
   - `NodeSourceFileContent.ts` (delegates to exported walker)
   - Move `pluginManifest.ts` to shared, re-export from addons
   - Update `cliTypes.ts` to use shared `SettingsScope`

2. **Preset extension** (optional fields, no breakage):
   - `sourcePresetDefinition.ts` + `registerSourcePresets.ts`

3. **Model extension** (optional fields on existing types):
   - `model.ts` — provenance
   - `artifact.ts` — originLabel

4. **Claude inspectors**:
   - `inspectors.ts` with A-E, ID constants, annotation key builders, shared parse helper
   - `homePathTasks.ts` — add `installed_plugins.json`
   - `preset.ts` — register inspectors

5. **Orchestration**:
   - `SourcesService` — two-pass parallel `runContentInspection`, content cache, updated `performIndexWorkspace`
   - `VscodeSourcesSnapshotStore` — v8 with separate annotations key, v7 fallback
   - `createSourcesService.ts` — instantiate `NodeSourceFileContent`

6. **Linker**:
   - Provenance `originLabel` propagation

7. **Tests**: unit -> integration -> regression

---

## Extensibility Examples

The Strategy pattern makes it trivial to add new inspectors without touching the core:

- **Cursor preset**: `cursor:settings-extensions` inspector reads `.cursor/settings.json`
- **Codex preset**: `codex:tool-config` inspector for Codex-specific config parsing
- **Any preset**: `yaml-frontmatter` inspector reads SKILL.md metadata as annotations
- **Future**: `tsconfig.json` inspector annotating project TypeScript configuration

---

## Review Fixes Applied

### Round 1 (Initial Plan Review)

| # | Severity | Issue | Fix |
|---|----------|-------|-----|
| 1 | CRITICAL | `value: unknown` not serializable | `AnnotationValue` union: `string \| number \| boolean \| null \| readonly string[]` |
| 2 | CRITICAL | `FileCategorizerFn` not serializable | Replaced with declarative `categoryByPrefix` map + `exactPaths` + `fallbackCategory` |
| 3 | CRITICAL | `priorResults` implicit ordering | Explicit `InspectorPhase = 1 \| 2`; post-scan sees `resolvedAnnotations` not raw results |
| 4 | HIGH | Path traversal on `rootPath` | `NodeSourceFileContent` takes `allowedPathPrefixes` in constructor; `listFilesRecursive` validates |
| 5 | HIGH | No file size guard | `readFileContent(path, maxBytes=1MB)` checks `stat.size` before reading |
| 6 | HIGH | No error reporting for malformed JSON | Added `diagnostics` field to `InspectionResult` with `severity` + `message` |
| 7 | HIGH | Inspector E on secondaries undefined | Explicit two-pass: pre-scan on phase-1 entries, post-scan on secondaries. Post-scan scan directives ignored. |
| 8 | MEDIUM | `anchorRecordId` fragile coupling | Added `anchorPath` (stable) alongside `anchorRecordId` (session-specific) |
| 9 | MEDIUM | Missing `export` keywords | All types in `contentInspection.ts` exported |
| 10 | MEDIUM | `scope` loose string | `InspectionScope = 'user' \| 'project' \| 'local'` union type |
| 11 | MEDIUM | Cross-domain import | Move `parsePluginManifest` to `src/shared/`, re-export from addons |
| 12 | MEDIUM | No test for ordering | Added test case: "Verify two-pass boundary: post-scan DirectoryScanDirectives are NOT executed" |
| 13 | LOW | Snapshot version bump missing | Specified v8 write key, v7 fallback on load |
| 14 | LOW | `annotationResolver` return type `unknown` | Returns `Readonly<Record<string, AnnotationValue>>` |

### Round 2 (Simplify Review — Reuse + Quality + Efficiency)

| # | Severity | Source | Issue | Fix |
|---|----------|--------|-------|-----|
| 1 | HIGH | Reuse | `listFilesRecursive` reimplements walker | Export `collectFilesRecursiveUnderDir`; `NodeSourceFileContent` calls it directly |
| 2 | HIGH | Quality | `anchorRecordId` is dead data | Removed from `DiscoveryProvenance` — `anchorPath` (stable) is sufficient |
| 3 | HIGH | Quality | `phase1Entries` leaks full index into inspectors | Replaced with narrow `hasIndexedPath(path): boolean` callback |
| 4 | HIGH | Quality | Stringly-typed annotation keys | Added `ANNOTATION_KEYS` const builders and `INSPECTOR_IDS` const registry |
| 5 | HIGH | Efficiency | Sequential cross-file reads | Both passes use `Promise.all` for parallel file reads |
| 6 | HIGH | Efficiency | No `skipDirNames` on scans | Added `skipDirNames` to `DirectoryScanDirective` with `DEFAULT_SCAN_SKIP_DIRS` default |
| 7 | HIGH | Efficiency | Content deduplication not enforced | Explicit `contentCache: Map<string, string>` in orchestration, outer loop by path |
| 8 | MEDIUM | Reuse | `InspectionScope` duplicates `CliScope` | Created `src/shared/settingsScope.ts` — both domains import from shared |
| 9 | MEDIUM | Reuse | `categoryByPrefix` not derived from `DEFAULT_PLUGIN_DIRS` | Inspector B uses `DEFAULT_PLUGIN_DIRS.*` for prefix construction |
| 10 | MEDIUM | Quality | Raw annotations stored on snapshot | Store resolved `Record<string, AnnotationValue>` in separate globalState key |
| 11 | MEDIUM | Quality | `categoryByPrefix` Record has no order guarantee | Changed to `categoryRules: readonly CategoryPrefixRule[]` ordered array |
| 12 | MEDIUM | Quality | Inspector A/D duplicate JSON parse | Extracted shared `parseJsonContent()` helper |
| 13 | MEDIUM | Efficiency | All plugins scanned unconditionally | Accepted for completeness; documented that consumers use annotations for enablement |
| 14 | MEDIUM | Efficiency | Sequential directory scans | Directory scans in post-scan use `Promise.all` |
| 15 | MEDIUM | Efficiency | Double stat for inspected files | Added `knownByteLength` option to `readFileContent` to skip redundant stat |
| 16 | MEDIUM | Efficiency | globalState bloat | Annotations in separate key `sources.resolvedAnnotations.v8` |
| 17 | MEDIUM | Efficiency | Hot-path latency not budgeted | Added 200ms target + opt-in flag for file-change re-indexes |
| 18 | LOW | Quality | Inspector IDs need constants | Added `INSPECTOR_IDS` const object |
| 19 | LOW | Quality | `createSourcesService.ts` missing from modify list | Added to files-to-modify table |
| 20 | LOW | Efficiency | TOCTOU stale metadata | Documented: entry retained with structural metadata + diagnostic emitted |
