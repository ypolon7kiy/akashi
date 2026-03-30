import type { CatalogPluginDescriptor } from '../../../../../shared/types/addonsCatalogPayload';
import type { AddonLocality } from '../hooks/useAddonsState';

interface PluginGridProps {
  readonly plugins: readonly CatalogPluginDescriptor[];
  readonly onInstall: (pluginId: string, locality: AddonLocality) => void;
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
  plugin: 'codicon-extensions',
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
              {plugin.installCount != null && plugin.installCount > 0 && (
                <span className="akashi-addons-grid-card__installs" title="Install count">
                  {formatInstallCount(plugin.installCount)} installs
                </span>
              )}
              {plugin.tags.length > 0 && (
                <span className="akashi-addons-grid-card__tags">
                  {plugin.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="akashi-addons-grid-card__tag">
                      {tag}
                    </span>
                  ))}
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
                  title="Install to project (.claude/settings.json — shared with team)"
                  disabled={disabled}
                >
                  <span className="codicon codicon-folder" /> Project
                </button>
                <button
                  className="akashi-addons-grid-card__btn akashi-addons-grid-card__btn--install-alt"
                  onClick={() => onInstall(plugin.id, 'local')}
                  title="Install locally (.claude/settings.local.json — just you, this project)"
                  disabled={disabled}
                >
                  <span className="codicon codicon-person" /> Local
                </button>
                <button
                  className="akashi-addons-grid-card__btn akashi-addons-grid-card__btn--install-alt"
                  onClick={() => onInstall(plugin.id, 'user')}
                  title="Install globally (~/.claude/settings.json — all projects)"
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

function formatInstallCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return String(count);
}
