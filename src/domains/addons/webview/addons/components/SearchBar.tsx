import type { CategoryFilter } from '../hooks/useAddonsState';

interface SearchBarProps {
  readonly searchText: string;
  readonly onSearchChange: (text: string) => void;
  readonly categoryFilter: CategoryFilter;
  readonly onCategoryChange: (filter: CategoryFilter) => void;
  readonly categoryCounts: ReadonlyMap<string, number>;
  readonly totalCount: number;
  readonly showCategoryTabs?: boolean;
}

export function SearchBar({
  searchText,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  categoryCounts,
  totalCount,
  showCategoryTabs = true,
}: SearchBarProps) {
  const categories = [...categoryCounts.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="akashi-addons-search-bar">
      <div className="akashi-addons-search-input-wrap">
        <span className="codicon codicon-search akashi-addons-search-icon" />
        <input
          className="akashi-addons-search-input"
          type="text"
          placeholder="Filter addons..."
          value={searchText}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchText.length > 0 && (
          <button
            className="akashi-addons-search-clear"
            onClick={() => onSearchChange('')}
            title="Clear filter"
          >
            <span className="codicon codicon-close" />
          </button>
        )}
      </div>
      {showCategoryTabs && (
        <div className="akashi-addons-category-tabs">
          <button
            className={`akashi-addons-category-tab ${categoryFilter === null ? 'akashi-addons-category-tab--active' : ''}`}
            onClick={() => onCategoryChange(null)}
          >
            All ({totalCount})
          </button>
          {categories.map(([cat, count]) => (
            <button
              key={cat}
              className={`akashi-addons-category-tab ${categoryFilter === cat ? 'akashi-addons-category-tab--active' : ''}`}
              onClick={() => onCategoryChange(categoryFilter === cat ? null : cat)}
            >
              {cat} ({count})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
