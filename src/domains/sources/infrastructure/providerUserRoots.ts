import * as path from 'node:path';
import {
  readClaudeConfigDirSettingPath,
  readCursorConfigDirSettingPath,
  readGeminiConfigDirSettingPath,
} from './vscodeSourcesDirSettings';

export interface ToolUserRoots {
  readonly claudeUserRoot: string;
  readonly cursorUserRoot: string;
  readonly geminiUserRoot: string;
}

/**
 * Effective user-scope config directories for tools that support non-default locations
 * (VS Code settings override env when set; env is only visible if the extension host inherited it).
 * Optional directory strings are read in `vscodeSourcesDirSettings.ts` (same `resolveOptionalUserConfigDir` pattern as Codex `codexHome`).
 */
export function readToolUserRoots(homeDir: string): ToolUserRoots {
  return {
    claudeUserRoot: resolveClaudeUserRoot(homeDir),
    cursorUserRoot: resolveCursorUserRoot(homeDir),
    geminiUserRoot: resolveGeminiUserRoot(homeDir),
  };
}

function resolveClaudeUserRoot(homeDir: string): string {
  const fromSetting = readClaudeConfigDirSettingPath(homeDir);
  if (fromSetting) {
    return fromSetting;
  }
  const env = process.env.CLAUDE_CONFIG_DIR?.trim();
  if (env && path.isAbsolute(env)) {
    return path.normalize(env);
  }
  return path.join(homeDir, '.claude');
}

function resolveGeminiUserRoot(homeDir: string): string {
  const fromSetting = readGeminiConfigDirSettingPath(homeDir);
  if (fromSetting) {
    return fromSetting;
  }
  const env = process.env.GEMINI_CONFIG_DIR?.trim();
  if (env && path.isAbsolute(env)) {
    return path.normalize(env);
  }
  return path.join(homeDir, '.gemini');
}

function resolveCursorUserRoot(homeDir: string): string {
  const fromSetting = readCursorConfigDirSettingPath(homeDir);
  if (fromSetting) {
    return fromSetting;
  }
  return path.join(homeDir, '.cursor');
}
