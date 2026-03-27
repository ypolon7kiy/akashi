/**
 * Pure reconciliation of three data concerns:
 *   1. Snapshot (filesystem truth)
 *   2. Catalog plugins (marketplace truth)
 *   3. Installation ledger (provenance tracking)
 *
 * Produces corrected install statuses and identifies stale ledger records
 * whose tracked files no longer exist on disk.
 */

import type { IndexedSourceEntry } from '../../sources/domain/model';
import type { InstallationLedger, InstalledAddonRecord } from './installationLedger';
import type { CatalogPlugin, InstallStatus } from './catalogPlugin';

// ── Inputs ──────────────────────────────────────────────────────────

export interface ReconcileInput {
  readonly targetPresetId: string;
  /** Snapshot records filtered to the target preset. */
  readonly snapshotRecords: readonly IndexedSourceEntry[];
  /** The full installation ledger (all presets). */
  readonly ledger: InstallationLedger;
  /** Catalog plugins from enabled origins (installStatus ignored on input). */
  readonly catalogPlugins: readonly CatalogPlugin[];
}

// ── Outputs ─────────────────────────────────────────────────────────

export type StaleReason = 'files-missing' | 'files-partially-missing';

export interface StaleLedgerRecord {
  readonly record: InstalledAddonRecord;
  readonly reason: StaleReason;
  readonly missingPaths: readonly string[];
}

export interface ReconcileResult {
  /** Catalog plugins with corrected installStatus. */
  readonly plugins: readonly CatalogPlugin[];
  /** Ledger records whose tracked files are no longer on disk. */
  readonly staleLedgerRecords: readonly StaleLedgerRecord[];
  /** Ledger with stale records removed — ready to persist. */
  readonly prunedLedger: InstallationLedger;
}

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Derive a plugin-comparable name from a filesystem path.
 *
 * - Folder-layout: `.claude/skills/my-skill/SKILL.md` → `my-skill`
 * - Flat file:     `.claude/commands/foo.md`           → `foo`
 */
export function deriveNameFromPath(filePath: string): string {
  const norm = filePath.replace(/\\/g, '/');

  if (norm.endsWith('/SKILL.md')) {
    const withoutFile = norm.slice(0, norm.lastIndexOf('/'));
    const slash = withoutFile.lastIndexOf('/');
    return slash >= 0 ? withoutFile.slice(slash + 1) : withoutFile;
  }

  const lastSlash = norm.lastIndexOf('/');
  const basename = lastSlash >= 0 ? norm.slice(lastSlash + 1) : norm;
  return basename.replace(/\.\w+$/i, '');
}

// ── Reconciliation ──────────────────────────────────────────────────

export function reconcile(input: ReconcileInput): ReconcileResult {
  const { targetPresetId, snapshotRecords, ledger, catalogPlugins } = input;

  // Step 1: Build lookup structures from the snapshot
  const snapshotPaths = new Set(snapshotRecords.map((r) => r.path));
  const snapshotNames = new Set(snapshotRecords.map((r) => deriveNameFromPath(r.path)));

  // Step 2: Classify ledger records as verified or stale
  const staleLedgerRecords: StaleLedgerRecord[] = [];
  const verifiedLedgerIds = new Set<string>();
  const staleIds = new Set<string>();

  for (const record of ledger.records) {
    // Only evaluate records for the target preset; others pass through as verified
    if (record.presetId !== targetPresetId) {
      verifiedLedgerIds.add(record.id);
      continue;
    }

    const missingPaths = record.installedFiles.filter((p) => !snapshotPaths.has(p));

    if (missingPaths.length === 0) {
      verifiedLedgerIds.add(record.id);
    } else if (missingPaths.length === record.installedFiles.length) {
      staleLedgerRecords.push({ record, reason: 'files-missing', missingPaths });
      staleIds.add(record.id);
    } else {
      staleLedgerRecords.push({ record, reason: 'files-partially-missing', missingPaths });
      staleIds.add(record.id);
    }
  }

  // Step 3: Build pruned ledger
  const prunedLedger: InstallationLedger = {
    ...ledger,
    records: ledger.records.filter((r) => !staleIds.has(r.id)),
  };

  // Step 4: Compute install status for each catalog plugin
  // Ledger ids include locality suffix (e.g. "foo@origin/workspace").
  // Strip it to match against catalog plugin ids (e.g. "foo@origin").
  const stripLocality = (id: string): string => id.replace(/\/(workspace|user)$/, '');
  const verifiedPluginIds = new Set([...verifiedLedgerIds].map(stripLocality));
  const stalePluginIds = new Set([...staleIds].map(stripLocality));

  const plugins: CatalogPlugin[] = catalogPlugins.map((plugin) => {
    // Primary: verified ledger record
    if (verifiedPluginIds.has(plugin.id)) {
      return { ...plugin, installStatus: 'installed' as InstallStatus };
    }

    // Secondary heuristic: name match — but NOT if a stale record was just pruned
    // for this plugin (the files were deliberately deleted)
    if (!stalePluginIds.has(plugin.id) && snapshotNames.has(plugin.name)) {
      return { ...plugin, installStatus: 'installed' as InstallStatus };
    }

    return { ...plugin, installStatus: 'available' as InstallStatus };
  });

  return { plugins, staleLedgerRecords, prunedLedger };
}
