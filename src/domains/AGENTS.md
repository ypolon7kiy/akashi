This folder is the **root for all domains** in the extension.

- Each subfolder under `domains/` represents a **single domain or feature area** (e.g. `example`, `notes`, `projects`).
- Within each domain, code is split into core layers `domain/`, `application/`, and `infrastructure/`. Domains can add `ui/` when they register commands/views/webview host code. A domain that shows a webview panel can add a **`webview/`** folder for the browser-side UI (React, Vue, or vanilla JS); that folder is bundled separately and loaded by the panel.

Create new domains by copying the `example/` structure and adapting it to your use case.

---

## Layer responsibilities

- **domain/** – Core business logic: entities, value objects, domain services, events. Pure TypeScript, no `vscode` imports. Other layers depend on it.
- **application/** – Use cases; orchestrates domain; no VS Code APIs. UI and infrastructure call here.
- **infrastructure/** – Adapters to VS Code and external services; implements domain/application interfaces. No business rules.
- **ui/** (optional) – Registers commands, views, webviews; translates user actions into application-layer calls. No business rules.
- **webview/** – Browser-side UI for a panel (React/Vue/vanilla); bundled separately; loads in the panel. Messaging to host via `src/webview-shared/api.ts`.

---

## How domains should communicate

Domains **must not import from each other**. That keeps each domain a self-contained slice and avoids tangled dependencies. They can still collaborate in two ways:

### 1. Shared contracts in `src/shared/`

Put **interfaces, types, or event shapes** in `shared/` when two or more domains need to agree on a contract. Both domains depend on the shared definition, not on each other.

- **Example:** Domain A emits events; Domain B reacts. Define the event type in `shared/types/` (e.g. `WorkspaceEvent.ts`). Domain A’s infrastructure publishes that shape; Domain B’s application layer subscribes (e.g. via a shared event bus interface in `shared/vscode/`).
- **Example:** Domain B needs to call a “get current workspace” capability. Define an interface in `shared/` (e.g. `IWorkspaceProvider`). One domain’s infrastructure implements it; the other receives it via dependency injection in its application layer (injected from `extension.ts` or a small composition module).

### 2. Application-level orchestration

When one use case needs to trigger another across domains, do it at the **application** layer and only through **injected dependencies** (interfaces), not by importing the other domain’s modules.

- **Example:** A “Export project” use case in domain `projects` needs to gather data from domain `notes`. In `extension.ts` (or a thin composition script), you construct the `projects` application service with an injected “notes provider” interface. The implementation of that interface lives in `notes` (or in `shared/` if it’s a generic adapter), and is passed in from the composition root. The `projects` domain never imports `../notes/...`.

### Summary

| Allowed | Not allowed |
|--------|-------------|
| Domains depend on `shared/` (types, interfaces, utils) | Domain A imports from `domains/B` |
| Application layer receives interfaces (injected) implemented by another domain or shared | Application layer imports use cases or entities from another domain |
| Composition root (`extension.ts` or a small bootstrap) wires domains via constructors/factories | Domains registering each other’s commands or UI |

