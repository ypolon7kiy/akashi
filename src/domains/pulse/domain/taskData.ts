/**
 * Domain types for task management.
 * JSON-interoperable with the JetBrains task manager extension —
 * both use identical `.claude/tasks/tasks.json` format.
 */

export type TaskStatus = 'new' | 'in_progress' | 'completed' | 'paused' | 'cancelled';

export const TASK_STATUSES: readonly TaskStatus[] = [
  'new',
  'in_progress',
  'completed',
  'paused',
  'cancelled',
] as const;

export interface Task {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly mdFile: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly commitId: string;
}

export interface TaskGroup {
  readonly id: string;
  readonly name: string;
  readonly order: number;
  readonly createdAt: string;
  readonly tasks: readonly Task[];
}

export interface TaskData {
  readonly groups: readonly TaskGroup[];
}
