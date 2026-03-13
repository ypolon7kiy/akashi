# Product Mission

Akashi is the "system instructions IDE" for teams building AI agents from repository-native guidelines. We help people create, understand, validate, and govern the layered instruction sets their agents rely on--across `AGENTS.md`, provider prompt assets, and related docs--so guidance stays correct as projects evolve.

Native VS Code prompt tooling treats prompts as reusable snippets. Akashi treats guidelines as a structured, versioned system: scoped by ownership and locality, composed deterministically for each agent, and reviewed with clear provenance. The result is faster iteration, fewer instruction regressions, and a shared mental model for what each agent should believe.

## Product Thesis

We win by making the *guidelines architecture* legible and safe, not by being another prompt manager.

### Non-goals (for now)

- Not a general-purpose prompt library UI (folders and search only).
- Not a runtime LLM orchestration platform.
- Not a provider-specific wizard that locks teams into one ecosystem.

## Competitive Landscape (Condensed)

- **Native Copilot features** are expanding (e.g., support for `AGENTS.md` and prompt files), but offer limited UX for browsing, validating, refactoring, or understanding networks of guideline files.
- **Prompt-management extensions** organize prompts well, yet rarely model repo-scale relationships: overrides, conflicts, and composition across multiple guideline layers.
- **Prompt asset / configuration systems** (for example `.prompty`-style approaches) treat prompts as code-like assets, but do not primarily visualize and govern a multi-file guideline hierarchy for agents.

## Differentiation Pillars

Akashi is designed to deliver four capabilities that existing tools rarely combine:

1. **Guidelines graph view (by scope and provenance)**  
   Show how files relate: workspace vs service vs feature vs file-level overrides, with explicit "where this rule came from."

2. **Multi-file conflict semantics**  
   Detect duplicates and contradictions across guideline layers, explain impact, and recommend resolution strategies.

3. **Agent-centric composed-rule understanding**  
   Answer: "What does this agent believe?" by composing active rules from multiple sources into a single, reviewable view.

4. **Cross-provider guideline abstraction**  
   Present one consistent model for guideline assets that originate in different ecosystems (e.g., Copilot-style instructions, prompt-file conventions, and prompt-asset metadata).

## State-of-the-Art Product Guidelines

Use these principles to decide what to build, how to design features, and what "great" looks like.

### 1) Build for repo-scale, not prompt-scale

Optimise for layered systems:

- Prefer "show relationships + explain impact" over "list documents."
- Assume rules overlap; design for precedence, overrides, and drift.

### 2) Make composition deterministic and inspectable

When guidelines are composed for an agent:

- Use a clear precedence model (explicit order, explicit scopes, explicit overrides).
- Produce an auditable output that includes provenance for each composed rule.

### 3) Treat provenance as a first-class UX primitive

Every displayed "belief" should carry:

- source file
- scope (which layer it applied from)
- last-updated signal (even if approximate)
- owning domain (where possible)

### 4) Validate continuously with lightweight, repo-native checks

Validation should be fast and practical:

- syntax/structure checks for guideline blocks
- duplication detection across scopes
- conflict hints with actionable explanations
- "what changed" summaries to support review

### 5) Design for incremental adoption

Teams should be able to adopt Akashi gradually:

- start with one guideline entrypoint (e.g., workspace `AGENTS.md`)
- expand to domain/service scope files
- add agent composition and governance once the baseline is stable

### 6) Evaluate instruction regressions

Add "eval thinking" to product decisions:

- track guideline coverage (where guidelines exist vs where they don't)
- measure conflict frequency and review outcomes
- when possible, support scenario-based tests ("given these rules, what response policy should apply?")

### 7) Avoid commoditized feature surfaces

If a feature is primarily "browse/edit prompts," treat it as a means to the core promise (clarity + safety), not the end product.

## MVP Focus and Sequencing

Deliver value by implementing the "guideline system" loop end-to-end before expanding breadth.

1. **Parse and normalize guideline sources**  
   Support the minimal set of guideline inputs Akashi is intended to model (starting with repo-level `AGENTS.md` conventions and prompt-asset metadata where applicable).

2. **Index scopes and build the guidelines graph**  
   Create the sidebar tree and a graphable representation of relationships and precedence.

3. **Compose rules per agent ("What does this agent believe?")**  
   Output a composed view that includes provenance per rule.

4. **Conflict and duplication hints**  
   Detect overlaps that matter and show recommended resolutions.

5. **Lightweight validation + review diffs**  
Provide actionable checks rather than a "lint wall."

Governance metrics, ownership workflows, and deeper evaluation tooling come after the core graph + composition loop is trusted.

## Risks and Mitigations

### Risk: Native ecosystems will commoditize basic editing/listing

Mitigation: anchor the product in semantics that native features don't expose well--graph relationships, conflicts, and deterministic composition with provenance.

### Risk: Standards fragmentation across providers and conventions

Mitigation: keep parsing and modeling pluggable; adopt the simplest unified internal model first, then extend adapters.

### Risk: Feature creep into a generic prompt manager

Mitigation: enforce the mission test: every feature must improve clarity, safety, or governance of the guideline architecture--not just manage assets.

### Risk: Complexity of multi-file rule semantics

Mitigation: narrow scope for MVP, define explicit precedence rules early, and invest in explainability (provenance + "why").

## Success Criteria

Akashi is successful when teams can confidently manage agent guidance at scale.

- Users can reliably answer "what does this agent believe?" for real repo configurations.
- Conflicts/duplications are detected with high precision and presented with actionable explanations.
- Guideline coverage improves over time (more scope layers represented, fewer unmanaged areas).
- Review time decreases for instruction updates (tracked via workflow outcomes and feedback).
- Adoption is sustainable: updates do not cause widespread regressions because provenance and validation make changes safe.

