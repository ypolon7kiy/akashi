import type { SourceFacetTag } from './model';
import { SourceKind, SourceTagType, type SourceKind as SourceKindT } from './model';
import { presetsContainingKind } from './sourcePresets';

/** Values for `type: 'locality'` — project tree vs user-home config. */
export const SourceLocalityTagValue = {
  Project: 'project',
  Global: 'global',
} as const;

/** Stable category ids for `type: 'category'`. */
export const SourceCategoryId = {
  /** Instruction-style docs (AGENTS, CLAUDE.md, Copilot, overrides, etc.). */
  LlmGuideline: 'context',
  /** Tool rule files: `.cursor/rules`, `.cursorrules`, `.claude/rules`, Codex `.rules`. */
  Rule: 'rule',
  Skill: 'skill',
  Hook: 'hook',
  Config: 'config',
  Mcp: 'mcp',
  Unknown: 'unknown',
} as const;

export function sourceCategoryForKind(kind: SourceKindT): string {
  switch (kind) {
    case SourceKind.AgentsMd:
    case SourceKind.DotAgentsMd:
    case SourceKind.TeamGuideMd:
    case SourceKind.ClaudeMd:
    case SourceKind.GeminiMd:
    case SourceKind.GithubCopilotInstructionsMd:
    case SourceKind.CodexAgentsOverrideMd:
      return SourceCategoryId.LlmGuideline;

    case SourceKind.ClaudeRulesMd:
    case SourceKind.CursorLegacyRules:
    case SourceKind.CursorRulesMdc:
    case SourceKind.CodexRulesFile:
      return SourceCategoryId.Rule;

    case SourceKind.AgentsSkillMd:
    case SourceKind.CursorSkillMd:
    case SourceKind.ClaudeSkillMd:
    case SourceKind.CodexSkillMd:
    case SourceKind.GeminiAntigravitySkillMd:
      return SourceCategoryId.Skill;

    case SourceKind.ClaudeHookFile:
      return SourceCategoryId.Hook;

    case SourceKind.ClaudeSettingsJson:
    case SourceKind.CodexConfigToml:
      return SourceCategoryId.Config;

    case SourceKind.CursorMcpJson:
      return SourceCategoryId.Mcp;

    case SourceKind.Unknown:
      return SourceCategoryId.Unknown;
  }
}

function localityTagForOrigin(origin: 'workspace' | 'user'): SourceFacetTag {
  return {
    type: SourceTagType.Locality,
    value: origin === 'user' ? SourceLocalityTagValue.Global : SourceLocalityTagValue.Project,
  };
}

/**
 * Ordered facet tags: locality, category, then preset tags (preset ids sorted) for stable snapshots.
 */
export function buildSourceFacetTags(
  kind: SourceKindT,
  origin: 'workspace' | 'user'
): readonly SourceFacetTag[] {
  const locality = localityTagForOrigin(origin);
  const category: SourceFacetTag = {
    type: SourceTagType.Category,
    value: sourceCategoryForKind(kind),
  };
  const presetIds = [...presetsContainingKind(kind)].sort();
  const presetTags = presetIds.map(
    (id): SourceFacetTag => ({ type: SourceTagType.Preset, value: id })
  );
  return [locality, category, ...presetTags];
}
