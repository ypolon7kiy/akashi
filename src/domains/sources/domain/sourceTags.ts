import type { SourceFacetTag } from './model';
import { SourceTagType } from './model';
import type { SourceCategory } from './model';
import type { SourceLocality } from './artifactKind';

/** Values for `type: 'locality'` — project tree vs user-home config. */
export const SourceLocalityTagValue = {
  Project: 'project',
  Global: 'global',
} as const;

/** Stable category ids for `type: 'category'` (sidebar / graph). */
export const SourceCategoryId = {
  /** Instruction-style docs (CLAUDE.md, GEMINI.md, Codex `AGENTS.md` / `.agents.md` fallbacks, etc.). */
  LlmGuideline: 'context',
  /** Tool rule files: `.cursor/rules`, `.cursorrules`, `.claude/rules`, Codex `.codex/rules/*.rules`. */
  Rule: 'rule',
  Skill: 'skill',
  Hook: 'hook',
  Config: 'config',
  Mcp: 'mcp',
  /** Slash-command prompt files: `.cursor/commands`, `~/.cursor/commands`, `.claude/commands`. */
  Command: 'command',
  Unknown: 'unknown',
} as const;

function localityTagForLocality(locality: SourceLocality): SourceFacetTag {
  return {
    type: SourceTagType.Locality,
    value: locality === 'user' ? SourceLocalityTagValue.Global : SourceLocalityTagValue.Project,
  };
}

export interface SourceFacetTagInput {
  readonly category: SourceCategory;
  readonly preset: string;
  readonly locality: SourceLocality;
}

/**
 * Ordered facet tags: locality, category, preset — stable for snapshots.
 */
export function buildSourceFacetTags(input: SourceFacetTagInput): readonly SourceFacetTag[] {
  const locality = localityTagForLocality(input.locality);
  const category: SourceFacetTag = {
    type: SourceTagType.Category,
    value: input.category,
  };
  const presetTag: SourceFacetTag = {
    type: SourceTagType.Preset,
    value: input.preset,
  };
  return [locality, category, presetTag];
}
