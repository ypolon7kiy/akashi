---
name: Guideline System V1
overview: "Create an end-to-end implementation plan to turn Akashi’s mission into a working VS Code extension: parse and model repository-native guidelines, build a provenance-rich relationship graph, compose “what the agent believes,” surface conflicts/validation diffs, and deliver v1 CRUD + governance workflows with a consistent sidebar UX."
todos:
  - id: define-guidelines-model
    content: Define internal guideline model, scope/provenance types, precedence rules, and DTOs for composition + diagnostics.
    status: pending
  - id: implement-parsing-normalization
    content: Implement guideline source parsing/normalization adapters (start with `AGENTS.md` conventions).
    status: pending
  - id: build-index-graph
    content: Index scopes and build the relationship graph with provenance edges for visualization.
    status: pending
  - id: compose-beliefs
    content: Implement deterministic agent composition with per-rule provenance tracing.
    status: pending
  - id: conflict-duplication
    content: Implement duplication/contradiction diagnostics across guideline layers with actionable hints.
    status: pending
  - id: validation-diffs
    content: Implement lightweight validation and review-diff generation for safe iteration.
    status: pending
  - id: sidebar-messaging-contracts
    content: Add typed host<->webview messaging contracts and request/response envelopes for the sidebar.
    status: pending
  - id: sidebar-ux-graph-compose
    content: Update sidebar webview to render graph, composed beliefs, and diagnostics/review diffs.
    status: pending
  - id: host-services-caching-commands
    content: Add host-side service initialization, caching, and new commands (refresh index/compose/validate).
    status: pending
  - id: crud-consistent-editing
    content: Implement v1 CRUD actions routed through the extension host for consistent editing behavior.
    status: pending
  - id: governance-metrics
    content: "Add governance indicators: coverage, conflict hotspots, and drift/change metrics surfaced in the sidebar."
    status: pending
  - id: unit-tests-fixtures
    content: Add unit tests with guideline fixtures to lock precedence, composition, and diagnostics behavior.
    status: pending
isProject: false
---

# Akashi Guideline System Implementation Plan (MVP -> v1)

## Why this plan

Akashi’s mission is to make the *guidelines architecture* legible and safe: deterministic composition with provenance, multi-file conflict semantics, and a graph view that answers “what does this agent believe?” while teams evolve their repos.

The pain points call out what users expect when prompts/guidelines scale: strong CRUD UX, consistent editing across surfaces, and repo-level navigation (not just lists). This plan maps those needs directly to Akashi’s differentiators.

## Target end-state (v1)

By v1, Akashi should let teams:

- Index guideline sources from repo-native conventions (`AGENTS.md` and configured prompt asset metadata).
- Visualize guideline relationships (scope + precedence + provenance).
- Answer, for any agent entrypoint, “what does this agent believe?” via deterministic composition.
- Detect duplicates/contradictions across layers and explain impact with actionable resolution strategies.
- Validate continuously with lightweight checks and “review diffs” to support safe iteration.
- Edit/garden guideline assets with predictable, consistent UX from within VS Code (sidebar actions route through the extension host).
- Support governance workflows: coverage/conflict metrics, ownership hints, and drift tracking (lightweight first).

## Architecture overview

The current codebase is a minimal VS Code extension host + React sidebar webview scaffold (`src/extension.ts`, `src/sidebar/webview/`*). The guideline system will be introduced as new domain modules and then wired into the existing sidebar webview.

```mermaid
flowchart LR
  User[User] --> SidebarUI[Sidebar Webview React UI]
  SidebarUI --> HostReq[Host Requests (postMessage)]
  HostReq --> HostService[Guideline System Application]
  HostService --> Parse[Parse & Normalize Guideline Sources]
  HostService --> Index[Index Scopes & Build Graph]
  HostService --> Compose[Compose Agent Beliefs]
  HostService --> Diags[Conflict/Duplication + Validation]
  Compose --> Answer[Composed View + Provenance]
  Diags --> Hints[Actionable Hints + Review Diffs]
  Answer --> SidebarUI
  Hints --> SidebarUI
```



Key rules from the repo conventions:

- Extension host code is in `src/` and follows DDD layering with domains not importing other domains (`src/domains/AGENTS.md`).
- Webview code is in the browser bundle and communicates with the host using the shared bridge (`src/webview-shared/api.ts`).

## Milestones

### Milestone 1: MVP “Guideline System Loop”

Deliver end-to-end:

1. Parse and normalize guideline sources.
2. Index scopes and build the guidelines graph.
3. Compose rules per agent with provenance.
4. Conflict/duplication hints.
5. Lightweight validation + review diffs.

### Milestone 2: v1 “Usable Editing + Governance”

After the loop is trusted:

- Basic CRUD UX that feels like working with code snippets (rename, tags, folders, inline edits).
- Consistent editing across surfaces by routing edit actions through the extension host.
- Governance workflows: coverage/conflict metrics, drift indicators, ownership hints.

## Implementation tasks (what to build)

