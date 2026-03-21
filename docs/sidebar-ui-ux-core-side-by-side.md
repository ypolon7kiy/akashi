# Sidebar/UI/UX/Core Side-by-Side Identification

This document compares the current Akashi baseline to the v1 target in `docs/guideline_system_v1_d873da25.plan.md`. The **Current vs Target** matrix below is maintained to reflect the repo as it evolves; the **Ranked Gap List** and sprint sections remain oriented toward the guideline product vision.

## Current vs Target Matrix

| Area | Current (as-is) | Target (v1) | Key Gap |
|---|---|---|---|
| Sidebar | `SidebarViewProvider` loads one webview; `src/sidebar/bridge/messages.ts` defines sidebar ↔ host types. Handles `showExamplePanel`, sources `index` / `getSnapshot` / `openPath` / `snapshotPush`, and routes snapshot requests to `SourcesService`. | Sidebar acts as control plane for guideline indexing, composition, diagnostics, validation, and governance. | No guideline domain wiring; no graph/composition/diagnostics panels or guideline-specific command flow. |
| UI | `SourcesSidebarFeature`: index controls, preset filtering, tree of indexed sources, open-file from tree. Example panel remains a separate command-driven webview. | Multi-panel UI: graph view, composed-belief view, diagnostics/review-diff view. | No information architecture for guideline workflows; sidebar is sources-focused, not guideline CRUD. |
| UX | Sources flow uses async index/snapshot plumbing (`postRequest` + `requestId`); UI can show busy/empty states for indexing. | Explainable workflow: trigger actions, inspect provenance/results, resolve conflicts, run validations, perform CRUD. | Limited explanation affordances for guideline provenance; no conflict resolution or validation UX. |
| Core | **`sources`** domain: `domain/` / `application/` / `infrastructure/` (path catalog indexing, presets). No `guidelines` domain. | Full guideline loop: parse+normalize, graph index, deterministic composition with provenance, diagnostics, review diffs, CRUD via host, governance indicators. | `guidelines` domain and use cases are not scaffolded yet. |

## Evidence Snapshot (current baseline)

- `src/sidebar/webview/App.tsx`: renders `SourcesSidebarFeature` (sources UI); does not only post `showExamplePanel`.
- `src/sidebar/bridge/messages.ts`: sidebar message kinds including sources index/snapshot/openPath/push and `showExamplePanel`.
- `src/sidebar/host/SidebarViewProvider.ts`: resolves webview HTML/CSS/JS; handles messages above; calls `SourcesService` for snapshot/index; can open `ExamplePanel` for the example message.
- `src/extension.ts`: registers example UI + sidebar provider; constructs `SourcesService` via `createSourcesService` and injects it into the sidebar provider.
- `src/domains/sources/`: application service, ports, domain model, infrastructure (scanner, file stats, VS Code adapters).
- `src/webview-shared/api.ts`: `getVscodeApi`, `newRequestId`, `postRequest` for correlated request/response from the webview.

## Ranked Gap List

### Critical (must establish first)

1. Typed host/webview request-response for **guideline** sidebar workflows (sources already uses `postRequest` / `requestId` for index and snapshot).
2. `guidelines` domain application API scaffold (`indexWorkspace`, `composeAgent`, `validateWorkspace`, `diagnoseConflicts`).
3. Sidebar UI restructuring to show graph/composition/diagnostics panels (even with placeholder data).

### Important (next wave)

4. Host orchestration: command handlers + caching for index/compose/validate lifecycle.
5. Deterministic composition + provenance DTOs wired end-to-end to the sidebar.
6. Conflict/duplication diagnostics and validation/review-diff payloads with actionable hints.

### Later (v1 hardening)

7. CRUD workflow routing through host text edits for consistent behavior.
8. Governance indicators (coverage/conflict hotspots/drift trends) persisted and surfaced in sidebar.
9. Expanded tests/fixtures for precedence, diagnostics invariants, and regression safety.

## First Sprint Recommendation (Typed Contracts + MVP Loop Visibility)

Sprint goal: make the guideline loop visible in the sidebar with typed message plumbing and minimal but real host-backed data flow.

### Scope

1. Define typed sidebar contracts:
   - Requests: `IndexWorkspace`, `ComposeAgent`, `ValidateWorkspace`, `DiagnoseConflicts`.
   - Responses: `Success`, `Error`, plus request IDs.
2. Add `guidelines` domain skeleton with application interfaces and placeholder infrastructure adapter.
3. Extend sidebar provider to route typed requests and return typed responses.
4. Add guideline-focused sidebar sections (today the sidebar is sources-centric; target is three areas):
   - Graph
   - Composed Beliefs
   - Diagnostics/Validation
5. Wire one happy-path flow:
   - User triggers index -> sidebar gets structured result -> UI renders list/summary.

### Out of Scope (Sprint 1)

- Full conflict semantics and advanced contradiction heuristics.
- Rich CRUD operations.
- Governance metric persistence and trend tracking.

### Sprint 1 Done Criteria

- Sidebar can send typed requests and receive typed responses with correlation IDs.
- Host handles index/compose/validate/diagnose endpoints (initial implementation allowed).
- UI exposes clear loading, success, empty, and error states for each section.
- A user can answer a basic “what does this agent believe?” query from sidebar output.
