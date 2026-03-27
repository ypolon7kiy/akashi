import { useState } from 'react';
import type { MarketplaceOriginDescriptor } from '../../../../../shared/types/addonsCatalogPayload';

interface MarketplaceBarProps {
  readonly origins: readonly MarketplaceOriginDescriptor[];
  readonly onToggle: (originId: string, enabled: boolean) => void;
  readonly onFetch: (originId: string) => void;
  readonly onAdd: (label: string, kind: string, value: string) => void;
  readonly onRemove: (originId: string) => void;
}

export function MarketplaceBar({
  origins,
  onToggle,
  onFetch,
  onAdd,
  onRemove,
}: MarketplaceBarProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [addLabel, setAddLabel] = useState('');
  const [addKind, setAddKind] = useState<'github' | 'url' | 'file'>('github');
  const [addValue, setAddValue] = useState('');

  const handleAdd = () => {
    if (addLabel.trim() && addValue.trim()) {
      onAdd(addLabel.trim(), addKind, addValue.trim());
      setAddLabel('');
      setAddValue('');
      setShowAdd(false);
    }
  };

  return (
    <div className="akashi-addons-origins">
      <div className="akashi-addons-origins__header">
        <span className="akashi-addons-origins__title">Marketplaces</span>
        <button
          className="akashi-addons-origins__add-btn"
          onClick={() => setShowAdd(!showAdd)}
          title="Add marketplace source"
        >
          <span className="codicon codicon-add" />
        </button>
      </div>

      {showAdd && (
        <div className="akashi-addons-origins__add-form">
          <input
            className="akashi-addons-origins__input"
            placeholder="Label (e.g. My Skills)"
            value={addLabel}
            onChange={(e) => setAddLabel(e.target.value)}
          />
          <div className="akashi-addons-origins__add-row">
            <select
              className="akashi-addons-origins__select"
              value={addKind}
              onChange={(e) => setAddKind(e.target.value as 'github' | 'url' | 'file')}
            >
              <option value="github">GitHub (owner/repo)</option>
              <option value="url">URL</option>
              <option value="file">Local file</option>
            </select>
            <input
              className="akashi-addons-origins__input akashi-addons-origins__input--flex"
              placeholder={
                addKind === 'github'
                  ? 'owner/repo'
                  : addKind === 'url'
                    ? 'https://...'
                    : '/path/to/marketplace.json'
              }
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
        {origins.map((origin) => (
          <div key={origin.id} className="akashi-addons-origin-item">
            <label className="akashi-addons-origin-item__toggle">
              <input
                type="checkbox"
                checked={origin.enabled}
                onChange={(e) => onToggle(origin.id, e.target.checked)}
              />
              <span className="akashi-addons-origin-item__label">{origin.label}</span>
            </label>
            <div className="akashi-addons-origin-item__actions">
              {origin.lastFetchedAt && (
                <span className="akashi-addons-origin-item__fetched" title={`Last fetched: ${origin.lastFetchedAt}`}>
                  <span className="codicon codicon-check" />
                </span>
              )}
              <button
                className="akashi-addons-origin-item__btn"
                onClick={() => onFetch(origin.id)}
                title="Refresh catalog"
                disabled={!origin.enabled}
              >
                <span className="codicon codicon-sync" />
              </button>
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
        ))}
      </div>
    </div>
  );
}