1. **Introduce a new `guidelines` domain (full four-layer DDD)**
  - Create a new domain folder under `src/domains/` (e.g. `src/domains/guidelines/`) with `domain/`, `application/`, `infrastructure/`, and `ui/` layers.
  - Application layer exposes use cases:
    - `indexWorkspace()` (parse sources + build graph)
    - `composeAgent(agentId)` (deterministic composed view)
    - `validateScope(scope)` and/or `validateWorkspace()`
    - `diagnoseConflicts(scopeOrAgent)`
  - Infrastructure provides VS Code adapters (filesystem scanning, reading files, locating agent entrypoints).
2. **Define an internal guideline model aligned with the mission**
  - Normalize guideline sources into a common representation:
    - guideline blocks/instructions
    - scopes (workspace/service/feature/file-level; configurable)
    - precedence/override rules
    - provenance records (source file, scope, last-updated signal, owning domain if derivable)
  - Define output DTOs for:
    - `ComposedBelief` (ordered, explainable rules)
    - `Provenance` per rule
    - `ConflictDiagnostic` / `DuplicationDiagnostic`
    - `ValidationFinding` and `ReviewDiff` (what changed between versions)
3. **Implement deterministic composition + provenance tracing**
  - Enforce an explicit precedence model (configurable order + scope specificity + override semantics).
  - Composition should be auditable: every element in the final belief is attributable back to source + scope.
4. **Implement conflict and duplication semantics**
  - MVP v1 logic set:
    - duplicates: same/overlapping instruction blocks across layers
    - contradictions: incompatible assertions (initially heuristic; later strengthen with structure-aware comparison)
  - Diagnostics must include:
    - what files/blocks conflict
    - estimated impact (at least which provenance items get overridden)
    - recommended resolution strategies
5. **Implement lightweight validation + review diffs**
  - Structural/syntax checks for guideline blocks.
  - Drift support:
    - detect additions/removals/changes in normalized blocks
    - present a concise review diff payload suitable for the sidebar UI.
6. **Wire the guideline loop into the existing sidebar scaffold**
  - Extend `src/sidebar/SidebarViewProvider.ts` to handle new request/response message types instead of only `ShowExamplePanel`.
  - Update `src/sidebar/webview/App.tsx` to display:
    - graph view (scope relationships + provenance)
    - agent composition view (“what does this agent believe?”)
    - diagnostics panel (conflicts + validation + review diffs)
  - Keep the shared bridge `src/webview-shared/api.ts` as the communication primitive.
7. **Add type-safe host/webview contracts**
  - Expand `src/sidebar/messages.ts` (or introduce a shared contract module under `src/shared/vscode/`) so message payloads become strongly typed.
  - Prefer request IDs + result envelopes for reliable UI updates.
8. **Add commands + lifecycle management**
  - Add new commands in `src/extension.ts` to:
    - refresh index
    - compose selected agent
    - validate selected scope
  - Add host-side caching so indexing is not triggered excessively.
9. **Deliver basic CRUD UX + consistent editing**
  - Sidebar provides edit actions that dispatch to host commands (so editing behavior is consistent across surfaces).
  - Use host-side text-edit operations (`vscode.workspace.applyEdit` / `showTextDocument`) to modify guideline sources safely.
  - CRUD MVP v1 set:
    - create/edit a guideline block (minimal forms)
    - rename assets (where conventions allow)
    - tagging and folder/scoping actions
10. **Governance workflows (lightweight first)**
  - Build “repo health” indicators:
    - guideline coverage by scope
    - conflict frequency and top hotspots
    - ownership hints (if derived from repository structure)
  - Persist and surface metrics in the sidebar.
11. **Testing and regression safety**
  - Add unit tests for:
    - parsing/normalization
    - precedence model and deterministic composition
    - conflict/deduplication detection invariants
    - validation rule coverage
  - Add a minimal set of fixture guideline files under `tests/fixtures/` or `src/**/__fixtures__/` (plan choice to be finalized during implementation).
12. **Incremental adoption path**
  - Ensure v1 supports stepwise onboarding:
    - start indexing `AGENTS.md` entrypoints
    - expand gradually to richer guideline layers and prompt asset metadata

## Files to touch first (scaffolding)

- `[src/extension.ts](src/extension.ts)`: register new sidebar capability commands and/or domain initialization.
- `[src/sidebar/SidebarViewProvider.ts](src/sidebar/SidebarViewProvider.ts)`: expand message handling and add response posting.
- `[src/sidebar/webview/App.tsx](src/sidebar/webview/App.tsx)`: replace placeholder example UI with guideline graph + compose + diagnostics.
- `[src/sidebar/messages.ts](src/sidebar/messages.ts)`: add typed message contracts for guideline requests.
- `[src/webview-shared/api.ts](src/webview-shared/api.ts)`: extend with request/response helpers if desired.
- `[src/log.ts](src/log.ts)`: optionally add structured logging for guideline indexing/composition runs.

## Success criteria (aligned with the mission)

- Users can answer “what does this agent believe?” reliably for real repo configurations.
- Conflicts/duplications are detected with high precision and explained with actionable recommendations.
- Guideline coverage improves over time (more scope layers become represented).
- Review time decreases because provenance + review diffs support safe iteration.

## Notes on the current state

The repo currently has an `example` domain only (`src/domains/example/`*) and a basic sidebar placeholder.
The first implementation milestone should focus on introducing the `guidelines` domain and wiring it into the sidebar, while keeping the example domain as a temporary manual test button if helpful.