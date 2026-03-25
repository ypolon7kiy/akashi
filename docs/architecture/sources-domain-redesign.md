# Sources Domain — Core Model Redesign Analysis

**Status:** Implemented (R1–R9 complete)
**Scope:** `src/domains/sources/`, `src/shared/`, `src/sidebar/bridge/`, sidebar webview tree layer

---

## Background

The sources domain began as a read-only indexer: it scanned the filesystem, built an
`IndexedSourceEntry` per file, and pushed a snapshot to the graph and sidebar. The new artifact
creation feature added `ArtifactTemplate` to enable preset-aware file creation (skills, rules,
hooks) from the sidebar context menu.

Both systems share the same core dimensions — a discovered file and a creation template are
both characterised by **(preset, category, locality)**. But they were modelled independently,
and the seam between them is held together by naming conventions rather than shared types.

This document maps the current model across all layers, identifies design tensions, proposes a
full redesign, and sequences the migration.

---

## 1. Current Concept Map

How the five core concepts are represented in each architectural layer:

| Concept | Domain (`domain/`) | Shared DTO (`shared/`) | Sidebar bridge | Sidebar tree | Graph |
|---|---|---|---|---|---|
| **Preset** | `SourcePresetId` union (`sourcePresetDefinition.ts:27`) | `SourceDescriptor.preset: string` | `ArtifactTemplate.presetId: SourcePresetId` | `TreeNode.presetId?: string` (inferred) | `GraphNode3D.graphPresetId?: string` |
| **Category** | `SourceCategory` union (`model.ts:8–18`) | `SourceDescriptor.category: string` | `ArtifactTemplate.category: SourceCategory` | `TreeNode.categoryId?: string` (inferred) | `GraphNode3D.graphCategoryId?: string` |
| **Locality** | `SourceScope` (3 values), `origin: 'workspace'\|'user'` (`model.ts:20–26, 50`) | `SourceDescriptor.scope: string`, `.origin: 'workspace'\|'user'` | `ArtifactTemplate.scope: 'workspace'\|'user'` | `r.origin === 'user'` branch in `buildSourceTree` | `GraphLocality: 'project'\|'global'` |
| **Tag values** | `SourceLocalityTagValue: 'project'\|'global'` (`sourceTags.ts:6–9`) | `SourceFacetTagPayload: {type,value}` | — | — | — |
| **Artifact** | `ArtifactTemplate` (with resolver fn) | — (no representation) | `ArtifactTemplateDescriptor` (static mirror) | `CreatingArtifactState` (ephemeral UI) | — (future: via command) |

### Observations from the map

- **Locality** has five distinct representations across layers with no single canonical type.
- **Preset** is strongly typed in the domain layer (`SourcePresetId`) but degrades to `string`
  in the shared DTO (`SourceDescriptor.preset`).
- **Artifact** does not exist as a concept in the shared DTO — there is no `ArtifactDescriptor`
  that travels alongside the source snapshot.
- **Category** is named `category` in domain and shared DTO but `categoryId` in the tree
  and descriptor layers.

---

## 2. Design Tensions

### T1 — Missing first-class `ArtifactKind`

**What:** `IndexedSourceEntry` (a discovered file) and `ArtifactTemplate` (a creation blueprint)
share the same three key dimensions — preset, category, and locality — but have no shared parent
type expressing this relationship.

**Where:**
```
src/domains/sources/domain/model.ts:47–50          preset: string; category: SourceCategory; scope: SourceScope; origin: 'workspace'|'user'
src/domains/sources/domain/artifactTemplate.ts:17–19   presetId: SourcePresetId; category: SourceCategory; scope: 'workspace'|'user'
```

**Why it hurts:**
- The structural equivalence is expressed only as a naming convention in
  `ArtifactTemplate.id: string` (`"claude/skill/workspace"`) — an ad-hoc encoding of
  `(preset, category, locality)` as a slash-separated string.
- There is no compile-time link between "a template that creates Claude skills" and "a
  discovered entry that is a Claude skill". The connection is implicit, enforced by
  convention rather than types.
