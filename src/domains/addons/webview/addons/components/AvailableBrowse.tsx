import { useState } from 'react';
import type {
  CatalogPluginDescriptor,
  MarketplaceOriginDescriptor,
} from '../../../../../shared/types/addonsCatalogPayload';
import { AVAILABLE_SECTIONS } from '../hooks/useAddonsState';
import { PluginGrid } from './PluginGrid';
import { MarketplaceBar } from './MarketplaceBar';

interface AvailableBrowseProps {
  readonly sections: ReadonlyMap<string, readonly CatalogPluginDescriptor[]>;
  readonly origins: readonly MarketplaceOriginDescriptor[];
  readonly onInstall: (pluginId: string, locality: 'workspace' | 'user') => void;
  readonly onDelete: (pluginId: string) => void;
  readonly onToggleOrigin: (originId: string, enabled: boolean) => void;
  readonly onFetchOrigin: (originId: string) => void;
  readonly onAddOrigin: (label: string, kind: string, value: string) => void;
  readonly onEditOrigin: (originId: string, label: string, kind: string, value: string) => void;
  readonly onRemoveOrigin: (originId: string) => void;
  readonly disabled?: boolean;
}

export function AvailableBrowse({
  sections,
  origins,
  onInstall,
  onDelete,
  onToggleOrigin,
  onFetchOrigin,
  onAddOrigin,
  onEditOrigin,
  onRemoveOrigin,
  disabled,
}: AvailableBrowseProps) {
  const totalCount = [...sections.values()].reduce((sum, list) => sum + list.length, 0);

  return (
    <>
      <SourcesDisclosure
        origins={origins}
        onToggle={onToggleOrigin}
        onFetch={onFetchOrigin}
        onAdd={onAddOrigin}
        onEdit={onEditOrigin}
        onRemove={onRemoveOrigin}
      />

      {totalCount === 0 ? (
        <div className="akashi-addons-empty">
          <span className="codicon codicon-cloud" />
          <p>No plugins available.</p>
          <p className="akashi-addons-empty__hint">
            Fetch a marketplace to discover plugins, or add a new marketplace source.
          </p>
        </div>
      ) : (
        AVAILABLE_SECTIONS.map((section) => {
          const plugins = sections.get(section.key) ?? [];
          if (plugins.length === 0) return null;
          return (
            <div key={section.key}>
              <div className="akashi-addons-section-header">
                <span className={`codicon ${section.icon}`} />
                <span>{section.label}</span>
                <span className="akashi-addons-section-header__count">({plugins.length})</span>
              </div>
              <PluginGrid
                plugins={plugins}
                onInstall={onInstall}
                onDelete={onDelete}
                disabled={disabled}
              />
            </div>
          );
        })
      )}
    </>
  );
}

function SourcesDisclosure({
  origins,
  onToggle,
  onFetch,
  onAdd,
  onEdit,
  onRemove,
}: {
  readonly origins: readonly MarketplaceOriginDescriptor[];
  readonly onToggle: (originId: string, enabled: boolean) => void;
  readonly onFetch: (originId: string) => void;
  readonly onAdd: (label: string, kind: string, value: string) => void;
  readonly onEdit: (originId: string, label: string, kind: string, value: string) => void;
  readonly onRemove: (originId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="akashi-addons-sources-disclosure">
      <button
        className="akashi-addons-sources-toggle"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <span className={`codicon ${open ? 'codicon-chevron-down' : 'codicon-chevron-right'}`} />
        <span className="codicon codicon-gear" />
        Manage Sources
      </button>
      {open && (
        <MarketplaceBar
          origins={origins}
          onToggle={onToggle}
          onFetch={onFetch}
          onAdd={onAdd}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      )}
    </div>
  );
}
