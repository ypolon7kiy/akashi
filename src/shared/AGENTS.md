The `shared` folder is reserved for **cross-cutting utilities and types** reused across multiple domains.

**Today this folder has no TypeScript modules** (only this `AGENTS.md`). Contracts that are specific to the sidebar ↔ host bridge live under `src/sidebar/bridge/`; domain ports stay inside each domain. When two or more domains need the same interface or DTO, add it here.

- Use `shared` for truly generic code (e.g. functional helpers, result types, logging abstractions).
- Keep shared pieces small and intentional to avoid turning this into a “misc” dump.
- Domains should depend on `shared` sparingly and mostly through well-defined abstractions.

### Suggested layout (when you add the first files)

- **types/** – Reusable TypeScript types, DTOs, value objects shared across domains. Domain-specific types stay in `domains/<name>/domain`.
- **utils/** – Generic pure helpers (guards, mappers); no VS Code or domain-specific logic.
- **vscode/** – Thin wrappers/abstractions over VS Code APIs (messaging, config, storage). Domain/application depend on these instead of importing `vscode` directly.
