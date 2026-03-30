import type { TaskStatus } from '../../../../domain/taskData';
import { TASK_STATUSES } from '../../../../domain/taskData';

const STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'New',
  in_progress: 'In Progress',
  completed: 'Completed',
  paused: 'Paused',
  cancelled: 'Cancelled',
};

interface StatusPickerProps {
  readonly current: TaskStatus;
  readonly onChange: (status: TaskStatus) => void;
}

export function StatusPicker({ current, onChange }: StatusPickerProps) {
  return (
    <select
      className="akashi-tasks-status-picker"
      value={current}
      onChange={(e) => onChange(e.target.value as TaskStatus)}
    >
      {TASK_STATUSES.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
