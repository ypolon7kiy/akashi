import * as vscode from 'vscode';
import { appendLine } from '../../../log';

export interface PulseSessionWatcherOptions {
  /** Absolute path to ~/.claude/projects/ */
  readonly claudeProjectsDir: string;
  /** Called when a session .jsonl file is created or modified (debounced). */
  readonly onSessionChanged: (filePath: string) => void;
  /** Debounce window in milliseconds. Defaults to 800. */
  readonly debounceMs?: number;
}

/**
 * Creates a `FileSystemWatcher` for `**\/*.jsonl` under the Claude projects directory.
 * Events are debounced per-file so the caller can trigger an incremental rescan.
 *
 * Returns a `Disposable` that tears down the watcher.
 */
export function createPulseSessionWatcher(options: PulseSessionWatcherOptions): vscode.Disposable {
  const debounceMs = options.debounceMs ?? 800;
  const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

  const scheduleCallback = (uri: vscode.Uri): void => {
    const filePath = uri.fsPath;
    // Only watch .jsonl files (not .meta.json or other files)
    if (!filePath.endsWith('.jsonl')) return;

    const existing = pendingTimers.get(filePath);
    if (existing !== undefined) {
      clearTimeout(existing);
    }

    pendingTimers.set(
      filePath,
      setTimeout(() => {
        pendingTimers.delete(filePath);
        appendLine(`[Akashi][Pulse][Watcher] Session changed: ${filePath}`);
        options.onSessionChanged(filePath);
      }, debounceMs)
    );
  };

  const pattern = new vscode.RelativePattern(
    vscode.Uri.file(options.claudeProjectsDir),
    '**/*.jsonl'
  );

  const watcher = vscode.workspace.createFileSystemWatcher(pattern);
  watcher.onDidCreate(scheduleCallback);
  watcher.onDidChange(scheduleCallback);
  appendLine(`[Akashi][Pulse][Watcher] Watching: ${options.claudeProjectsDir}/**/*.jsonl`);

  return new vscode.Disposable(() => {
    for (const timer of pendingTimers.values()) {
      clearTimeout(timer);
    }
    pendingTimers.clear();
    watcher.dispose();
    appendLine('[Akashi][Pulse][Watcher] Disposed.');
  });
}
