/**
 * Types matching the JSON output of Claude CLI plugin commands.
 *
 * These are intentionally permissive (string unions instead of strict enums)
 * because the CLI may add new values in future versions.
 */

export type CliScope = 'user' | 'project' | 'local';

/** Shape returned by `claude plugin list --json` for each installed plugin. */
export interface CliInstalledPlugin {
  readonly id: string; // "name@marketplace"
  readonly version: string; // may be "unknown"
  readonly scope: string;
  readonly enabled: boolean;
  readonly installPath: string;
  readonly installedAt: string;
  readonly lastUpdated: string;
  readonly projectPath?: string; // present only for project-scoped plugins
}

/**
 * Shape returned by `claude plugin list --available --json` for each available plugin.
 *
 * `source` is polymorphic:
 * - String for relative paths within the marketplace repo (e.g. `"./plugins/agent-sdk-dev"`)
 * - Object for external sources (e.g. `{ source: "url", url: "https://...", sha: "..." }`)
 */
export interface CliAvailablePlugin {
  readonly pluginId: string; // "name@marketplace"
  readonly name: string;
  readonly description: string;
  readonly marketplaceName: string;
  readonly source: string | Record<string, unknown>;
  readonly installCount: number;
  /** Optional — CLI may include category in future versions. */
  readonly category?: string;
}

/** Combined result from `claude plugin list --available --json`. */
export interface CliAvailableResult {
  readonly installed: readonly CliInstalledPlugin[];
  readonly available: readonly CliAvailablePlugin[];
}

/** Shape returned by `claude plugin marketplace list --json`. */
export interface CliMarketplace {
  readonly name: string;
  readonly source: string;
  readonly repo: string;
  readonly installLocation: string;
}

/** Result from non-JSON CLI commands (install, uninstall, marketplace add/remove). */
export interface CliCommandResult {
  readonly ok: boolean;
  readonly error?: string;
}