- Future features (e.g. "find the template for this indexed file") require parsing the
  string id or writing runtime logic that re-derives this relationship.

---

### T2 — Locality represented five different ways

**What:** The concept "where does this file live — in the project or the user's home
directory" is encoded differently in every layer:

| Location | Name | Values |
|---|---|---|
| `model.ts:20–26` | `SourceScope` | `'workspace' \| 'file' \| 'user'` |
| `model.ts:50` | `origin` | `'workspace' \| 'user'` |
| `artifactTemplate.ts:19` | `scope` | `'workspace' \| 'user'` |
| `sourceTags.ts:6–9` | `SourceLocalityTagValue` | `'project' \| 'global'` |
| `graphTypes.ts:16` | `GraphLocality` | `'project' \| 'global'` |

**Where:**
```
src/domains/sources/domain/model.ts:20–26, 50
src/domains/sources/domain/artifactTemplate.ts:19
src/domains/sources/domain/sourceTags.ts:6–9
src/domains/graph/domain/graphTypes.ts:16
src/sidebar/webview/sources/tree/sourceTree.ts:301   (r.origin === 'user')
```

**Why it hurts:**
- `ArtifactTemplate.scope` and `IndexedSourceEntry.origin` represent the same concept
  (`'workspace' | 'user'`) under different field names. A reader must understand that
  `scope` on a template means the same as `origin` on an entry.
- `SourceScope` adds a third value `'file'` that is absent from all other representations.
  Its semantic role in the domain is unclear, and it is not used in `ArtifactTemplate` at
  all, making the relationship between `SourceScope` and the artifact system opaque.
- `buildSourceTree` (tree builder) dispatches on `r.origin`, not `r.scope` — the tree is
  aware that `origin` is the true locality discriminator.
- The `'project'/'global'` vs `'workspace'/'user'` split (tag layer vs domain layer)
  requires a translation step (`localityTagForOrigin` in `sourceTags.ts:24–28`).
- Tag display logic, tree routing, and artifact resolver selection all re-derive the same
  binary from different fields.

---

### T3 — Preset definition does not own its artifact templates

**What:** `SourcePresetDefinition` describes what a preset discovers (workspace globs +
home path tasks) but does not describe what a preset can create. The artifact templates for
each preset live in a separate `artifactTemplates.ts` file and are aggregated externally.

**Where:**
```
src/domains/sources/domain/sourcePresetDefinition.ts:33–37  (no artifactTemplates field)
src/domains/sources/registerSourcePresets.ts:12–15          (separate imports for each preset's templates)
src/domains/sources/registerSourcePresets.ts:20–25          (SOURCE_PRESET_DEFINITIONS — discovery only)
src/domains/sources/registerSourcePresets.ts:64+            (ARTIFACT_TEMPLATES — separate registry)
```

**Why it hurts:**
- A preset is now the unit of both discovery and creation, but the type does not express
  this. To understand a complete preset you must read two files: `preset.ts` (discovery)
  and `artifactTemplates.ts` (creation).
- The two registries (`SOURCE_PRESET_DEFINITIONS` and `ARTIFACT_TEMPLATES`) are populated
  separately. Adding a new preset requires editing `registerSourcePresets.ts` in two
  places and keeping the imports aligned by hand.
- The symmetry between "this preset discovers `.claude/skills/**/*.md`" and "this preset
  can create files in `.claude/skills/`" is architecturally visible but not expressed in
  any type relationship.

---

### T4 — Dual template registry with manual sync

**What:** The full `ArtifactTemplate` (with non-serializable `targetDirResolver` and
`initialContent` functions) lives in the domain layer. Because VS Code webview bundles
cannot safely import `node:path`, a static mirror — `ArtifactTemplateDescriptor` — was
created in the webview layer. The two are manually kept in sync.

**Where:**
```
src/sidebar/webview/sources/artifacts/artifactTemplateDescriptors.ts:1–4
  // "Must stay in sync with the domain-layer ArtifactTemplate definitions"
src/sidebar/webview/sources/artifacts/artifactTemplateDescriptors.ts:20–45  (20 static entries)
src/domains/sources/registerSourcePresets.ts:64+                            (ARTIFACT_TEMPLATES — 20 domain templates)
```

