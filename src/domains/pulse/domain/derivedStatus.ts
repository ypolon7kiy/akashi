import type { TaskGroup, TaskStatus } from './taskData';

/**
 * Derive the overall status of a group from its child tasks.
 * Port of `TaskGroup.derivedStatus` from the JetBrains extension.
 */
export function derivedGroupStatus(group: TaskGroup): TaskStatus {
  const { tasks } = group;
  if (tasks.length === 0) {
    return 'new';
  }
  if (tasks.every((t) => t.status === 'completed' || t.status === 'cancelled')) {
    return 'completed';
  }
  if (tasks.some((t) => t.status === 'in_progress')) {
    return 'in_progress';
  }
  if (tasks.some((t) => t.status === 'paused')) {
    return 'paused';
  }
  return 'new';
}
