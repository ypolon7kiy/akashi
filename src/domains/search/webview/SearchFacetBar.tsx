import type { JSX } from 'react';
import { useRef, useState } from 'react';
import type { SourceSearchQuery } from '../domain/model';
import { FilterDropdown } from './FilterDropdown';

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
  readonly categoryItemClassName?: (id: string) => string;
}

export function SearchFacetBar(props: SearchFacetBarProps): JSX.Element {
  const {
    query,
    onQueryTextChange,
    onToggleCategory,
    onTogglePreset,
    onToggleLocality,
    onResetAll,
    isActive,
    matchCount,
    totalRecords,
    categoryIds,
    presetIds,
    localityIds,
    labelForCategory,
    labelForPreset,
    labelForLocality,
    categoryItemClassName,
  } = props;

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRowRef = useRef<HTMLDivElement>(null);

  const hasFilters = categoryIds.length > 0 || presetIds.length > 0 || localityIds.length > 0;
  const hasActiveFilters =
    query.categories !== null || query.presets !== null || query.localities !== null;

  return (
    <div className="akashi-search-bar" role="search" aria-label="Search sources">
      <div className="akashi-search-bar__input-row" ref={inputRowRef}>
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
        {hasFilters ? (
          <button
            type="button"
            className={`akashi-search-bar__filter-toggle${hasActiveFilters ? ' akashi-search-bar__filter-toggle--active' : ''}`}
            aria-label={dropdownOpen ? 'Close filters' : 'Open filters'}
            aria-expanded={dropdownOpen}
            aria-haspopup="dialog"
            onClick={() => setDropdownOpen((prev) => !prev)}
          >
            <span
              className={`codicon ${hasActiveFilters ? 'codicon-filter-filled' : 'codicon-filter'}`}
              aria-hidden="true"
            />
          </button>
        ) : null}
      </div>
      <FilterDropdown
        isOpen={dropdownOpen}
        onClose={() => setDropdownOpen(false)}
        anchorRef={inputRowRef}
        query={query}
        onToggleCategory={onToggleCategory}
        onTogglePreset={onTogglePreset}
        onToggleLocality={onToggleLocality}
        onResetAll={onResetAll}
        categoryIds={categoryIds}
        presetIds={presetIds}
        localityIds={localityIds}
        labelForCategory={labelForCategory}
        labelForPreset={labelForPreset}
        labelForLocality={labelForLocality}
        categoryItemClassName={categoryItemClassName}
      />
    </div>
  );
}
