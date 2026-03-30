import type { JSX, RefObject } from 'react';
import { useEffect, useRef } from 'react';
import type { SourceSearchQuery } from '../domain/model';

export interface FilterDropdownProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly anchorRef: RefObject<HTMLDivElement | null>;
  readonly query: SourceSearchQuery;
  readonly onToggleCategory: (id: string) => void;
  readonly onTogglePreset: (id: string) => void;
  readonly onToggleLocality: (id: string) => void;
  readonly onResetAll: () => void;
  readonly categoryIds: readonly string[];
  readonly presetIds: readonly string[];
  readonly localityIds: readonly string[];
  readonly labelForCategory?: (id: string) => string;
  readonly labelForPreset?: (id: string) => string;
  readonly labelForLocality?: (id: string) => string;
  readonly categoryItemClassName?: (id: string) => string;
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
  itemClassName?: (id: string) => string;
}): JSX.Element | null {
  if (props.ids.length === 0) {
    return null;
  }
  return (
    <div className="akashi-search-bar__facets" role="group" aria-label={props.ariaLabel}>
      {props.ids.map((id) => {
        const on = props.enabledSet === null || props.enabledSet.has(id);
        const extra = props.itemClassName?.(id) ?? '';
        return (
          <button
            key={id}
            type="button"
            className={
              (on
                ? 'akashi-search-bar__toggle akashi-search-bar__toggle--on'
                : 'akashi-search-bar__toggle') + (extra ? ` ${extra}` : '')
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

export function FilterDropdown(props: FilterDropdownProps): JSX.Element | null {
  const {
    isOpen,
    onClose,
    anchorRef,
    query,
    onToggleCategory,
    onTogglePreset,
    onToggleLocality,
    onResetAll,
    categoryIds,
    presetIds,
    localityIds,
    labelForCategory = defaultLabel,
    labelForPreset = defaultLabel,
    labelForLocality = defaultLabel,
    categoryItemClassName,
  } = props;

  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside.
  useEffect(() => {
    if (!isOpen) return;
    const onMouseDown = (e: MouseEvent): void => {
      const panel = panelRef.current;
      const anchor = anchorRef.current;
      if (panel && !panel.contains(e.target as Node) && !anchor?.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen, onClose, anchorRef]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasActiveFilters =
    query.categories !== null || query.presets !== null || query.localities !== null;

  return (
    <div
      ref={panelRef}
      className="akashi-filter-dropdown"
      role="dialog"
      aria-label="Filter sources"
    >
      {presetIds.length > 0 ? (
        <div className="akashi-filter-dropdown__section">
          <div className="akashi-filter-dropdown__heading">Presets</div>
          <FacetRow
            ids={presetIds}
            enabledSet={query.presets}
            onToggle={onTogglePreset}
            label={labelForPreset}
            ariaLabel="Filter by preset"
          />
        </div>
      ) : null}
      {localityIds.length > 0 ? (
        <div className="akashi-filter-dropdown__section">
          <div className="akashi-filter-dropdown__heading">Scope</div>
          <FacetRow
            ids={localityIds}
            enabledSet={query.localities}
            onToggle={onToggleLocality}
            label={labelForLocality}
            ariaLabel="Filter by locality"
          />
        </div>
      ) : null}
      {categoryIds.length > 0 ? (
        <div className="akashi-filter-dropdown__section">
          <div className="akashi-filter-dropdown__heading">Categories</div>
          <FacetRow
            ids={categoryIds}
            enabledSet={query.categories}
            onToggle={onToggleCategory}
            label={labelForCategory}
            ariaLabel="Filter by category"
            itemClassName={categoryItemClassName}
          />
        </div>
      ) : null}
      {hasActiveFilters ? (
        <div className="akashi-filter-dropdown__footer">
          <button
            type="button"
            className="akashi-filter-dropdown__reset"
            onClick={() => {
              onResetAll();
            }}
          >
            Reset filters
          </button>
        </div>
      ) : null}
    </div>
  );
}