**Why it hurts:**
- Every new template or label change must be made in two places. The comment is the only
  enforcement mechanism.
- `ArtifactTemplate` and `ArtifactTemplateDescriptor` differ in field names: the domain
  uses `category: SourceCategory` while the descriptor uses `categoryId: string`. A
  template added to the domain layer using the wrong field name in the descriptor will
  compile silently and break silently at runtime.
- The host already sends the sources snapshot to the webview on every index cycle. The
  webview-safe descriptor data could be sent alongside the snapshot, eliminating the
  static registry entirely.

---

### T5 — `ArtifactTemplate.id` is an untyped compound string

**What:** Every template constructs its `id` by hand as a raw string literal with the
convention `"<presetId>/<category>/<scope>"`.

**Where:**
```
src/domains/sources/domain/artifactTemplate.ts:14   id: string
src/domains/sources/presets/claude/artifactTemplates.ts:17   id: 'claude/skill/workspace'
src/domains/sources/presets/claude/artifactTemplates.ts:28   id: 'claude/skill/user'
```

**Why it hurts:**
- No compile-time validation that the id encodes a valid `(SourcePresetId, SourceCategory,
  locality)` triple. A typo (`'claude/skil/workspace'`) passes type-checking and fails only
  at the `findArtifactTemplateById` call site.
- The three parts of the id are also separate typed fields on the same interface
  (`presetId`, `category`, `scope`), so the id is always redundant with those fields —
  but there's no structural guarantee they agree.
- Template literal types in TypeScript can express this exactly and are zero-cost at
  runtime.

---

### T6 — `category` vs `categoryId` naming inconsistency

**What:** The same concept — the artifact category (`'skill'`, `'rule'`, `'context'`, …)
— uses different field names in different layers.

**Where:**
```
src/domains/sources/domain/model.ts:48                         category: SourceCategory
src/domains/sources/domain/artifactTemplate.ts:18              category: SourceCategory
src/shared/types/sourcesSnapshotPayload.ts:24                  category: string
src/sidebar/webview/sources/artifacts/artifactTemplateDescriptors.ts:10   categoryId: string
src/sidebar/webview/sources/tree/sourceTree.ts:30              categoryId?: string
```

**Why it hurts:**
- The field is `category` in the domain and shared DTO but `categoryId` in the webview
  descriptor and tree node. Any code that bridges these layers must translate field names.
- `categoryId` implies the value is a foreign-key identifier pointing elsewhere; `category`
  is more accurate since it *is* the value, not a reference to one.
- `SourceCategoryId` in `sourceTags.ts` is a constant object mapping semantic names to
  the string values (`LlmGuideline: 'context'`, etc.) — this is fine and useful, but its
  name `SourceCategoryId` reinforces the incorrect "Id" suffix convention.

---

### T7 — `IndexedSourceEntry.preset` is untyped (`string`) while `ArtifactTemplate.presetId` is typed (`SourcePresetId`)

**What:** Discovered source entries carry `preset: string`, but creation templates carry
`presetId: SourcePresetId`. The same concept — which tool preset owns this artifact — is
strongly typed in one direction and weakly typed in the other.

**Where:**
```
src/domains/sources/domain/model.ts:47          preset: string
src/domains/sources/domain/artifactTemplate.ts:17   presetId: SourcePresetId
src/shared/types/sourcesSnapshotPayload.ts:22   preset: string  (SourceDescriptor)
```

**Why it hurts:**
- `SourceDescriptor.preset` accepts any string — a serialization artifact from when
  presets were less formalised. Now that `SourcePresetId` is a well-defined union, the
  weak typing is no longer justified.
- Code that receives a `SourceDescriptor` and needs to look up templates for it must cast
  or validate the preset string before calling `findArtifactTemplateById`.

---

### T8 — `SourceScope.File` is an orphan value

