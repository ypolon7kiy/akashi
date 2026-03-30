import type { SessionSummary } from '../../../domain/model';
import { formatTokenCount, formatDuration, formatShortDate } from '../../../domain/format';
import { sessionTotalTokens } from '../../../domain/scanner';

interface SessionDetailProps {
  session: SessionSummary;
  onBack: () => void;
  onResume: (sessionId: string, cwd: string) => void;
  onShowConversation?: (sessionId: string) => void;
  onShowGantt?: (sessionId: string) => void;
  onShowSubagentTree?: (sessionId: string) => void;
}

export function SessionDetail({
  session,
  onBack,
  onResume,
  onShowConversation,
  onShowGantt,
  onShowSubagentTree,
}: SessionDetailProps) {
  const totalTokens = sessionTotalTokens(session);

  return (
    <div className="pulse-detail">
      <button className="pulse-detail__back" onClick={onBack}>
        <span className="codicon codicon-chevron-left" aria-hidden />
        Back to dashboard
      </button>

      <div className="pulse-detail__title">{session.projectName}</div>

      <div className="pulse-detail__info-row">
        <div className="pulse-detail__info-item">
          <span>Model:</span>
          <span className="pulse-detail__info-value">{session.model}</span>
        </div>
        <div className="pulse-detail__info-item">
          <span>Duration:</span>
          <span className="pulse-detail__info-value">{formatDuration(session.durationMs)}</span>
        </div>
        <div className="pulse-detail__info-item">
          <span>Started:</span>
          <span className="pulse-detail__info-value">{formatShortDate(session.startTime)}</span>
        </div>
        <div className="pulse-detail__info-item">
          <span>Messages:</span>
          <span className="pulse-detail__info-value">
            {session.userMessageCount} user / {session.assistantMessageCount} assistant
          </span>
        </div>
        {session.gitBranch && (
          <div className="pulse-detail__info-item">
            <span>Branch:</span>
            <span className="pulse-detail__info-value">{session.gitBranch}</span>
          </div>
        )}
        {session.subagentCount > 0 && (
          <div className="pulse-detail__info-item">
            <span>Subagents:</span>
            <span className="pulse-detail__info-value">{session.subagentCount}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="pulse-detail__actions">
        {onShowConversation && (
          <button className="pulse-resume-btn" onClick={() => onShowConversation(session.id)}>
            <span className="codicon codicon-comment-discussion" aria-hidden />
            Conversation
          </button>
        )}
        {onShowGantt && session.toolCalls.length > 0 && (
          <button className="pulse-resume-btn" onClick={() => onShowGantt(session.id)}>
            <span className="codicon codicon-list-flat" aria-hidden />
            Tool Timeline
          </button>
        )}
        {onShowSubagentTree && session.subagentCount > 0 && (
          <button className="pulse-resume-btn" onClick={() => onShowSubagentTree(session.id)}>
            <span className="codicon codicon-type-hierarchy" aria-hidden />
            Subagent Tree
          </button>
        )}
        <button
          className="pulse-resume-btn"
          onClick={() => onResume(session.id, session.workspacePath)}
        >
          <span className="codicon codicon-terminal" aria-hidden />
          Resume Session
        </button>
      </div>

      {/* Token breakdown */}
      <div className="pulse-detail__token-grid">
        <div className="pulse-detail__token-card">
          <div className="pulse-detail__token-value">{formatTokenCount(totalTokens)}</div>
          <div className="pulse-detail__token-label">Total</div>
        </div>
        <div className="pulse-detail__token-card">
          <div className="pulse-detail__token-value">
            {formatTokenCount(session.totalInputTokens)}
          </div>
          <div className="pulse-detail__token-label">Input</div>
        </div>
        <div className="pulse-detail__token-card">
          <div className="pulse-detail__token-value">
            {formatTokenCount(session.totalOutputTokens)}
          </div>
          <div className="pulse-detail__token-label">Output</div>
        </div>
        <div className="pulse-detail__token-card">
          <div className="pulse-detail__token-value">
            {formatTokenCount(session.totalCacheReadTokens)}
          </div>
          <div className="pulse-detail__token-label">Cache Read</div>
        </div>
        <div className="pulse-detail__token-card">
          <div className="pulse-detail__token-value">
            {formatTokenCount(session.totalCacheCreateTokens)}
          </div>
          <div className="pulse-detail__token-label">Cache Create</div>
        </div>
      </div>

      {/* First user prompt */}
      {session.firstUserPrompt && (
        <div className="pulse-detail__prompt-section">
          <div className="pulse-detail__prompt-label">First prompt</div>
          <div className="pulse-detail__prompt-text">{session.firstUserPrompt}</div>
        </div>
      )}

      {/* Last user prompt */}
      {session.lastUserPrompt && session.lastUserPrompt !== session.firstUserPrompt && (
        <div className="pulse-detail__prompt-section">
          <div className="pulse-detail__prompt-label">Last prompt</div>
          <div className="pulse-detail__prompt-text">{session.lastUserPrompt}</div>
        </div>
      )}

      {/* Tool calls */}
      {session.toolCalls.length > 0 && (
        <>
          <div className="pulse-section-header">
            <span className="pulse-section-header__title">Tool Calls</span>
          </div>
          <table className="pulse-tools-table">
            <thead>
              <tr>
                <th>Tool</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {session.toolCalls.map((tc) => (
                <tr key={tc.name}>
                  <td>{tc.name}</td>
                  <td>{tc.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
