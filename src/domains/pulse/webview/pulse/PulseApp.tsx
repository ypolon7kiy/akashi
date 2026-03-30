import { usePulseState } from './hooks/usePulseState';
import { StatsBar } from './components/StatsBar';
import { ProjectGrid } from './components/ProjectGrid';
import { SessionList } from './components/SessionList';
import { SessionDetail } from './components/SessionDetail';
import { SearchBar } from './components/SearchBar';
import { ConversationView } from './components/ConversationView';
import { GanttView } from './components/GanttView';
import { SubagentTree } from './components/SubagentTree';
import { ActivityChart } from './components/ActivityChart';
import { HeatmapChart } from './components/HeatmapChart';
import { TasksTabContent } from './components/TasksTabContent';

export function PulseApp() {
  const {
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
  } = usePulseState();

  if (!data) {
    return (
      <div className="pulse-app">
        <div className="pulse-loading">
          <span className="codicon codicon-loading codicon-modifier-spin" />
          <span className="pulse-loading__text">Scanning sessions...</span>
          <span className="pulse-loading__hint">Reading ~/.claude/projects/</span>
        </div>
      </div>
    );
  }

  if (data.sessions.length === 0) {
    return (
      <div className="pulse-app">
        <div className="pulse-empty">
          <div className="pulse-empty__title">No sessions found</div>
          <p>No Claude Code session data found in ~/.claude/projects/.</p>
          <p>Start a Claude Code session to see analytics here.</p>
        </div>
      </div>
    );
  }

  const detailContent = selectedSession
    ? resolveDetailView(view, {
        session: selectedSession,
        timelineData,
        timelineLoading,
        subagentTimeline,
        onBack: handleBack,
        onResume: handleResumeSession,
        onShowConversation: handleShowConversation,
        onShowGantt: handleShowGantt,
        onShowSubagentTree: handleShowSubagentTree,
        onSelectAgent: handleSelectAgent,
      })
    : null;

  if (detailContent) {
    return (
      <div className="pulse-app">
        <main className="pulse-content">{detailContent}</main>
      </div>
    );
  }

  return (
    <div className="pulse-app">
      <header className="pulse-header">
        <div className="pulse-header__title-row">
          <span className="codicon codicon-pulse" />
          <h1 className="pulse-header__title">Pulse</h1>
          <button className="pulse-header__refresh" onClick={handleRefresh} title="Refresh">
            <span className="codicon codicon-refresh" />
          </button>
        </div>

        <div className="pulse-tabs" role="tablist" aria-label="Pulse views">
          <button
            role="tab"
            id="pulse-tab-sessions"
            aria-selected={activeTab === 'sessions'}
            aria-controls="pulse-panel-sessions"
            className={`pulse-tab ${activeTab === 'sessions' ? 'pulse-tab--active' : ''}`}
            onClick={() => setActiveTab('sessions')}
          >
            Sessions ({filteredSessions.length})
          </button>
          <button
            role="tab"
            id="pulse-tab-tasks"
            aria-selected={activeTab === 'tasks'}
            aria-controls="pulse-panel-tasks"
            className={`pulse-tab ${activeTab === 'tasks' ? 'pulse-tab--active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            Tasks
          </button>
          <button
            role="tab"
            id="pulse-tab-infographics"
            aria-selected={activeTab === 'infographics'}
            aria-controls="pulse-panel-infographics"
            className={`pulse-tab ${activeTab === 'infographics' ? 'pulse-tab--active' : ''}`}
            onClick={() => setActiveTab('infographics')}
          >
            Infographics
          </button>
        </div>

        {activeTab === 'sessions' && <SearchBar query={searchQuery} onChange={setSearchQuery} />}
      </header>

      <main
        id={`pulse-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`pulse-tab-${activeTab}`}
        className="pulse-content"
      >
        {activeTab === 'sessions' && (
          <>
            <div className="pulse-section-header">
              <span className="pulse-section-header__title">Projects</span>
              {selectedProject && (
                <button
                  className="pulse-section-header__action"
                  onClick={() => handleSelectProject(null)}
                >
                  Clear filter
                </button>
              )}
            </div>
            <ProjectGrid
              projects={data.projects}
              selectedProject={selectedProject}
              onSelect={handleSelectProject}
            />

            <div className="pulse-section-header">
              <span className="pulse-section-header__title">
                Sessions ({filteredSessions.length})
              </span>
            </div>
            <SessionList
              sessions={filteredSessions}
              onSelect={handleSelectSession}
              onResume={handleResumeSession}
              onDelete={handleDeleteSessions}
            />
          </>
        )}

        {activeTab === 'infographics' && (
          <>
            <StatsBar stats={data.totalStats} onRefresh={handleRefresh} />

            {data.dailyActivity.length > 1 && (
              <>
                <div className="pulse-section-header pulse-section-header--spaced">
                  <span className="pulse-section-header__title">Activity</span>
                </div>
                <ActivityChart dailyActivity={data.dailyActivity} />
              </>
            )}

            {data.hourlyActivity.length > 0 && (
              <>
                <div className="pulse-section-header pulse-section-header--spaced">
                  <span className="pulse-section-header__title">Usage Pattern</span>
                </div>
                <HeatmapChart hourlyActivity={data.hourlyActivity} />
              </>
            )}
          </>
        )}

        {activeTab === 'tasks' && (
          <TasksTabContent
            taskData={taskData}
            isBusy={taskBusy}
            operationMessage={taskOperationMessage}
            onCreateGroup={createGroup}
            onCreateTask={createTask}
            onUpdateTaskStatus={updateTaskStatus}
            onDeleteGroup={deleteGroup}
            onDeleteTask={deleteTask}
          />
        )}
      </main>
    </div>
  );
}

// ── Detail view resolver ──────────────────────────────────────────────

interface DetailViewProps {
  readonly session: NonNullable<ReturnType<typeof usePulseState>['selectedSession']>;
  readonly timelineData: ReturnType<typeof usePulseState>['timelineData'];
  readonly timelineLoading: boolean;
  readonly subagentTimeline: ReturnType<typeof usePulseState>['subagentTimeline'];
  readonly onBack: () => void;
  readonly onResume: (sessionId: string, cwd: string) => void;
  readonly onShowConversation: (sessionId: string) => void;
  readonly onShowGantt: (sessionId: string) => void;
  readonly onShowSubagentTree: (sessionId: string) => void;
  readonly onSelectAgent: (agentId: string) => void;
}

function resolveDetailView(
  view: ReturnType<typeof usePulseState>['view'],
  props: DetailViewProps
): React.JSX.Element | null {
  switch (view) {
    case 'conversation':
      return (
        <ConversationView
          session={props.session}
          timeline={props.timelineData}
          loading={props.timelineLoading}
          onBack={props.onBack}
        />
      );
    case 'gantt':
      return (
        <GanttView
          session={props.session}
          timeline={props.timelineData}
          loading={props.timelineLoading}
          onBack={props.onBack}
        />
      );
    case 'subagent-tree':
      return (
        <SubagentTree
          session={props.session}
          timeline={props.timelineData}
          subagentTimeline={props.subagentTimeline}
          loading={props.timelineLoading}
          onBack={props.onBack}
          onSelectAgent={props.onSelectAgent}
        />
      );
    case 'session-detail':
      return (
        <SessionDetail
          session={props.session}
          onBack={props.onBack}
          onResume={props.onResume}
          onShowConversation={props.onShowConversation}
          onShowGantt={props.onShowGantt}
          onShowSubagentTree={props.onShowSubagentTree}
        />
      );
    default:
      return null;
  }
}