**What:** `SourceScope` defines three values: `'workspace'`, `'file'`, `'user'`. But
`ArtifactTemplate.scope` only uses `'workspace' | 'user'`, and the `origin` field on
`IndexedSourceEntry` is also `'workspace' | 'user'`. The `'file'` value participates in
neither the artifact template system nor the tree locality routing.

**Where:**
```
src/domains/sources/domain/model.ts:20–26   SourceScope = { Workspace, File, User }
src/domains/sources/domain/model.ts:49      scope: SourceScope  (on IndexedSourceEntry)
src/domains/sources/domain/artifactTemplate.ts:19   scope: 'workspace' | 'user'
```

**Why it hurts:**
- `SourceScope` and the locality discriminator used everywhere else (`origin`, artifact
  `scope`, `GraphLocality`) solve different problems but share nomenclature. This inflates
  the apparent complexity of the locality concept.
- The semantic difference between `scope` and `origin` on `IndexedSourceEntry` is unclear
  from the type alone.

---

### T9 — `TreeNode` preset/category inference is implicit and fragile

**What:** Folder nodes in the sidebar tree receive `presetId` and `categoryId` only when
all leaf descriptors in the subtree share a single value for each. This is inferred
bottom-up at tree-build time via `collectTrieMeta`.

**Where:**
```
src/sidebar/webview/sources/tree/sourceTree.ts:174–191   collectTrieMeta()
src/sidebar/webview/sources/tree/sourceTree.ts:256–263   presetId: meta.presets.size === 1 ? ...
```

**Why it hurts:**
- The relationship "this directory belongs to the Claude preset" is structural knowledge
  (the directory is `.claude/`) but is derived from file contents rather than from the
  path structure or a declared ownership.
- If a user places a non-Claude file inside `.claude/skills/`, the folder loses its
  `presetId` and the "New Skill" context menu item disappears silently.
- The context menu capability of a folder is a function of what files happen to be inside
  it at index time — not of what the directory structurally is.

---

### T10 — `targetDirResolver` couples workspace and user templates unnecessarily

**What:** Every `ArtifactTemplate.targetDirResolver` receives both `workspaceRoot: string`
and `roots: ToolUserRoots` regardless of the template's `scope`. Workspace-scoped
resolvers ignore `roots`; user-scoped resolvers ignore `workspaceRoot`.

**Where:**
```
src/domains/sources/domain/artifactTemplate.ts:25
  targetDirResolver: (workspaceRoot: string, roots: ToolUserRoots) => string

src/domains/sources/presets/claude/artifactTemplates.ts:22
  targetDirResolver: (workspaceRoot) => workspaceRoot ? path.join(...) : ''
  // roots is received but not used

src/domains/sources/presets/claude/artifactTemplates.ts:33
  targetDirResolver: (_workspaceRoot, roots) => path.join(roots.claudeUserRoot, 'skills')
  // workspaceRoot is received but not used
```

**Why it hurts:**
- The signature is technically fine but misleading — the two parameters are always
  mutually exclusive in practice but the type does not express this.
- Every resolver must handle the "no workspace" case (`workspaceRoot === ''`) with a
  guard even for templates where this is structurally impossible (user-scoped templates
  always have roots; workspace-scoped templates always have a workspaceRoot when called
  correctly).

---

## 3. Proposed Redesigned Models

The following TypeScript sketches describe the intended state. They are additive to the
existing codebase — each section can be introduced independently.

### R1 — Canonical `SourceLocality` and `ArtifactKind`

Introduce a single canonical type for the workspace/user distinction, and a first-class
`ArtifactKind` representing the three dimensions that discovery and creation share.

```typescript
// src/domains/sources/domain/artifactKind.ts  (new file)

import type { SourcePresetId } from './sourcePresetDefinition';
import type { SourceCategory } from './model';

/** Canonical locality discriminator — replaces the parallel `origin` and `scope` fields. */
export type SourceLocality = 'workspace' | 'user';

/**
 * The three dimensions that uniquely characterise an artifact type.
 * Both `IndexedSourceEntry` (discovered) and `ArtifactTemplate` (created) satisfy this.
 */
export interface ArtifactKind {
  readonly presetId: SourcePresetId;
  readonly category: SourceCategory;
  readonly locality: SourceLocality;
}
```

