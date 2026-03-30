import { readFile, writeFile, mkdir } from 'node:fs/promises';
import * as path from 'node:path';
import { appendLine } from '../../../log';
import type { Task, TaskData, TaskGroup, TaskStatus } from '../domain/taskData';
import { TASK_STATUSES } from '../domain/taskData';

/**
 * Application service for managing tasks stored in `.claude/tasks/tasks.json`.
 * Uses `node:fs/promises` directly (matches AkashiMetaFileStore pattern).
 */
export class TaskStorageService {
  private readonly tasksFilePath: string;
  private readonly tasksDir: string;

  constructor(basePath: string) {
    if (!basePath || !path.isAbsolute(basePath)) {
      throw new Error(
        `TaskStorageService: basePath must be a non-empty absolute path, got "${basePath}"`
      );
    }
    this.tasksDir = path.join(basePath, '.claude', 'tasks');
    this.tasksFilePath = path.join(this.tasksDir, 'tasks.json');
  }

  async loadTasks(): Promise<TaskData> {
    try {
      const raw = await readFile(this.tasksFilePath, 'utf-8');
      const parsed = JSON.parse(raw) as { groups?: unknown[] };
      if (!parsed || !Array.isArray(parsed.groups)) {
        appendLine('[Akashi][Tasks] Invalid tasks.json structure — returning empty data.');
        return { groups: [] };
      }
      appendLine(`[Akashi][Tasks] Loaded ${parsed.groups.length} group(s).`);
      return parsed as TaskData;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        appendLine('[Akashi][Tasks] No tasks.json found — returning empty data.');
        return { groups: [] };
      }
      const msg = err instanceof Error ? err.message : String(err);
      appendLine(`[Akashi][Tasks] Failed to load tasks: ${msg}`);
      return { groups: [] };
    }
  }

  async saveTasks(data: TaskData): Promise<void> {
    await mkdir(this.tasksDir, { recursive: true });
    const json = JSON.stringify(data, null, 2);
    await writeFile(this.tasksFilePath, json, 'utf-8');
    appendLine(`[Akashi][Tasks] Saved ${data.groups.length} group(s).`);
  }

  async addGroup(name: string): Promise<{ ok: boolean; groupId?: string; error?: string }> {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 200) {
      return { ok: false, error: 'Group name must be 1\u2013200 characters' };
    }
    try {
      const data = await this.loadTasks();
      const groupId = shortUuid();
      const maxOrder = data.groups.reduce((max, g) => Math.max(max, g.order), 0);
      const newGroup: TaskGroup = {
        id: groupId,
        name: trimmed,
        order: maxOrder + 1,
        createdAt: nowIso(),
        tasks: [],
      };
      await this.saveTasks({ groups: [...data.groups, newGroup] });
      appendLine(`[Akashi][Tasks] Created group "${name}" (${groupId}).`);
      return { ok: true, groupId };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      appendLine(`[Akashi][Tasks] addGroup failed: ${msg}`);
      return { ok: false, error: msg };
    }
  }

  async addTask(
    groupId: string,
    name: string,
    description: string
  ): Promise<{ ok: boolean; taskId?: string; error?: string }> {
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length > 500) {
      return { ok: false, error: 'Task name must be 1\u2013500 characters' };
    }
    const trimmedDesc = description.trim().slice(0, 5000);
    try {
      const data = await this.loadTasks();
      const group = data.groups.find((g) => g.id === groupId);
      if (!group) {
        return { ok: false, error: `Group not found: ${groupId}` };
      }
      const taskId = shortUuid();
      const now = nowIso();
      const newTask: Task = {
        id: taskId,
        name: trimmedName,
        description: trimmedDesc,
        status: 'new',
        mdFile: `${groupId}/${taskId}.md`,
        createdAt: now,
        updatedAt: now,
        commitId: '',
      };
      const updatedGroups = data.groups.map((g) =>
        g.id === groupId ? { ...g, tasks: [...g.tasks, newTask] } : g
      );
      await this.saveTasks({ groups: updatedGroups });
      appendLine(`[Akashi][Tasks] Created task "${name}" (${taskId}) in group ${groupId}.`);
      return { ok: true, taskId };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      appendLine(`[Akashi][Tasks] addTask failed: ${msg}`);
      return { ok: false, error: msg };
    }
  }

  async updateTaskStatus(
    taskId: string,
    status: TaskStatus
  ): Promise<{ ok: boolean; error?: string }> {
    if (!TASK_STATUSES.includes(status)) {
      return { ok: false, error: `Invalid status: ${status}` };
    }
    try {
      const data = await this.loadTasks();
      let found = false;
      const now = nowIso();
      const updatedGroups = data.groups.map((g) => ({
        ...g,
        tasks: g.tasks.map((t) => {
          if (t.id === taskId) {
            found = true;
            return { ...t, status, updatedAt: now };
          }
          return t;
        }),
      }));
      if (!found) {
        return { ok: false, error: `Task not found: ${taskId}` };
      }
      await this.saveTasks({ groups: updatedGroups });
      appendLine(`[Akashi][Tasks] Updated task ${taskId} -> ${status}.`);
      return { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      appendLine(`[Akashi][Tasks] updateTaskStatus failed: ${msg}`);
      return { ok: false, error: msg };
    }
  }

  async deleteGroup(groupId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const data = await this.loadTasks();
      const filtered = data.groups.filter((g) => g.id !== groupId);
      if (filtered.length === data.groups.length) {
        return { ok: false, error: `Group not found: ${groupId}` };
      }
      await this.saveTasks({ groups: filtered });
      appendLine(`[Akashi][Tasks] Deleted group ${groupId}.`);
      return { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      appendLine(`[Akashi][Tasks] deleteGroup failed: ${msg}`);
      return { ok: false, error: msg };
    }
  }

  async deleteTask(taskId: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const data = await this.loadTasks();
      let found = false;
      const updatedGroups = data.groups.map((g) => {
        const filtered = g.tasks.filter((t) => t.id !== taskId);
        if (filtered.length !== g.tasks.length) {
          found = true;
        }
        return { ...g, tasks: filtered };
      });
      if (!found) {
        return { ok: false, error: `Task not found: ${taskId}` };
      }
      await this.saveTasks({ groups: updatedGroups });
      appendLine(`[Akashi][Tasks] Deleted task ${taskId}.`);
      return { ok: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      appendLine(`[Akashi][Tasks] deleteTask failed: ${msg}`);
      return { ok: false, error: msg };
    }
  }
}

/** 8-character UUID prefix matching the JB extension's `shortUuid()`. */
function shortUuid(): string {
  return crypto.randomUUID().substring(0, 8);
}

/** ISO 8601 UTC timestamp matching the JB extension's `now_iso()`. */
function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}
