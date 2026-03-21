import * as vscode from 'vscode';
import { resolveOptionalUserConfigDir } from './userConfigDirPath';

type OptionalDirSettingKey =
  | 'codexHome'
  | 'claudeConfigDir'
  | 'geminiConfigDir'
  | 'cursorConfigDir';

function readOptionalSourcesDir(key: OptionalDirSettingKey, homeDir: string): string | null {
  const raw = vscode.workspace.getConfiguration('akashi.sources').get<string>(key);
  return resolveOptionalUserConfigDir(raw, homeDir);
}

/** Optional Codex CLI user root from `akashi.sources.codexHome` (before env/default fallback). */
export function readCodexHomeSettingPath(homeDir: string): string | null {
  return readOptionalSourcesDir('codexHome', homeDir);
}

/** Optional Claude Code user root from `akashi.sources.claudeConfigDir` (before env/default fallback). */
export function readClaudeConfigDirSettingPath(homeDir: string): string | null {
  return readOptionalSourcesDir('claudeConfigDir', homeDir);
}

/** Optional Gemini user root from `akashi.sources.geminiConfigDir` (before env/default fallback). */
export function readGeminiConfigDirSettingPath(homeDir: string): string | null {
  return readOptionalSourcesDir('geminiConfigDir', homeDir);
}

/** Optional Cursor user root from `akashi.sources.cursorConfigDir` (before default `~/.cursor`). */
export function readCursorConfigDirSettingPath(homeDir: string): string | null {
  return readOptionalSourcesDir('cursorConfigDir', homeDir);
}