### R2 — Typed `ArtifactTemplateId` with builder

```typescript
// src/domains/sources/domain/artifactTemplate.ts  (additions)

import type { ArtifactKind, SourceLocality } from './artifactKind';
import type { SourcePresetId } from './sourcePresetDefinition';
import type { SourceCategory } from './model';

/** Compile-time validated id: `"<presetId>/<category>/<locality>"`. */
export type ArtifactTemplateId =
  `${SourcePresetId}/${SourceCategory}/${SourceLocality}`;

/** Build a validated template id from its component parts. */
export const buildArtifactTemplateId = (
  presetId: SourcePresetId,
  category: SourceCategory,
  locality: SourceLocality,
): ArtifactTemplateId => `${presetId}/${category}/${locality}`;
```

### R3 — `ArtifactTemplate` extends `ArtifactKind` with split resolver

```typescript
// src/domains/sources/domain/artifactTemplate.ts  (revised interface)

export interface ArtifactTemplate extends ArtifactKind {
  readonly id: ArtifactTemplateId;
  readonly label: string;

  /**
   * Locality-discriminated resolver — workspace templates never need `roots`,
   * user templates never need `workspaceRoot`. The union makes this explicit.
   */
  readonly targetDirResolver:
    | { readonly locality: 'workspace'; readonly resolve: (workspaceRoot: string) => string }
    | { readonly locality: 'user';      readonly resolve: (roots: ToolUserRoots) => string };

  readonly suggestedExtension: string;
  readonly fixedFileName?: string;
  readonly initialContent: string | ((fileName: string) => string);
}

// Convenience helper used at call sites:
export function resolveTargetDir(
  template: ArtifactTemplate,
  workspaceRoot: string,
  roots: ToolUserRoots,
): string {
  if (template.targetDirResolver.locality === 'workspace') {
    return template.targetDirResolver.resolve(workspaceRoot);
  }
  return template.targetDirResolver.resolve(roots);
}
```

Usage in a template definition:
```typescript
// Before
{
  id: 'claude/skill/workspace',
  scope: 'workspace',
  targetDirResolver: (workspaceRoot) => path.join(workspaceRoot, '.claude', 'skills'),
}

// After
{
  id: buildArtifactTemplateId('claude', 'skill', 'workspace'),
  locality: 'workspace',   // from ArtifactKind — replaces 'scope'
  targetDirResolver: { locality: 'workspace', resolve: (root) => path.join(root, '.claude', 'skills') },
}
```

### R4 — `SourcePresetDefinition` owns its artifact templates

```typescript
// src/domains/sources/domain/sourcePresetDefinition.ts  (revised)

export interface SourcePresetDefinition {
  readonly id: SourcePresetId;
  readonly workspaceGlobContributions: readonly WorkspaceGlobContribution[];
  readonly homePathTasks: readonly HomePathTask[];
  readonly artifactTemplates: readonly ArtifactTemplate[];  // ADDED
}
```

Each `preset.ts` then becomes the single source of truth for everything its preset does:

```typescript
// src/domains/sources/presets/claude/preset.ts  (revised shape)

export const claudePresetDefinition: SourcePresetDefinition = {
  id: 'claude',
  workspaceGlobContributions: [...],
  homePathTasks: [claudeHomePathTask],
  artifactTemplates: claudeArtifactTemplates,  // fold in from sibling file
};
```

`registerSourcePresets.ts` then derives `ARTIFACT_TEMPLATES` without separate imports:

```typescript
export const ARTIFACT_TEMPLATES: readonly ArtifactTemplate[] =
  SOURCE_PRESET_DEFINITIONS.flatMap((p) => p.artifactTemplates);
```

### R5 — `IndexedSourceEntry` uses `locality` and types `preset`

