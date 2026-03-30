import type { InstalledItem } from '../hooks/useAddonsState';
import { StatusBadge } from './StatusBadge';

interface PluginCardProps {
  readonly addon: InstalledItem;
  readonly onOpen: (path: string) => void;
  readonly onDelete?: (primaryPath: string, pluginId?: string) => void;
  readonly onMoveToGlobal?: (addonId: string) => void;
  readonly disabled?: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  skill: 'codicon-lightbulb',
  command: 'codicon-terminal',
  rule: 'codicon-law',
  hook: 'codicon-zap',
  mcp: 'codicon-plug',
  context: 'codicon-book',
  config: 'codicon-gear',
  plugin: 'codicon-extensions',
};

export function PluginCard({ addon, onOpen, onDelete, onMoveToGlobal, disabled }: PluginCardProps) {
  const iconClass = CATEGORY_ICONS[addon.category] ?? 'codicon-file';
  const canMoveToGlobal =
    (addon.locality === 'workspace' || addon.locality === 'local') &&
    !addon.cliManaged &&
    onMoveToGlobal;

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
          {addon.description && <div className="akashi-addons-card__desc">{addon.description}</div>}
          <div className="akashi-addons-card__meta">
            <span className="akashi-addons-card__category">{addon.category}</span>
            {addon.version && <span className="akashi-addons-card__version">v{addon.version}</span>}
            {addon.marketplace && (
              <span className="akashi-addons-card__marketplace">{addon.marketplace}</span>
            )}
            {!addon.cliManaged && (
              <span className="akashi-addons-card__path">
                {shortenPath(addon.primaryPath, addon.shape)}
              </span>
            )}
          </div>
        </div>
      </button>
      <div className="akashi-addons-card__actions">
        {canMoveToGlobal && (
          <button
            className="akashi-addons-card__action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onMoveToGlobal(addon.id);
            }}
            title="Move to global (~/.claude/skills/)"
            disabled={disabled}
          >
            <span className="codicon codicon-globe" />
          </button>
        )}
        {onDelete && (
          <button
            className="akashi-addons-card__action-btn akashi-addons-card__action-btn--danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(addon.primaryPath, addon.pluginId);
            }}
            title="Delete"
            disabled={disabled}
          >
            <span className="codicon codicon-trash" />
          </button>
        )}
      </div>
    </div>
  );
}

function shortenPath(path: string, shape?: string): string {
  const norm = path.replace(/\\/g, '/');
  const parts = norm.split('/');
  if (shape === 'folder-file') {
    // Show folder name (parent of SKILL.md), matching graph behavior
    return parts.length >= 2 ? parts[parts.length - 2] : parts[parts.length - 1];
  }
  return parts[parts.length - 1];
}
