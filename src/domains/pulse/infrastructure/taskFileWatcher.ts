import * as vscode from 'vscode';
import { appendLine } from '../../../log';

export interface TaskFileWatcherOptions {
  /** Called when `.claude/tasks/tasks.json` is created, changed, or deleted (debounced). */
  readonly onTasksChanged: () => void;
  /** Debounce window in milliseconds. Defaults to 800. */
  readonly debounceMs?: number;
}

/**
 * Creates a `FileSystemWatcher` on `**\/.claude/tasks/tasks.json`.
 * Events are debounced into a single callback so the panel can refresh
 * after external changes (e.g. Claude CLI, JetBrains plugin, or manual edits).
 */
export function createTaskFileWatcher(options: TaskFileWatcherOptions): vscode.Disposable {
  const debounceMs = options.debounceMs ?? 800;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const scheduleCallback = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      appendLine('[Akashi][Tasks] File change detected — refreshing.');
      options.onTasksChanged();
    }, debounceMs);
  };

  const pattern = '**/.claude/tasks/tasks.json';
  const watcher = vscode.workspace.createFileSystemWatcher(pattern);
  watcher.onDidCreate(scheduleCallback);
  watcher.onDidChange(scheduleCallback);
  watcher.onDidDelete(scheduleCallback);
  appendLine(`[Akashi][Tasks] Watching: ${pattern}`);

  return new vscode.Disposable(() => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    watcher.dispose();
    appendLine('[Akashi][Tasks] Watcher disposed.');
  });
}