```typescript
// src/domains/sources/domain/model.ts  (revised IndexedSourceEntry)

export interface IndexedSourceEntry {
  readonly id: string;
  readonly path: string;
  readonly preset: SourcePresetId;         // was: string
  readonly category: SourceCategory;
  readonly locality: SourceLocality;       // replaces: origin + scope (as locality discriminator)
  readonly tags: readonly SourceFacetTag[];
  readonly metadata: { byteLength: number; updatedAt: string };
}
```

`SourceScope` can be narrowed or removed once its `'file'` value is either given a clear
role or confirmed unused.

### R6 — Shared DTO carries `locality` and delivers `artifactDescriptors`

Eliminate the manually-synced webview descriptor registry by sending descriptors from the
host alongside the snapshot.

```typescript
// src/shared/types/sourcesSnapshotPayload.ts  (additions)

/** Serializable mirror of ArtifactTemplate — safe to include in webview postMessage. */
export interface ArtifactDescriptor {
  readonly id: string;
  readonly label: string;
  readonly presetId: string;
  readonly category: string;           // unified name (was categoryId in webview)
  readonly locality: 'workspace' | 'user';  // unified name (was scope in descriptor)
  readonly suggestedExtension: string;
  readonly fixedFileName?: string;
}

export interface SourceDescriptor {
  readonly id: string;
  readonly path: string;
  readonly preset: string;
  readonly category: string;
  readonly locality: 'workspace' | 'user';  // replaces: origin + scope
  readonly tags: readonly SourceFacetTagPayload[];
  readonly metadata: { byteLength: number; updatedAt: string };
}

export interface SourcesSnapshotPayload {
  readonly generatedAt: string;
  readonly sourceCount: number;
  readonly records: SourceDescriptor[];
  readonly workspaceFolders: WorkspaceFolderInfo[];
  readonly artifactDescriptors: readonly ArtifactDescriptor[];  // ADDED
}
```

Host-side builder (called when composing the snapshot):

```typescript
// src/sidebar/host/fs/buildArtifactDescriptors.ts  (new small utility)

export function buildArtifactDescriptors(
  templates: readonly ArtifactTemplate[],
): ArtifactDescriptor[] {
  return templates.map((t) => ({
    id: t.id,
    label: t.label,
    presetId: t.presetId,
    category: t.category,
    locality: t.locality,
    suggestedExtension: t.suggestedExtension,
    fixedFileName: t.fixedFileName,
  }));
}
```

The webview then reads `snapshot.artifactDescriptors` wherever it currently reads
`ARTIFACT_TEMPLATE_DESCRIPTORS`. The hardcoded file
`src/sidebar/webview/sources/artifacts/artifactTemplateDescriptors.ts` is deleted.

### R7 — Unify `category` field name across layers

Rename `categoryId` → `category` everywhere it refers to the artifact category value:

```typescript
// src/sidebar/webview/sources/tree/sourceTree.ts
type TreeNode =
  | { type: 'folder'; ...; category?: string; ... }   // was: categoryId
  | { type: 'file';   ...; categoryValue: string; ... }  // unchanged (display value)

// ArtifactDescriptor (shared)
{ category: string }                                    // was: categoryId

// SourceTreeContextMenu — filter reads t.category (not t.categoryId)
```

---

## 4. Impact Assessment

| Change | Files touched | Snapshot format break? | Test impact |
|---|---|---|---|
| R1 — `SourceLocality` + `ArtifactKind` | ~3 new/modified domain files | No | Minimal |
| R2 — Typed `ArtifactTemplateId` | 4 preset template files + `artifactTemplate.ts` | No | None (type-only) |
| R3 — Split `targetDirResolver` | 4 preset template files + `createArtifact.ts` + host handler | No | Update call sites in tests |
| R4 — Preset owns templates | 4 `preset.ts` + `registerSourcePresets.ts` | No | None |
| R5 — `locality` on `IndexedSourceEntry` | `model.ts`, `sourceTags.ts`, `application/`, `SourcesService` | **Yes** — `origin` field removed from `SourceDescriptor` | Update snapshot builders + tests |
| R6 — Descriptors in snapshot | `sourcesSnapshotPayload.ts`, host snapshot builder, webview snapshot consumer | **Yes** — adds `artifactDescriptors` field | Update `isSourcesSnapshotPayload` guard; delete descriptor file |
| R7 — `category`/`categoryId` rename | `sourceTree.ts`, `SourceTreeContextMenu.tsx`, `artifactTemplateDescriptors.ts` (deleted in R6) | No | Update tree tests |

