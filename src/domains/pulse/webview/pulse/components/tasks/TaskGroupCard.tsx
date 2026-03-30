import { useState } from 'react';
import type { TaskGroup, TaskStatus } from '../../../../domain/taskData';
import { derivedGroupStatus } from '../../../../domain/derivedStatus';
import { StatusBadge } from './StatusBadge';
import { TaskItem } from './TaskItem';
import { CreateTaskForm } from './CreateTaskForm';

interface TaskGroupCardProps {
  readonly group: TaskGroup;
  readonly onCreateTask: (groupId: string, name: string, description: string) => void;
  readonly onStatusChange: (taskId: string, status: TaskStatus) => void;
  readonly onDeleteTask: (taskId: string) => void;
  readonly onDeleteGroup: (groupId: string) => void;
  readonly isBusy: boolean;
}

export function TaskGroupCard({
  group,
  onCreateTask,
  onStatusChange,
  onDeleteTask,
  onDeleteGroup,
  isBusy,
}: TaskGroupCardProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const groupStatus = derivedGroupStatus(group);

  return (
    <div className="akashi-tasks-group">
      <div
        className="akashi-tasks-group__header"
        role="button"
        tabIndex={0}
        aria-expanded={!collapsed}
        onClick={() => setCollapsed(!collapsed)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setCollapsed(!collapsed);
          }
        }}
      >
        <span className={`codicon codicon-chevron-${collapsed ? 'right' : 'down'}`} />
        <span className="akashi-tasks-group__name">{group.name}</span>
        <StatusBadge status={groupStatus} />
        <span className="akashi-tasks-group__meta">
          {group.tasks.length} task{group.tasks.length !== 1 ? 's' : ''}
        </span>
        <div className="akashi-tasks-group__actions" onClick={(e) => e.stopPropagation()}>
          <button
            className="akashi-tasks-icon-btn"
            title="Add task"
            onClick={() => setShowAddTask(!showAddTask)}
          >
            <span className="codicon codicon-add" />
          </button>
          <button
            className="akashi-tasks-icon-btn"
            title="Delete group"
            onClick={() => onDeleteGroup(group.id)}
          >
            <span className="codicon codicon-trash" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="akashi-tasks-group__body">
          {group.tasks.length === 0 && !showAddTask && (
            <div className="akashi-tasks-group__empty">No tasks yet</div>
          )}
          {group.tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onStatusChange={onStatusChange}
              onDelete={onDeleteTask}
            />
          ))}
          {showAddTask && (
            <CreateTaskForm
              groupId={group.id}
              onSubmit={(gid, name, desc) => {
                onCreateTask(gid, name, desc);
                setShowAddTask(false);
              }}
              onCancel={() => setShowAddTask(false)}
              disabled={isBusy}
            />
          )}
        </div>
      )}
    </div>
  );
}
