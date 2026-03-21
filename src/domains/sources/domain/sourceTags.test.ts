import { describe, expect, it } from 'vitest';
import { SourceKind, SourceTagType } from './model';
import { presetsContainingKind } from './sourcePresets';
import {
  SourceCategoryId,
  SourceLocalityTagValue,
  buildSourceFacetTags,
  sourceCategoryForKind,
} from './sourceTags';

const ALL_SOURCE_KINDS = Object.values(SourceKind) as SourceKind[];

describe('sourceCategoryForKind', () => {
  it.each([
    [SourceKind.AgentsMd, SourceCategoryId.LlmGuideline],
    [SourceKind.DotAgentsMd, SourceCategoryId.LlmGuideline],
    [SourceKind.TeamGuideMd, SourceCategoryId.LlmGuideline],
    [SourceKind.ClaudeMd, SourceCategoryId.LlmGuideline],
    [SourceKind.GeminiMd, SourceCategoryId.LlmGuideline],
    [SourceKind.GithubCopilotInstructionsMd, SourceCategoryId.LlmGuideline],
    [SourceKind.CodexAgentsOverrideMd, SourceCategoryId.LlmGuideline],
    [SourceKind.ClaudeRulesMd, SourceCategoryId.Rule],
    [SourceKind.CursorLegacyRules, SourceCategoryId.Rule],
    [SourceKind.CursorRulesMdc, SourceCategoryId.Rule],
    [SourceKind.CodexRulesFile, SourceCategoryId.Rule],
    [SourceKind.AgentsSkillMd, SourceCategoryId.Skill],
    [SourceKind.CursorSkillMd, SourceCategoryId.Skill],
    [SourceKind.ClaudeSkillMd, SourceCategoryId.Skill],
    [SourceKind.CodexSkillMd, SourceCategoryId.Skill],
    [SourceKind.GeminiAntigravitySkillMd, SourceCategoryId.Skill],
    [SourceKind.ClaudeHookFile, SourceCategoryId.Hook],
    [SourceKind.ClaudeSettingsJson, SourceCategoryId.Config],
    [SourceKind.CodexConfigToml, SourceCategoryId.Config],
    [SourceKind.CursorMcpJson, SourceCategoryId.Mcp],
    [SourceKind.Unknown, SourceCategoryId.Unknown],
  ] as const)('maps %s → %s', (kind, category) => {
    expect(sourceCategoryForKind(kind)).toBe(category);
  });

  it('covers every SourceKind', () => {
    for (const kind of ALL_SOURCE_KINDS) {
      const c = sourceCategoryForKind(kind);
      expect([
        SourceCategoryId.LlmGuideline,
        SourceCategoryId.Rule,
        SourceCategoryId.Skill,
        SourceCategoryId.Hook,
        SourceCategoryId.Config,
        SourceCategoryId.Mcp,
        SourceCategoryId.Unknown,
      ]).toContain(c);
    }
  });
});

describe('buildSourceFacetTags', () => {
  it('orders locality, category, then presets sorted (workspace)', () => {
    const kind = SourceKind.ClaudeHookFile;
    const tags = buildSourceFacetTags(kind, 'workspace');
    expect(tags[0]).toEqual({
      type: SourceTagType.Locality,
      value: SourceLocalityTagValue.Project,
    });
    expect(tags[1]).toEqual({ type: SourceTagType.Category, value: SourceCategoryId.Hook });
    const expectedPresets = [...presetsContainingKind(kind)].sort().map((id) => ({
      type: SourceTagType.Preset,
      value: id,
    }));
    expect(tags.slice(2)).toEqual(expectedPresets);
  });

  it('uses global locality for user origin', () => {
    const tags = buildSourceFacetTags(SourceKind.CursorMcpJson, 'user');
    expect(tags[0]).toEqual({
      type: SourceTagType.Locality,
      value: SourceLocalityTagValue.Global,
    });
  });
});
