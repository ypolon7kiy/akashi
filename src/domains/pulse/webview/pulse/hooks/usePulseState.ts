import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getVscodeApi } from '../../../../../webview-shared/api';
import { PulseMessageType } from '../messages';
import type { DashboardData, SessionSummary, TimelineResponse } from '../../../domain/model';
import type { TaskData, TaskStatus } from '../../../domain/taskData';

export type PulseTab = 'sessions' | 'infographics' | 'tasks';
type View = 'dashboard' | 'session-detail' | 'conversation' | 'gantt' | 'subagent-tree';

export function usePulseState() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [activeTab, setActiveTab] = useState<PulseTab>('sessions');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [timelineData, setTimelineData] = useState<TimelineResponse | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [subagentTimeline, setSubagentTimeline] = useState<TimelineResponse | null>(null);

  const [taskData, setTaskData] = useState<TaskData | null>(null);
  const [taskOperationMessage, setTaskOperationMessage] = useState<string | null>(null);
  const [taskBusy, setTaskBusy] = useState(false);
  const busyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startBusy = useCallback(() => {
    setTaskBusy(true);
    if (busyTimeoutRef.current !== null) {
      clearTimeout(busyTimeoutRef.current);
    }
    busyTimeoutRef.current = setTimeout(() => {
      setTaskBusy(false);
      busyTimeoutRef.current = null;
    }, 30_000);
  }, []);

  const clearBusy = useCallback(() => {
    setTaskBusy(false);
    if (busyTimeoutRef.current !== null) {
      clearTimeout(busyTimeoutRef.current);
      busyTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (busyTimeoutRef.current !== null) {
        clearTimeout(busyTimeoutRef.current);
      }
      if (toastTimeoutRef.current !== null) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      const msg = event.data as { type?: string; payload?: unknown };
      if (
        msg?.type === PulseMessageType.DashboardData ||
        msg?.type === PulseMessageType.SessionUpdate
      ) {
        setData(msg.payload as DashboardData);
      } else if (msg?.type === PulseMessageType.TimelineData) {
        setTimelineData(msg.payload as TimelineResponse);
        setTimelineLoading(false);
      } else if (msg?.type === PulseMessageType.SubagentTimelineData) {
        setSubagentTimeline(msg.payload as TimelineResponse);
      } else if (msg?.type === PulseMessageType.TaskData) {
        setTaskData(msg.payload as TaskData | null);
      } else if (msg?.type === PulseMessageType.TaskOperationResult) {
        clearBusy();
        const p = msg.payload as { operation?: string; ok?: boolean; error?: string } | undefined;
        if (p?.ok) {
          setTaskOperationMessage(formatOperation(p.operation));
        } else {
          setTaskOperationMessage(p?.error ?? 'Operation failed');
        }
        if (toastTimeoutRef.current !== null) {
          clearTimeout(toastTimeoutRef.current);
        }
        toastTimeoutRef.current = setTimeout(() => {
          setTaskOperationMessage(null);
          toastTimeoutRef.current = null;
        }, 4000);
      }
    };
    window.addEventListener('message', onMessage);
    const api = getVscodeApi();
    api?.postMessage({ type: PulseMessageType.WebviewReady });
    return () => window.removeEventListener('message', onMessage);
  }, [clearBusy]);

  const requestTimeline = useCallback((sessionId: string) => {
    setTimelineLoading(true);
    setTimelineData(null);
    getVscodeApi()?.postMessage({
      type: PulseMessageType.RequestTimeline,
      payload: { sessionId },
    });
  }, []);

  const requestSubagentTimeline = useCallback((sessionId: string, agentId: string) => {
    setSubagentTimeline(null);
    getVscodeApi()?.postMessage({
      type: PulseMessageType.RequestSubagentTimeline,
      payload: { sessionId, agentId },
    });
  }, []);

  const handleSelectSession = useCallback((session: SessionSummary) => {
    setSelectedSessionId(session.id);
    setActiveTab('sessions');
    setView('session-detail');
  }, []);

  const handleBack = useCallback(() => {
    if (view === 'conversation' || view === 'gantt' || view === 'subagent-tree') {
      setTimelineData(null);
      setSubagentTimeline(null);
      setTimelineLoading(false);
      setView('session-detail');
    } else {
      setSelectedSessionId(null);
      setView('dashboard');
    }
  }, [view]);

  const handleSelectProject = useCallback((projectName: string | null) => {
    setSelectedProject((prev) => (prev === projectName ? null : projectName));
  }, []);

  const handleRefresh = useCallback(() => {
    getVscodeApi()?.postMessage({ type: PulseMessageType.RefreshRequest });
  }, []);

  const handleResumeSession = useCallback((sessionId: string, cwd: string) => {
    getVscodeApi()?.postMessage({
      type: PulseMessageType.ResumeSession,
      payload: { sessionId, cwd },
    });
  }, []);

  const handleDeleteSessions = useCallback((sessionIds: readonly string[]) => {
    if (sessionIds.length === 0) return;
    getVscodeApi()?.postMessage({
      type: PulseMessageType.DeleteSessions,
      payload: { sessionIds: [...sessionIds] },
    });
  }, []);

  const handleShowConversation = useCallback(
    (sessionId: string) => {
      requestTimeline(sessionId);
      setView('conversation');
    },
    [requestTimeline]
  );

  const handleShowGantt = useCallback(
    (sessionId: string) => {
      requestTimeline(sessionId);
      setView('gantt');
    },
    [requestTimeline]
  );

  const handleShowSubagentTree = useCallback(
    (sessionId: string) => {
      requestTimeline(sessionId);
      setView('subagent-tree');
    },
    [requestTimeline]
  );

  const selectedSession = useMemo(
    () =>
      selectedSessionId && data
        ? (data.sessions.find((s) => s.id === selectedSessionId) ?? null)
        : null,
    [data, selectedSessionId]
  );

  const handleSelectAgent = useCallback(
    (agentId: string) => {
      if (selectedSessionId) {
        requestSubagentTimeline(selectedSessionId, agentId);
      }
    },
    [selectedSessionId, requestSubagentTimeline]
  );

  const filteredSessions = useMemo(() => {
    if (!data) return [];
    return data.sessions.filter((s) => {
      if (selectedProject && s.projectName !== selectedProject) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.firstUserPrompt.toLowerCase().includes(q) ||
        s.projectName.toLowerCase().includes(q) ||
        s.model.toLowerCase().includes(q)
      );
    });
  }, [data, selectedProject, searchQuery]);

  const createGroup = useCallback(
    (name: string) => {
      startBusy();
      getVscodeApi()?.postMessage({
        type: PulseMessageType.CreateGroup,
        payload: { name },
      });
    },
    [startBusy]
  );

  const createTask = useCallback(
    (groupId: string, name: string, description: string) => {
      startBusy();
      getVscodeApi()?.postMessage({
        type: PulseMessageType.CreateTask,
        payload: { groupId, name, description },
      });
    },
    [startBusy]
  );

  const updateTaskStatus = useCallback(
    (taskId: string, status: TaskStatus) => {
      startBusy();
      getVscodeApi()?.postMessage({
        type: PulseMessageType.UpdateTaskStatus,
        payload: { taskId, status },
      });
    },
    [startBusy]
  );

  const deleteGroup = useCallback(
    (groupId: string) => {
      startBusy();
      getVscodeApi()?.postMessage({
        type: PulseMessageType.DeleteGroup,
        payload: { groupId },
      });
    },
    [startBusy]
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      startBusy();
      getVscodeApi()?.postMessage({
        type: PulseMessageType.DeleteTask,
        payload: { taskId },
      });
    },
    [startBusy]
  );

  return {
    data,
    view,
    activeTab,
    searchQuery,
    selectedProject,
    selectedSession,
    filteredSessions,
    timelineData,
    timelineLoading,
    subagentTimeline,
    setSearchQuery,
    setActiveTab,
    handleSelectSession,
    handleBack,
    handleSelectProject,
    handleRefresh,
    handleResumeSession,
    handleDeleteSessions,
    handleShowConversation,
    handleShowGantt,
    handleShowSubagentTree,
    handleSelectAgent,
    taskData,
    taskBusy,
    taskOperationMessage,
    createGroup,
    createTask,
    updateTaskStatus,
    deleteGroup,
    deleteTask,
  };
}

function formatOperation(op?: string): string {
  switch (op) {
    case 'createGroup':
      return 'Group created successfully';
    case 'createTask':
      return 'Task created successfully';
    case 'updateStatus':
      return 'Status updated successfully';
    case 'deleteGroup':
      return 'Group deleted successfully';
    case 'deleteTask':
      return 'Task deleted successfully';
    default:
      return 'Done';
  }
}
