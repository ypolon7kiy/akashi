import type { SourceFacetTag } from './model';
import { SourceTagType } from './model';
import type { SourceCategory } from './model';

/** Values for `type: 'locality'` — project tree vs user-home config. */
export const SourceLocalityTagValue = {
  Project: 'project',
  Global: 'global',
} as const;

/** Stable category ids for `type: 'category'` (sidebar / graph). */
export const SourceCategoryId = {
  /** Instruction-style docs (CLAUDE.md, GEMINI.md, tool-specific agent files, etc.). */
  LlmGuideline: 'context',
  /** Tool rule files: `.cursor/rules`, `.cursorrules`, `.claude/rules`, Codex `.rules`. */
  Rule: 'rule',
  Skill: 'skill',
  Hook: 'hook',
  Config: 'config',
  Mcp: 'mcp',
  Unknown: 'unknown',
} as const;

function localityTagForOrigin(origin: 'workspace' | 'user'): SourceFacetTag {
  return {
    type: SourceTagType.Locality,
    value: origin === 'user' ? SourceLocalityTagValue.Global : SourceLocalityTagValue.Project,
  };
}

export interface SourceFacetTagInput {
  readonly category: SourceCategory;
  readonly preset: string;
  readonly origin: 'workspace' | 'user';
}

/**
 * Ordered facet tags: locality, category, preset — stable for snapshots.
 */
export function buildSourceFacetTags(input: SourceFacetTagInput): readonly SourceFacetTag[] {
  const locality = localityTagForOrigin(input.origin);
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
