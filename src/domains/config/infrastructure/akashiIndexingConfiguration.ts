import type * as vscode from 'vscode';

/** Akashi settings that affect source indexing (presets, home inclusion, path overrides). */
export function akashiSourcesIndexingSettingsAffected(e: vscode.ConfigurationChangeEvent): boolean {
  return (
    e.affectsConfiguration('akashi.presets') ||
    e.affectsConfiguration('akashi.includeHomeConfig') ||
    e.affectsConfiguration('akashi.homePathOverrides')
  );
}
