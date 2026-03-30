import type { TotalStats } from '../../../domain/model';
import { formatTokenCount } from '../../../domain/format';

interface StatsBarProps {
  stats: TotalStats;
  onRefresh: () => void;
}

export function StatsBar({ stats, onRefresh }: StatsBarProps) {
  return (
    <div className="pulse-stats-bar">
      <div className="pulse-stat">
        <span className="pulse-stat__value">{stats.projects}</span>
        <span className="pulse-stat__label">Projects</span>
      </div>
      <div className="pulse-stat">
        <span className="pulse-stat__value">{stats.sessions}</span>
        <span className="pulse-stat__label">Sessions</span>
      </div>
      <div className="pulse-stat">
        <span className="pulse-stat__value">{formatTokenCount(stats.tokens)}</span>
        <span className="pulse-stat__label">Tokens</span>
      </div>
      <div className="pulse-stat">
        <span className="pulse-stat__value">{stats.messages}</span>
        <span className="pulse-stat__label">Messages</span>
      </div>
      <div className="pulse-stats-bar__actions">
        <button
          className="pulse-resume-btn"
          onClick={onRefresh}
          title="Refresh session data"
          aria-label="Refresh session data"
        >
          <span className="codicon codicon-refresh" aria-hidden />
        </button>
      </div>
    </div>
  );
}
