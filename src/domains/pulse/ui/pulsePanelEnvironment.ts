import type { DashboardData, TimelineResponse } from '../domain/model';
import type { TaskData, TaskStatus } from '../domain/taskData';

/** Dependency-injection interface for the PulsePanel — no vscode imports allowed. */
export interface PulsePanelEnvironment {
  getDashboardData: () => Promise<DashboardData>;
  getSessionTimeline: (sessionId: string) => Promise<TimelineResponse | null>;
  getSubagentTimeline: (sessionId: string, agentId: string) => Promise<TimelineResponse | null>;
  deleteSessions: (sessionIds: readonly string[]) => Promise<DashboardData>;
  resumeSession: (sessionId: string, cwd: string) => Promise<void>;

  // Tasks
  getTaskData: () => Promise<TaskData | null>;
  createGroup: (name: string) => Promise<{ ok: boolean; groupId?: string; error?: string }>;
  createTask: (
    groupId: string,
    name: string,
    description: string
  ) => Promise<{ ok: boolean; taskId?: string; error?: string }>;
  updateTaskStatus: (
    taskId: string,
    status: TaskStatus
  ) => Promise<{ ok: boolean; error?: string }>;
  deleteGroup: (groupId: string) => Promise<{ ok: boolean; error?: string }>;
  deleteTask: (taskId: string) => Promise<{ ok: boolean; error?: string }>;
}
