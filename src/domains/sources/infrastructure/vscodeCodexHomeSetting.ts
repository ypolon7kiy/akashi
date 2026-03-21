import * as os from 'node:os';
import * as vscode from 'vscode';
import { resolveCodexHomeSettingPath } from './codexHomePath';

/** Reads `akashi.sources.codexHome` and returns an absolute directory, or `null`. */
export function readCodexHomeSettingPath(): string | null {
  const raw = vscode.workspace.getConfiguration('akashi.sources').get<string>('codexHome');
  return resolveCodexHomeSettingPath(raw, os.homedir());
}
