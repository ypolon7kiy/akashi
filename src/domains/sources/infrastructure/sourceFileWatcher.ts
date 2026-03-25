import * as vscode from 'vscode';
import { appendLine } from '../../../log';
import { buildWatcherGlobPatterns } from '../registerSourcePresets';

export interface SourceFileWatcherOptions {
  /** Called when relevant files are created, changed, or deleted (debounced). */
  readonly onFilesChanged: () => void;
  /** Debounce window in milliseconds. Defaults to 800. */
  readonly debounceMs?: number;
}

/**
 * Creates `FileSystemWatcher` instances covering every preset's workspace globs.
 * Events are debounced into a single `onFilesChanged` callback so the caller can
 * trigger a re-index without flooding the scanner.
 *
 * Returns a `Disposable` that tears down all watchers.
 */
export function createSourceFileWatcher(options: SourceFileWatcherOptions): vscode.Disposable {
  const debounceMs = options.debounceMs ?? 800;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const scheduleCallback = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      appendLine('[Akashi][FileWatcher] Debounced change detected — triggering re-index.');
      options.onFilesChanged();
    }, debounceMs);
  };

  const patterns = buildWatcherGlobPatterns();
  const watchers: vscode.FileSystemWatcher[] = [];

  for (const pattern of patterns) {
    const watcher = vscode.workspace.createFileSystemWatcher(pattern);
    watcher.onDidCreate(scheduleCallback);
    watcher.onDidChange(scheduleCallback);
    watcher.onDidDelete(scheduleCallback);
    watchers.push(watcher);
    appendLine(`[Akashi][FileWatcher] Watching: ${pattern}`);
  }

  return new vscode.Disposable(() => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    for (const w of watchers) {
      w.dispose();
    }
    appendLine('[Akashi][FileWatcher] All watchers disposed.');
  });
}
