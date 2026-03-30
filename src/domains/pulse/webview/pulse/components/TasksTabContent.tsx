import type { TaskData, TaskStatus } from '../../../domain/taskData';
import { TaskGroupCard } from './tasks/TaskGroupCard';
import { CreateGroupForm } from './tasks/CreateGroupForm';

interface TasksTabContentProps {
  readonly taskData: TaskData | null;
  readonly isBusy: boolean;
  readonly operationMessage: string | null;
  readonly onCreateGroup: (name: string) => void;
  readonly onCreateTask: (groupId: string, name: string, description: string) => void;
  readonly onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
  readonly onDeleteGroup: (groupId: string) => void;
  readonly onDeleteTask: (taskId: string) => void;
}

export function TasksTabContent({
  taskData,
  isBusy,
  operationMessage,
  onCreateGroup,
  onCreateTask,
  onUpdateTaskStatus,
  onDeleteGroup,
  onDeleteTask,
}: TasksTabContentProps) {
  if (!taskData) {
    return (
      <div className="akashi-tasks-loading">
        <span className="codicon codicon-loading codicon-modifier-spin" />
        <span>Loading tasks...</span>
      </div>
    );
  }

  const hasGroups = taskData.groups.length > 0;

  return (
    <>
      {operationMessage && <div className="akashi-tasks-toast">{operationMessage}</div>}

      <div className="akashi-tasks-content">
        {!hasGroups && (
          <div className="akashi-tasks-empty">
            <span className="codicon codicon-tasklist" />
            <p>No task groups yet</p>
            <p style={{ fontSize: '12px' }}>
              Create a group below to start organizing tasks. Tasks sync with the JetBrains task
              manager plugin.
            </p>
          </div>
        )}

        {taskData.groups.map((group) => (
          <TaskGroupCard
            key={group.id}
            group={group}
            onCreateTask={onCreateTask}
            onStatusChange={onUpdateTaskStatus}
            onDeleteTask={onDeleteTask}
            onDeleteGroup={onDeleteGroup}
            isBusy={isBusy}
          />
        ))}
      </div>

      <CreateGroupForm onSubmit={onCreateGroup} disabled={isBusy} />
    </>
  );
}