Snapshot format changes (R5, R6) affect persisted snapshots. The `isSourcesSnapshotPayload`
guard is loose by design — it only checks top-level keys, so old snapshots will still pass
the guard but will lack `locality` (falling back to `origin`) and `artifactDescriptors`
(empty). A migration comment in the guard is sufficient; no versioned migration needed.

---

## 5. Phased Migration Roadmap

Ordered from lowest to highest structural impact:

| Phase | Change | Risk | Key files |
|---|---|---|---|
| **1** | Introduce `ArtifactKind` + `SourceLocality` in domain (new types, nothing renamed yet) | None | `domain/artifactKind.ts` (new) |
| **2** | Add `ArtifactTemplateId` typed template literal + `buildArtifactTemplateId` helper | None | `artifactTemplate.ts` |
| **3** | Add `artifactTemplates` field to `SourcePresetDefinition`; wire in each `preset.ts`; simplify `registerSourcePresets.ts` | Low | 4 `preset.ts`, `registerSourcePresets.ts` |
| **4** | Migrate `ArtifactTemplate` to extend `ArtifactKind` (`scope` → `locality`, ids use builder, split resolver) | Low–medium | 4 template files, `artifactTemplate.ts`, `createArtifact.ts`, host handler |
| **5** | Add `artifactDescriptors` to `SourcesSnapshotPayload`; populate from host; webview reads snapshot | Medium | `sourcesSnapshotPayload.ts`, host snapshot builder, webview |
| **6** | Delete `artifactTemplateDescriptors.ts`; update webview imports | Low (after P5) | 1 file removed, `SourceTreeContextMenu.tsx` |
| **7** | Migrate `IndexedSourceEntry.origin` → `locality`; type `preset` as `SourcePresetId` | Medium | `model.ts`, `sourceTags.ts`, `SourcesService`, shared DTO |
| **8** | Rename `categoryId` → `category` in tree and descriptor layers | Low | `sourceTree.ts`, context menu |
| **9** | Clarify or retire `SourceScope.File` | Low | `model.ts` — add JSDoc or rename |

Phases 1–4 are purely additive or internal-to-domain. They can be done without a snapshot
format change and without touching the webview.

Phases 5–7 touch the serialized snapshot format. Ship them together in one commit to keep
the `isSourcesSnapshotPayload` guard change atomic.

---

## 6. What to Keep As-Is

The following are working well and should NOT be changed as part of this redesign:

- **`SourceFacetTag` ordered tag system** (`[locality, category, preset]`). Snapshot-stable
  serialization. The tag-based facets are the right abstraction for the graph layer, which
  needs flexible filtering.
- **`resolveArtifactCreation()` pure function pattern** (`application/createArtifact.ts`).
  No I/O, fully testable, correct result-type (`{ok, ...}`). The resolver split in R3
  extends this pattern, it does not replace it.
- **Defence-in-depth validation** (webview parser → path allowlist → host handler). The
  security boundary is correct: templateId (not a path) flows from webview, resolved on host.
- **`sourceRecordId` stable compound ID** (`shared/sourceRecordId.ts`). The unit-separator
  approach and `(preset, origin, path)` key is correct for deduplication.
- **Trie-based tree construction algorithm** (`buildSourceTree`). The algorithm is sound.
  The inference of `presetId`/`categoryId` (T9) is the part to revisit, not the trie.
- **`fixedFileName` pattern** for nested artifact structures (Antigravity `SKILL.md`). The
  abstraction is clean and the test coverage is good.
- **Preset-neutral guideline template** (`context/workspace` per preset). Each preset
  placing CLAUDE.md / AGENTS.md etc. at the workspace root is correct and consistent.
