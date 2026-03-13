# Sidebar/UI/UX/Core Side-by-Side Identification

This document implements the identification plan by comparing the current Akashi baseline to the v1 target in `docs/guideline_system_v1_d873da25.plan.md`.

## Current vs Target Matrix

| Area | Current (as-is) | Target (v1) | Key Gap |
|---|---|---|---|
| Sidebar | `SidebarViewProvider` loads one webview and handles one message (`showExamplePanel`). | Sidebar acts as control plane for guideline indexing, composition, diagnostics, validation, and governance. | No request/response routing, no guideline domain wiring, no sidebar-driven command flow. |
| UI | Single-button React sidebar (`Show example panel`), no data sections. | Multi-panel UI: graph view, composed-belief view, diagnostics/review-diff view. | No information architecture for guideline workflows. |
| UX | One click action, no async status, no contextual state, no explanation affordances. | Explainable workflow: trigger actions, inspect provenance/results, resolve conflicts, run validations, perform CRUD. | No loading/success/error states; no progressive workflow; no resolution guidance. |
| Core | No guideline parser/index/composer/diagnostics/validation/metrics. | Full guideline loop: parse+normalize, graph index, deterministic composition with provenance, diagnostics, review diffs, CRUD via host, governance indicators. | `guidelines` domain and use cases are not scaffolded yet. |

## Evidence Snapshot (Current Baseline)

- `src/sidebar/webview/App.tsx`: only posts `showExamplePanel`.
- `src/sidebar/messages.ts`: defines only one message constant.
- `src/sidebar/SidebarViewProvider.ts`: receives the one message and opens `ExamplePanel`.
- `src/extension.ts`: registers example UI + sidebar provider, no guideline commands.
- `src/webview-shared/api.ts`: generic API bridge exists but no typed request/response envelope.

## Ranked Gap List

### Critical (must establish first)

1. Typed host/webview request-response contract for sidebar workflows.
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
4. Replace single-button sidebar with three sections:
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
