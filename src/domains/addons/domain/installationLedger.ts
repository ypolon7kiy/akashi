/**
 * Installation ledger: persistent record of addons installed via the panel.
 * Tracks what was installed, from where, and what files/json entries were
 * created — so we can reliably reverse the installation.
 */

/** Record of a JSON key that was added during installation. */
export interface InstalledJsonEntry {
  readonly filePath: string;
  readonly jsonPath: string;
  readonly key: string;
}

/** One installed addon record in the ledger. */
export interface InstalledAddonRecord {
  readonly id: string;
  readonly name: string;
  readonly originId: string;
  readonly presetId: string;
  readonly category: string;
  readonly locality: 'workspace' | 'user';
  readonly version: string;
  readonly installedAt: string;
  /** Absolute paths of files created during install. */
  readonly installedFiles: readonly string[];
  /** JSON keys added during install (for MCP, hooks, etc.). */
  readonly installedJsonEntries: readonly InstalledJsonEntry[];
}

/** The full installation ledger. */
export interface InstallationLedger {
  readonly version: 1;
  readonly records: readonly InstalledAddonRecord[];
}

export function emptyLedger(): InstallationLedger {
  return { version: 1, records: [] };
}

export function addToLedger(
  ledger: InstallationLedger,
  record: InstalledAddonRecord
): InstallationLedger {
  return {
    ...ledger,
    records: [...ledger.records.filter((r) => r.id !== record.id), record],
  };
}

export function removeFromLedger(
  ledger: InstallationLedger,
  addonId: string
): InstallationLedger {
  return {
    ...ledger,
    records: ledger.records.filter((r) => r.id !== addonId),
  };
}

export function findInLedger(
  ledger: InstallationLedger,
  addonId: string
): InstalledAddonRecord | undefined {
  return ledger.records.find((r) => r.id === addonId);
}

export function findInLedgerByPluginId(
  ledger: InstallationLedger,
  pluginId: string
): InstalledAddonRecord | undefined {
  return ledger.records.find(
    (r) => r.id === pluginId || r.id.replace(/\/(workspace|user)$/, '') === pluginId
  );
}

export function findInLedgerByPath(
  ledger: InstallationLedger,
  path: string
): InstalledAddonRecord | undefined {
  return ledger.records.find((r) => r.installedFiles.includes(path));
}
