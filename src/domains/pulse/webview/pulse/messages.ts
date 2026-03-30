/** Message types for host <-> webview communication in the pulse panel. */
export const PulseMessageType = {
  // Host -> Webview
  DashboardData: 'pulse/dashboardData',
  SessionUpdate: 'pulse/sessionUpdate',
  TimelineData: 'pulse/timelineData',
  SubagentTimelineData: 'pulse/subagentTimelineData',

  // Webview -> Host
  WebviewReady: 'pulse/webviewReady',
  RefreshRequest: 'pulse/refreshRequest',
  RequestTimeline: 'pulse/requestTimeline',
  RequestSubagentTimeline: 'pulse/requestSubagentTimeline',
  DeleteSessions: 'pulse/deleteSessions',
  ResumeSession: 'pulse/resumeSession',

  // Host -> Webview (Tasks)
  TaskData: 'tasks/taskData',
  TaskOperationResult: 'tasks/operationResult',

  // Webview -> Host (Tasks)
  TasksRefreshRequest: 'tasks/refreshRequest',
  CreateGroup: 'tasks/createGroup',
  CreateTask: 'tasks/createTask',
  UpdateTaskStatus: 'tasks/updateTaskStatus',
  DeleteGroup: 'tasks/deleteGroup',
  DeleteTask: 'tasks/deleteTask',
} as const;
