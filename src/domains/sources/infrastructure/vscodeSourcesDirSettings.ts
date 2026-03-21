import * as vscode from 'vscode';
import { resolveOptionalUserConfigDir } from './userConfigDirPath';

/** Keys under `akashi.homePathOverrides`. */
type HomePathOverrideTool = 'claude' | 'codex' | 'cursor' | 'gemini';

function readRawHomePathOverride(tool: HomePathOverrideTool): string | undefined {
  const obj = vscode.workspace
    .getConfiguration('akashi')
    .get<Partial<Record<HomePathOverrideTool, unknown>>>('homePathOverrides');
  const v = obj?.[tool];
  return typeof v === 'string' ? v : undefined;
}

function readOptionalSourcesDirForTool(tool: HomePathOverrideTool, homeDir: string): string | null {
  return resolveOptionalUserConfigDir(readRawHomePathOverride(tool), homeDir);
}

/** Optional Codex CLI user root from `akashi.homePathOverrides.codex`, before env/default fallback. */
export function readCodexHomeSettingPath(homeDir: string): string | null {
  return readOptionalSourcesDirForTool('codex', homeDir);
}

/** Optional Claude Code user root from `akashi.homePathOverrides.claude`, before env/default fallback. */
export function readClaudeConfigDirSettingPath(homeDir: string): string | null {
  return readOptionalSourcesDirForTool('claude', homeDir);
}

/** Optional Gemini user root from `akashi.homePathOverrides.gemini`, before env/default fallback. */
export function readGeminiConfigDirSettingPath(homeDir: string): string | null {
  return readOptionalSourcesDirForTool('gemini', homeDir);
}

/** Optional Cursor user root from `akashi.homePathOverrides.cursor`, before default `~/.cursor`. */
export function readCursorConfigDirSettingPath(homeDir: string): string | null {
  return readOptionalSourcesDirForTool('cursor', homeDir);
}
