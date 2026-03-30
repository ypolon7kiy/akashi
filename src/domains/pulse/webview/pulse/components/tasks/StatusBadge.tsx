import type { TaskStatus } from '../../../../domain/taskData';

const STATUS_ICONS: Record<TaskStatus, string> = {
  new: 'codicon-circle-outline',
  in_progress: 'codicon-loading codicon-modifier-spin',
  completed: 'codicon-check',
  paused: 'codicon-debug-pause',
  cancelled: 'codicon-close',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'New',
  in_progress: 'In Progress',
  completed: 'Completed',
  paused: 'Paused',
  cancelled: 'Cancelled',
};

interface StatusBadgeProps {
  readonly status: TaskStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`akashi-tasks-status akashi-tasks-status--${status}`}>
      <span className={STATUS_ICONS[status]} />
      {STATUS_LABELS[status]}
    </span>
  );
}
