/**
 * Pure function that groups `IndexedSourceEntry` records into `IndexedArtifact`
 * projections. Uses only structural path information — no file I/O.
 */

import type { IndexedSourceEntry } from './model';
import type { IndexedArtifact, ArtifactShape } from './artifact';

// ---------------------------------------------------------------------------
// Compound hook config patterns (preset → path structure)
// ---------------------------------------------------------------------------

interface CompoundHookPattern {
  readonly preset: string;
  /** Path segment that identifies the hooks directory (e.g. `.claude/hooks`). */
  readonly hookDirSegment: string;
  /** Config file name relative to the preset root (e.g. `settings.json`). */
  readonly configFileName: string;
}

const COMPOUND_HOOK_PATTERNS: readonly CompoundHookPattern[] = [
  { preset: 'claude', hookDirSegment: '/.claude/hooks/', configFileName: 'settings.json' },
  { preset: 'cursor', hookDirSegment: '/.cursor/hooks/', configFileName: 'hooks.json' },
];

/**
 * For a hook script path, derive the expected companion config file path.
 * Returns `null` if the path doesn't match any known hook directory pattern.
 *
 * Example: `/ws/.claude/hooks/lint.sh` → `/ws/.claude/settings.json`
 */
function deriveCompanionConfigPath(hookScriptPath: string, preset: string): string | null {
  const norm = hookScriptPath.replace(/\\/g, '/');
  for (const pattern of COMPOUND_HOOK_PATTERNS) {
    if (pattern.preset !== preset) continue;
    const idx = norm.lastIndexOf(pattern.hookDirSegment);
    if (idx < 0) continue;
    // preset root = everything before the hookDirSegment + the first segment of it
    // e.g. for `/.claude/hooks/`, preset root is `<prefix>/.claude/`
    const presetRoot = norm.slice(0, idx + pattern.hookDirSegment.lastIndexOf('/hooks/') + 1);
    // strip one trailing segment name by going up from `/hooks/` to the preset dir
    const presetDir = presetRoot.endsWith('/') ? presetRoot.slice(0, -1) : presetRoot;
    // The config sits directly inside the preset directory
    // e.g. `/ws/.claude` + `/` + `settings.json`
    return `${presetDir}/${pattern.configFileName}`;
  }
  return null;
}

/** Folder-file: entries whose path matches `.../<parent>/SKILL.md` under `.agent/skills/`. */
function isFolderFileEntry(entry: IndexedSourceEntry): boolean {
  const norm = entry.path.replace(/\\/g, '/');
  return norm.includes('/.agent/skills/') && norm.endsWith('/SKILL.md');
}

/** JSON-only: entries categorized as MCP. */
function isJsonOnlyEntry(entry: IndexedSourceEntry): boolean {
  return entry.category === 'mcp';
}

/** Whether an entry is a hook script (not the config file itself). */
function isHookScriptEntry(entry: IndexedSourceEntry): boolean {
  if (entry.category !== 'hook') return false;
  const norm = entry.path.replace(/\\/g, '/');
  // Must be inside a hooks directory and not be the config file itself
  for (const pattern of COMPOUND_HOOK_PATTERNS) {
    if (entry.preset !== pattern.preset) continue;
    if (norm.includes(pattern.hookDirSegment)) {
      // Ensure it's an actual script file, not hooks.json sitting inside .cursor/hooks/
      const afterHooksDir = norm.slice(
        norm.lastIndexOf(pattern.hookDirSegment) + pattern.hookDirSegment.length
      );
      // Must have a filename (not empty, not just the config)
      if (afterHooksDir.length > 0) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Artifact ID
// ---------------------------------------------------------------------------

function buildArtifactId(shape: ArtifactShape, memberRecordIds: readonly string[]): string {
  const sorted = [...memberRecordIds].sort();
  return `artifact:${shape}:${sorted.join('+')}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Groups indexed source entries into logical artifacts.
 *
 * Linkage rules (priority order):
 * 1. File+JSON compound — hook scripts paired with their config file
 * 2. JSON-only — MCP config files
 * 3. Folder+file — Antigravity SKILL.md entries
 * 4. Single-file — everything else
 */
export function linkArtifacts(entries: readonly IndexedSourceEntry[]): readonly IndexedArtifact[] {
  const artifacts: IndexedArtifact[] = [];

  // Index entries by normalized path+preset+locality for fast companion lookup
  const byPathPresetLocality = new Map<string, IndexedSourceEntry>();
  for (const e of entries) {
    const key = `${e.path.replace(/\\/g, '/')}|${e.preset}|${e.locality}`;
    byPathPresetLocality.set(key, e);
  }
  // Also index by normalized path only (for cross-category companion lookup)
  const byPath = new Map<string, IndexedSourceEntry[]>();
  for (const e of entries) {
    const norm = e.path.replace(/\\/g, '/');
    const list = byPath.get(norm) ?? [];
    list.push(e);
    byPath.set(norm, list);
  }

  // Track which entry IDs have been claimed by compound rules
  const claimed = new Set<string>();

  // --- Pass 1: File+JSON compound (hook scripts + companion config) ---
  for (const entry of entries) {
    if (!isHookScriptEntry(entry)) continue;
    const configPath = deriveCompanionConfigPath(entry.path, entry.preset);
    if (!configPath) continue;

    // Look up the companion config entry by path — any entry at that path from the same preset
    const configEntries = byPath.get(configPath.replace(/\\/g, '/'));
    const configEntry = configEntries?.find(
      (e) => e.preset === entry.preset && e.locality === entry.locality
    );
    if (!configEntry) continue;

    const memberIds = [entry.id, configEntry.id];
    artifacts.push({
      id: buildArtifactId('file-json', memberIds),
      presetId: entry.preset,
      category: entry.category,
      locality: entry.locality,
      shape: 'file-json',
      memberRecordIds: memberIds,
      primaryPath: entry.path,
    });
    claimed.add(entry.id);
    claimed.add(configEntry.id);
  }

  // --- Pass 2+3+4: remaining entries ---
  for (const entry of entries) {
    if (claimed.has(entry.id)) continue;

    if (isJsonOnlyEntry(entry)) {
      artifacts.push({
        id: buildArtifactId('json-only', [entry.id]),
        presetId: entry.preset,
        category: entry.category,
        locality: entry.locality,
        shape: 'json-only',
        memberRecordIds: [entry.id],
        primaryPath: entry.path,
      });
    } else if (isFolderFileEntry(entry)) {
      artifacts.push({
        id: buildArtifactId('folder-file', [entry.id]),
        presetId: entry.preset,
        category: entry.category,
        locality: entry.locality,
        shape: 'folder-file',
        memberRecordIds: [entry.id],
        primaryPath: entry.path,
      });
    } else {
      artifacts.push({
        id: buildArtifactId('single-file', [entry.id]),
        presetId: entry.preset,
        category: entry.category,
        locality: entry.locality,
        shape: 'single-file',
        memberRecordIds: [entry.id],
        primaryPath: entry.path,
      });
    }
  }

  return artifacts;
}
