interface SearchBarProps {
  query: string;
  onChange: (value: string) => void;
}

export function SearchBar({ query, onChange }: SearchBarProps) {
  return (
    <div className="pulse-search">
      <span className="codicon codicon-search" aria-hidden />
      <input
        className="pulse-search__input"
        type="search"
        aria-label="Search sessions"
        placeholder="Search sessions by prompt, project, or model..."
        value={query}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
