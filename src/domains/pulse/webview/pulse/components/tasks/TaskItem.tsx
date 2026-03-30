import type { Task, TaskStatus } from '../../../../domain/taskData';
import { StatusPicker } from './StatusPicker';

interface TaskItemProps {
  readonly task: Task;
  readonly onStatusChange: (taskId: string, status: TaskStatus) => void;
  readonly onDelete: (taskId: string) => void;
}

export function TaskItem({ task, onStatusChange, onDelete }: TaskItemProps) {
  return (
    <div className="akashi-tasks-item">
      <span className="akashi-tasks-item__name">
        {task.name}
        {task.description && <span className="akashi-tasks-item__desc">— {task.description}</span>}
      </span>
      <div className="akashi-tasks-item__actions">
        <StatusPicker
          current={task.status}
          onChange={(status) => onStatusChange(task.id, status)}
        />
        <button
          className="akashi-tasks-icon-btn"
          title="Delete task"
          onClick={() => onDelete(task.id)}
        >
          <span className="codicon codicon-trash" />
        </button>
      </div>
    </div>
  );
}
