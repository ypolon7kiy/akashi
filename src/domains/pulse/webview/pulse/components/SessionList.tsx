import { useCallback, useState } from 'react';
import type { SessionSummary } from '../../../domain/model';
import { formatTokenCount, formatTimeAgo } from '../../../domain/format';
import { sessionTotalTokens } from '../../../domain/scanner';

interface SessionListProps {
  sessions: readonly SessionSummary[];
  onSelect: (session: SessionSummary) => void;
  onResume?: (sessionId: string, cwd: string) => void;
  onDelete?: (sessionIds: readonly string[]) => void;
}

export function SessionList({ sessions, onSelect, onResume, onDelete }: SessionListProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSelection = useCallback(
    (sessionId: string, event: React.MouseEvent) => {
      event.stopPropagation();
      setSelected((prev) => {
        const next = new Set(prev);

        if (event.shiftKey && prev.size > 0) {
          // Shift+click: range select
          const ids = sessions.map((s) => s.id);
          const lastSelected = [...prev].pop()!;
          const lastIdx = ids.indexOf(lastSelected);
          const curIdx = ids.indexOf(sessionId);
          const [from, to] = lastIdx < curIdx ? [lastIdx, curIdx] : [curIdx, lastIdx];
          for (let i = from; i <= to; i++) {
            next.add(ids[i]);
          }
        } else if (event.ctrlKey || event.metaKey) {
          // Ctrl/Cmd+click: toggle individual
          if (next.has(sessionId)) {
            next.delete(sessionId);
          } else {
            next.add(sessionId);
          }
        } else {
          // Plain click on checkbox: toggle individual
          if (next.has(sessionId)) {
            next.delete(sessionId);
          } else {
            next.add(sessionId);
          }
        }

        return next;
      });
    },
    [sessions]
  );

  const selectAll = useCallback(() => {
    setSelected(new Set(sessions.map((s) => s.id)));
  }, [sessions]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const handleDelete = useCallback(() => {
    if (selected.size === 0 || !onDelete) return;
    onDelete([...selected]);
    setSelected(new Set());
  }, [selected, onDelete]);

  if (sessions.length === 0) {
    return (
      <div className="pulse-empty">
        <p>No sessions match your search.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Selection toolbar */}
      {selected.size > 0 && (
        <div className="pulse-selection-bar">
          <span className="pulse-selection-bar__count">{selected.size} selected</span>
          <button className="pulse-selection-bar__btn" onClick={selectAll}>
            Select all
          </button>
          <button className="pulse-selection-bar__btn" onClick={clearSelection}>
            Clear
          </button>
          {onDelete && (
            <button
              className="pulse-selection-bar__btn pulse-selection-bar__btn--danger"
              onClick={handleDelete}
              aria-label={`Delete ${selected.size} sessions`}
            >
              <span className="codicon codicon-trash" aria-hidden />
              Delete
            </button>
          )}
        </div>
      )}

      <div className="pulse-session-list">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`pulse-session-row${selected.has(session.id) ? ' pulse-session-row--selected' : ''}`}
            onClick={() => onSelect(session)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onSelect(session);
            }}
          >
            {/* Checkbox */}
            <input
              type="checkbox"
              className="pulse-session-row__checkbox"
              checked={selected.has(session.id)}
              onClick={(e) => toggleSelection(session.id, e as unknown as React.MouseEvent)}
              onChange={() => {
                // handled by onClick
              }}
              aria-label={`Select session: ${session.firstUserPrompt || session.id}`}
            />

            <div className="pulse-session-row__info">
              <div className="pulse-session-row__prompt">
                {session.firstUserPrompt || '(no prompt)'}
              </div>
              <div className="pulse-session-row__meta">
                {session.projectName} · {session.model} · {session.userMessageCount} msgs
                {session.gitBranch ? ` · ${session.gitBranch}` : ''}
              </div>
            </div>
            <span className="pulse-session-row__tokens">
              {formatTokenCount(sessionTotalTokens(session))}
            </span>
            <span className="pulse-session-row__time">{formatTimeAgo(session.startTime)}</span>

            {/* Quick actions */}
            <div className="pulse-session-row__actions">
              {onResume && (
                <button
                  className="pulse-session-row__action-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResume(session.id, session.workspacePath);
                  }}
                  title="Resume session"
                  aria-label="Resume session"
                >
                  <span className="codicon codicon-play" aria-hidden />
                </button>
              )}
              {onDelete && (
                <button
                  className="pulse-session-row__action-btn pulse-session-row__action-btn--danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete([session.id]);
                  }}
                  title="Delete session"
                  aria-label="Delete session"
                >
                  <span className="codicon codicon-trash" aria-hidden />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
