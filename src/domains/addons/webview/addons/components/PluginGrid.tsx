import type { CatalogPluginDescriptor } from '../../../../../shared/types/addonsCatalogPayload';

interface PluginGridProps {
  readonly plugins: readonly CatalogPluginDescriptor[];
  readonly onInstall: (pluginId: string, locality: 'workspace' | 'user') => void;
  readonly onDelete: (pluginId: string) => void;
  readonly disabled?: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  skill: 'codicon-lightbulb',
  command: 'codicon-terminal',
  hook: 'codicon-zap',
  mcp: 'codicon-plug',
  agent: 'codicon-hubot',
  bundle: 'codicon-package',
};

export function PluginGrid({ plugins, onInstall, onDelete, disabled }: PluginGridProps) {
  if (plugins.length === 0) {
    return (
      <div className="akashi-addons-empty">
        <span className="codicon codicon-cloud" />
        <p>No plugins available.</p>
        <p className="akashi-addons-empty__hint">
          Fetch a marketplace to discover plugins, or add a new marketplace source.
        </p>
      </div>
    );
  }

  return (
    <div className="akashi-addons-grid">
      {plugins.map((plugin) => (
        <div key={plugin.id} className="akashi-addons-grid-card">
          <div className="akashi-addons-grid-card__icon">
            <span className={`codicon ${CATEGORY_ICONS[plugin.category] ?? 'codicon-file'}`} />
          </div>
          <div className="akashi-addons-grid-card__body">
            <div className="akashi-addons-grid-card__name">{plugin.name}</div>
            {plugin.description && (
              <div className="akashi-addons-grid-card__desc">{plugin.description}</div>
            )}
            <div className="akashi-addons-grid-card__meta">
              <span className="akashi-addons-grid-card__category">{plugin.category}</span>
              {plugin.version && (
                <span className="akashi-addons-grid-card__version">v{plugin.version}</span>
              )}
              {plugin.tags.length > 0 && (
                <span className="akashi-addons-grid-card__tags">
                  {plugin.tags.slice(0, 3).join(', ')}
                </span>
              )}
            </div>
          </div>
          <div className="akashi-addons-grid-card__action">
            {plugin.installStatus === 'installed' ? (
              <button
                className="akashi-addons-grid-card__btn akashi-addons-grid-card__btn--uninstall"
                onClick={() => onDelete(plugin.id)}
                title="Uninstall"
                disabled={disabled}
              >
                <span className="codicon codicon-trash" />
              </button>
            ) : (
              <div className="akashi-addons-grid-card__install-group">
                <button
                  className="akashi-addons-grid-card__btn akashi-addons-grid-card__btn--install"
                  onClick={() => onInstall(plugin.id, 'workspace')}
                  title="Install to project (.claude/skills/)"
                  disabled={disabled}
                >
                  <span className="codicon codicon-folder" /> Project
                </button>
                <button
                  className="akashi-addons-grid-card__btn akashi-addons-grid-card__btn--install-alt"
                  onClick={() => onInstall(plugin.id, 'user')}
                  title="Install globally (~/.claude/skills/)"
                  disabled={disabled}
                >
                  <span className="codicon codicon-home" /> Global
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
