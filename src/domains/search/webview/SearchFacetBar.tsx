import type { JSX } from 'react';
import type { SourceSearchQuery } from '../domain/model';

export interface SearchFacetBarProps {
  readonly query: SourceSearchQuery;
  readonly onQueryTextChange: (text: string) => void;
  readonly onToggleCategory: (id: string) => void;
  readonly onTogglePreset: (id: string) => void;
  readonly onToggleLocality: (id: string) => void;
  readonly onResetAll: () => void;
  readonly isActive: boolean;
  readonly matchCount: number;
  readonly totalRecords: number;
  readonly categoryIds: readonly string[];
  readonly presetIds: readonly string[];
  readonly localityIds: readonly string[];
  readonly labelForCategory?: (id: string) => string;
  readonly labelForPreset?: (id: string) => string;
  readonly labelForLocality?: (id: string) => string;
}

function defaultLabel(id: string): string {
  return id.charAt(0).toUpperCase() + id.slice(1);
}

function FacetRow(props: {
  ids: readonly string[];
  enabledSet: ReadonlySet<string> | null;
  onToggle: (id: string) => void;
  label: (id: string) => string;
  ariaLabel: string;
}): JSX.Element | null {
  if (props.ids.length === 0) {
    return null;
  }
  return (
    <div className="akashi-search-bar__facets" role="group" aria-label={props.ariaLabel}>
      {props.ids.map((id) => {
        const on = props.enabledSet === null || props.enabledSet.has(id);
        return (
          <button
            key={id}
            type="button"
            className={
              on
                ? 'akashi-search-bar__toggle akashi-search-bar__toggle--on'
                : 'akashi-search-bar__toggle'
            }
            aria-pressed={on}
            title={id}
            onClick={() => props.onToggle(id)}
          >
            {props.label(id)}
          </button>
        );
      })}
    </div>
  );
}

export function SearchFacetBar(props: SearchFacetBarProps): JSX.Element {
  const {
    query,
    onQueryTextChange,
    onToggleCategory,
    onTogglePreset,
    onToggleLocality,
    isActive,
    matchCount,
    totalRecords,
    categoryIds,
    presetIds,
    localityIds,
    labelForCategory = defaultLabel,
    labelForPreset = defaultLabel,
    labelForLocality = defaultLabel,
  } = props;

  return (
    <div className="akashi-search-bar" role="search" aria-label="Search sources">
      <div className="akashi-search-bar__input-row">
        <span className="akashi-search-bar__icon codicon codicon-search" aria-hidden="true" />
        <input
          type="text"
          className="akashi-search-bar__input"
          placeholder="Search sources…"
          aria-label="Search text"
          value={query.text}
          onChange={(e) => onQueryTextChange(e.target.value)}
        />
        {query.text !== '' ? (
          <button
            type="button"
            className="akashi-search-bar__clear codicon codicon-close"
            aria-label="Clear text"
            onClick={() => onQueryTextChange('')}
          />
        ) : null}
        {isActive ? (
          <span className="akashi-search-bar__count" aria-live="polite">
            {matchCount} / {totalRecords}
          </span>
        ) : null}
      </div>
      {presetIds.length > 0 || localityIds.length > 0 ? (
        <div
          className="akashi-search-bar__facet-combo"
          role="group"
          aria-label="Filter by preset and locality"
        >
          {presetIds.length > 0 ? (
            <FacetRow
              ids={presetIds}
              enabledSet={query.presets}
              onToggle={onTogglePreset}
              label={labelForPreset}
              ariaLabel="Filter by preset"
            />
          ) : null}
          {presetIds.length > 0 && localityIds.length > 0 ? (
            <div
              className="akashi-search-bar__facet-sep"
              role="separator"
              aria-orientation="vertical"
            />
          ) : null}
          {localityIds.length > 0 ? (
            <FacetRow
              ids={localityIds}
              enabledSet={query.localities}
              onToggle={onToggleLocality}
              label={labelForLocality}
              ariaLabel="Filter by locality"
            />
          ) : null}
        </div>
      ) : null}
      <FacetRow
        ids={categoryIds}
        enabledSet={query.categories}
        onToggle={onToggleCategory}
        label={labelForCategory}
        ariaLabel="Filter by category"
      />
    </div>
  );
}
