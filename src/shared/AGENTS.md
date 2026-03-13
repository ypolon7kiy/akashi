The `shared` folder contains **cross-cutting utilities and types** that are reused across multiple domains.

- Use this for truly generic code (e.g., functional helpers, result types, logging abstractions).
- Keep shared pieces small and intentional to avoid turning this into a “misc” dump.
- Domains should depend on `shared` sparingly and mostly through well-defined abstractions.

### Subfolders

- **types/** – Reusable TypeScript types, DTOs, value objects shared across domains. Domain-specific types stay in `domains/<name>/domain`.
- **utils/** – Generic pure helpers (guards, mappers); no VS Code or domain-specific logic.
- **vscode/** – Thin wrappers/abstractions over VS Code APIs (messaging, config, storage). Domain/application depend on these instead of importing `vscode` directly.

