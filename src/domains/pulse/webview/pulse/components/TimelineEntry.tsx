import type { TimelineBlock } from '../../../domain/model';

interface TimelineEntryProps {
  block: TimelineBlock;
  expanded: boolean;
  onToggle: () => void;
}

export function TimelineEntry({ block, expanded, onToggle }: TimelineEntryProps) {
  switch (block.type) {
    case 'user-prompt':
      return (
        <div className="pulse-tl-entry pulse-tl-entry--user">
          <div className="pulse-tl-entry__header">
            <span className="codicon codicon-account" aria-hidden />
            <span className="pulse-tl-entry__label">User</span>
            <span className="pulse-tl-entry__time">{formatTime(block.timestamp)}</span>
          </div>
          <div className="pulse-tl-entry__body">{block.text}</div>
        </div>
      );

    case 'text':
      return (
        <div className="pulse-tl-entry pulse-tl-entry--assistant">
          <div className="pulse-tl-entry__header">
            <span className="codicon codicon-hubot" aria-hidden />
            <span className="pulse-tl-entry__label">Assistant</span>
            <span className="pulse-tl-entry__time">{formatTime(block.timestamp)}</span>
          </div>
          <div className="pulse-tl-entry__body">{block.text}</div>
        </div>
      );

    case 'thinking':
      return (
        <div className="pulse-tl-entry pulse-tl-entry--thinking">
          <button className="pulse-tl-entry__header pulse-tl-entry__toggle" onClick={onToggle}>
            <span className="codicon codicon-lightbulb" aria-hidden />
            <span className="pulse-tl-entry__label">Thinking</span>
            <span className="pulse-tl-entry__time">{formatTime(block.timestamp)}</span>
            <span
              className={`codicon codicon-chevron-right pulse-tl-entry__chevron${expanded ? ' pulse-tl-entry__chevron--open' : ''}`}
              aria-hidden
            />
          </button>
          {expanded && (
            <div className="pulse-tl-entry__body pulse-tl-entry__body--dim">
              {block.thinkingText}
            </div>
          )}
        </div>
      );

    case 'tool-use':
      return (
        <div className="pulse-tl-entry pulse-tl-entry--tool-use">
          <button className="pulse-tl-entry__header pulse-tl-entry__toggle" onClick={onToggle}>
            <span className="codicon codicon-tools" aria-hidden />
            <span className="pulse-tl-entry__label">{block.toolName}</span>
            <span className="pulse-tl-entry__time">{formatTime(block.timestamp)}</span>
            <span
              className={`codicon codicon-chevron-right pulse-tl-entry__chevron${expanded ? ' pulse-tl-entry__chevron--open' : ''}`}
              aria-hidden
            />
          </button>
          {expanded && block.toolInput && (
            <pre className="pulse-tl-entry__pre">{JSON.stringify(block.toolInput, null, 2)}</pre>
          )}
        </div>
      );

    case 'tool-result':
      return (
        <div
          className={`pulse-tl-entry pulse-tl-entry--tool-result${block.toolResultIsError ? ' pulse-tl-entry--error' : ''}`}
        >
          <button className="pulse-tl-entry__header pulse-tl-entry__toggle" onClick={onToggle}>
            <span
              className={`codicon ${block.toolResultIsError ? 'codicon-error' : 'codicon-check'}`}
              aria-hidden
            />
            <span className="pulse-tl-entry__label">
              Result{block.toolResultIsError ? ' (error)' : ''}
            </span>
            <span className="pulse-tl-entry__time">{formatTime(block.timestamp)}</span>
            <span
              className={`codicon codicon-chevron-right pulse-tl-entry__chevron${expanded ? ' pulse-tl-entry__chevron--open' : ''}`}
              aria-hidden
            />
          </button>
          {expanded && <pre className="pulse-tl-entry__pre">{block.toolResultContent}</pre>}
        </div>
      );

    case 'subagent':
      return (
        <div className="pulse-tl-entry pulse-tl-entry--subagent">
          <div className="pulse-tl-entry__header">
            <span className="codicon codicon-type-hierarchy" aria-hidden />
            <span className="pulse-tl-entry__label">
              Subagent: {block.subagentType ?? 'general-purpose'}
            </span>
            <span className="pulse-tl-entry__time">{formatTime(block.timestamp)}</span>
          </div>
          {block.subagentPrompt && (
            <div className="pulse-tl-entry__body pulse-tl-entry__body--dim">
              {block.subagentPrompt}
            </div>
          )}
        </div>
      );

    case 'system':
      return (
        <div className="pulse-tl-entry pulse-tl-entry--system">
          <div className="pulse-tl-entry__header">
            <span className="codicon codicon-info" aria-hidden />
            <span className="pulse-tl-entry__label">
              System{block.systemSubtype ? `: ${block.systemSubtype}` : ''}
            </span>
          </div>
          {block.text && (
            <div className="pulse-tl-entry__body pulse-tl-entry__body--dim">{block.text}</div>
          )}
        </div>
      );

    default:
      return null;
  }
}

function formatTime(timestamp: string): string {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
