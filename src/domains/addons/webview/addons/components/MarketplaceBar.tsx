import { useCallback, useEffect, useState } from 'react';
import type { MarketplaceOriginDescriptor } from '../../../../../shared/types/addonsCatalogPayload';

type SourceKind = 'github' | 'url' | 'file';

interface MarketplaceBarProps {
  readonly origins: readonly MarketplaceOriginDescriptor[];
  readonly onToggle: (originId: string, enabled: boolean) => void;
  readonly onFetch: (originId: string) => void;
  readonly onAdd: (kind: string, value: string) => void;
  readonly onEdit: (originId: string, kind: string, value: string) => void;
  readonly onRemove: (originId: string) => void;
}

function formatSourceMeta(origin: MarketplaceOriginDescriptor): string {
  const { kind, value } = origin.source;
  if (!value) return '';
  if (kind === 'github') return ` (${value})`;
  if (kind === 'url') return ` (url)`;
  return ` (${kind})`;
}

function kindPlaceholder(kind: SourceKind): string {
  return kind === 'github'
    ? 'owner/repo'
    : kind === 'url'
      ? 'https://...'
      : '/path/to/marketplace.json';
}

export function MarketplaceBar({
  origins,
  onToggle,
  onFetch,
  onAdd,
  onEdit,
  onRemove,
}: MarketplaceBarProps) {
  // ── Add form state ──
  const [showAdd, setShowAdd] = useState(false);
  const [addKind, setAddKind] = useState<SourceKind>('github');
  const [addValue, setAddValue] = useState('');

  // ── Edit form state ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKind, setEditKind] = useState<SourceKind>('github');
  const [editValue, setEditValue] = useState('');

  // Optimistic toggle state — avoids snap-back during host round-trip
  const [localToggles, setLocalToggles] = useState<Record<string, boolean>>({});

  // Sync local toggles and close edit form when catalog updates arrive from host
  useEffect(() => {
    setLocalToggles({});
    setEditingId(null);
  }, [origins]);

  const handleToggle = useCallback(
    (originId: string, enabled: boolean) => {
      setLocalToggles((prev) => ({ ...prev, [originId]: enabled }));
      onToggle(originId, enabled);
    },
    [onToggle]
  );

  const handleAdd = () => {
    if (addValue.trim()) {
      onAdd(addKind, addValue.trim());
      setAddValue('');
      setShowAdd(false);
    }
  };

  const startEdit = (origin: MarketplaceOriginDescriptor) => {
    setEditingId(origin.id);
    setEditKind(origin.source.kind);
    setEditValue(origin.source.value);
    setShowAdd(false); // mutual exclusivity
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleEditSave = () => {
    if (editingId && editValue.trim()) {
      onEdit(editingId, editKind, editValue.trim());
      setEditingId(null);
    }
  };

  const openAddForm = () => {
    setShowAdd(!showAdd);
    setEditingId(null); // mutual exclusivity
  };

  return (
    <div className="akashi-addons-origins">
      <div className="akashi-addons-origins__header">
        <span className="akashi-addons-origins__title">Marketplaces</span>
        <button
          className="akashi-addons-origins__add-btn"
          onClick={openAddForm}
          title="Add marketplace source"
        >
          <span className="codicon codicon-add" />
        </button>
      </div>

      {showAdd && (
        <div className="akashi-addons-origins__add-form">
          <div className="akashi-addons-origins__add-row">
            <select
              className="akashi-addons-origins__select"
              aria-label="Source kind"
              value={addKind}
              onChange={(e) => setAddKind(e.target.value as SourceKind)}
            >
              <option value="github">GitHub (owner/repo)</option>
              <option value="url">URL</option>
              <option value="file">Local file</option>
            </select>
            <input
              className="akashi-addons-origins__input akashi-addons-origins__input--flex"
              aria-label="Source value"
              placeholder={kindPlaceholder(addKind)}
              value={addValue}
              onChange={(e) => setAddValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button className="akashi-addons-origins__action-btn" onClick={handleAdd}>
              Add
            </button>
          </div>
        </div>
      )}

      <div className="akashi-addons-origins__list">
        {origins.map((origin) => {
          const isEnabled = localToggles[origin.id] ?? origin.enabled;
          const isEditing = editingId === origin.id;
          return (
            <div key={origin.id}>
              <div className="akashi-addons-origin-item">
                <label className="akashi-addons-origin-item__toggle">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => handleToggle(origin.id, e.target.checked)}
                  />
                  <span className="akashi-addons-origin-item__label">
                    {origin.label}
                    <span className="akashi-addons-origin-item__meta">
                      {formatSourceMeta(origin)}
                    </span>
                  </span>
                </label>
                <div className="akashi-addons-origin-item__actions">
                  {origin.lastFetchedAt && (
                    <span
                      className="akashi-addons-origin-item__fetched"
                      title={`Last fetched: ${origin.lastFetchedAt}`}
                    >
                      <span className="codicon codicon-check" />
                    </span>
                  )}
                  <button
                    className="akashi-addons-origin-item__btn"
                    onClick={() => onFetch(origin.id)}
                    title="Refresh catalog"
                    disabled={!isEnabled}
                  >
                    <span className="codicon codicon-sync" />
                  </button>
                  {!origin.builtIn && !origin.cliManaged && (
                    <button
                      className="akashi-addons-origin-item__btn"
                      onClick={() => (isEditing ? cancelEdit() : startEdit(origin))}
                      title="Edit connection details"
                    >
                      <span className={`codicon ${isEditing ? 'codicon-close' : 'codicon-edit'}`} />
                    </button>
                  )}
                  {!origin.builtIn && (
                    <button
                      className="akashi-addons-origin-item__btn akashi-addons-origin-item__btn--danger"
                      onClick={() => onRemove(origin.id)}
                      title="Remove marketplace"
                    >
                      <span className="codicon codicon-trash" />
                    </button>
                  )}
                </div>
              </div>
              {isEditing && (
                <div className="akashi-addons-origins__add-form">
                  <div className="akashi-addons-origins__add-row">
                    <select
                      className="akashi-addons-origins__select"
                      aria-label="Source kind"
                      value={editKind}
                      onChange={(e) => setEditKind(e.target.value as SourceKind)}
                    >
                      <option value="github">GitHub (owner/repo)</option>
                      <option value="url">URL</option>
                      <option value="file">Local file</option>
                    </select>
                    <input
                      className="akashi-addons-origins__input akashi-addons-origins__input--flex"
                      aria-label="Source value"
                      placeholder={kindPlaceholder(editKind)}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditSave();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                    />
                    <button className="akashi-addons-origins__action-btn" onClick={handleEditSave}>
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
