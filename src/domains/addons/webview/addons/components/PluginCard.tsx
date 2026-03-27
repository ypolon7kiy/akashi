import type { InstalledItem } from '../hooks/useAddonsState';
import { StatusBadge } from './StatusBadge';

interface PluginCardProps {
  readonly addon: InstalledItem;
  readonly onOpen: (path: string) => void;
  readonly onDelete?: (primaryPath: string) => void;
  readonly onMoveToGlobal?: (addonId: string) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  skill: 'codicon-lightbulb',
  command: 'codicon-terminal',
  rule: 'codicon-law',
  hook: 'codicon-zap',
  mcp: 'codicon-plug',
  context: 'codicon-book',
  config: 'codicon-gear',
};

export function PluginCard({ addon, onOpen, onDelete, onMoveToGlobal }: PluginCardProps) {
  const iconClass = CATEGORY_ICONS[addon.category] ?? 'codicon-file';
  const canMoveToGlobal = addon.locality === 'workspace' && onMoveToGlobal;

  return (
    <div className="akashi-addons-card">
      <button
        className="akashi-addons-card__main"
        onClick={() => onOpen(addon.primaryPath)}
        title={`Open ${addon.primaryPath}`}
      >
        <div className="akashi-addons-card__icon">
          <span className={`codicon ${iconClass}`} />
        </div>
        <div className="akashi-addons-card__body">
          <div className="akashi-addons-card__header">
            <span className="akashi-addons-card__name">{addon.name}</span>
            <StatusBadge locality={addon.locality} />
          </div>
          <div className="akashi-addons-card__meta">
            <span className="akashi-addons-card__category">{addon.category}</span>
            <span className="akashi-addons-card__path">{shortenPath(addon.primaryPath)}</span>
          </div>
        </div>
      </button>
      <div className="akashi-addons-card__actions">
        {canMoveToGlobal && (
          <button
            className="akashi-addons-card__action-btn"
            onClick={(e) => { e.stopPropagation(); onMoveToGlobal(addon.id); }}
            title="Move to global (~/.claude/skills/)"
          >
            <span className="codicon codicon-globe" />
          </button>
        )}
        {onDelete && (
          <button
            className="akashi-addons-card__action-btn akashi-addons-card__action-btn--danger"
            onClick={(e) => { e.stopPropagation(); onDelete(addon.primaryPath); }}
            title="Delete"
          >
            <span className="codicon codicon-trash" />
          </button>
        )}
      </div>
    </div>
  );
}

function shortenPath(path: string): string {
  const norm = path.replace(/\\/g, '/');
  const parts = norm.split('/');
  if (parts.length <= 3) return norm;
  return '.../' + parts.slice(-3).join('/');
}
