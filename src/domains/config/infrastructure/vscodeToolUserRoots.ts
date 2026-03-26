import * as path from 'node:path';
import * as vscode from 'vscode';
import type { ToolUserRoots } from '../../../shared/toolUserRoots';
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

/**
 * Effective user-scope config directories for tools that support non-default locations
 * (VS Code settings override env when set; env is only visible if the extension host inherited it).
 */
export function readToolUserRoots(homeDir: string): ToolUserRoots {
  return {
    claudeUserRoot: resolveClaudeUserRoot(homeDir),
    cursorUserRoot: resolveCursorUserRoot(homeDir),
    geminiUserRoot: resolveGeminiUserRoot(homeDir),
    codexUserRoot: resolveCodexUserRoot(homeDir),
  };
}

function resolveClaudeUserRoot(homeDir: string): string {
  const fromSetting = readOptionalSourcesDirForTool('claude', homeDir);
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
  const fromSetting = readOptionalSourcesDirForTool('gemini', homeDir);
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
  const fromSetting = readOptionalSourcesDirForTool('cursor', homeDir);
  if (fromSetting) {
    return fromSetting;
  }
  return path.join(homeDir, '.cursor');
}

function resolveCodexUserRoot(homeDir: string): string {
  const fromSetting = readOptionalSourcesDirForTool('codex', homeDir);
  if (fromSetting) {
    return fromSetting;
  }
  const env = process.env.CODEX_HOME?.trim();
  if (env && path.isAbsolute(env)) {
    return path.normalize(env);
  }
  return path.join(homeDir, '.codex');
}
