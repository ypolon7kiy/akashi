interface SearchBarProps {
  readonly searchText: string;
  readonly onSearchChange: (text: string) => void;
}

export function SearchBar({ searchText, onSearchChange }: SearchBarProps) {
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
    </div>
  );
}
