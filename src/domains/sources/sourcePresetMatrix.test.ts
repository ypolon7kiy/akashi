import { describe, expect, it } from 'vitest';
import { SourceKind as K } from './domain/model';
import {
  ALL_SOURCE_PRESET_IDS,
  SOURCE_KINDS_BY_PRESET,
  type SourcePresetId,
} from './domain/sourcePresets';
import { SHARED_SOURCE_KINDS } from './presets/_shared/kinds';

function sortedKinds(kinds: readonly string[]): string[] {
  return [...kinds].sort();
}

/** Baseline from pre-refactor `sourcePresets.ts` (sorted for comparison). */
const EXPECTED_KINDS_BY_PRESET: Record<SourcePresetId, readonly string[]> = {
  claude: sortedKinds([
    K.AgentsMd,
    K.DotAgentsMd,
    K.TeamGuideMd,
    K.GithubCopilotInstructionsMd,
    K.ClaudeMd,
    K.ClaudeSettingsJson,
    K.ClaudeRulesMd,
    K.ClaudeHookFile,
    K.AgentsSkillMd,
    K.ClaudeSkillMd,
    K.CodexSkillMd,
  ]),
  cursor: sortedKinds([
    K.AgentsMd,
    K.DotAgentsMd,
    K.TeamGuideMd,
    K.GithubCopilotInstructionsMd,
    K.CursorLegacyRules,
    K.CursorRulesMdc,
    K.CursorMcpJson,
    K.AgentsSkillMd,
    K.CursorSkillMd,
    K.ClaudeSkillMd,
    K.CodexSkillMd,
  ]),
  antigravity: sortedKinds([
    K.AgentsMd,
    K.DotAgentsMd,
    K.TeamGuideMd,
    K.GithubCopilotInstructionsMd,
    K.GeminiMd,
    K.AgentsSkillMd,
    K.GeminiAntigravitySkillMd,
  ]),
  codex: sortedKinds([
    K.AgentsMd,
    K.DotAgentsMd,
    K.TeamGuideMd,
    K.GithubCopilotInstructionsMd,
    K.CodexConfigToml,
    K.CodexAgentsOverrideMd,
    K.CodexRulesFile,
    K.CodexSkillMd,
  ]),
};

describe('SOURCE_KINDS_BY_PRESET', () => {
  it('matches the historical preset matrix', () => {
    for (const id of ALL_SOURCE_PRESET_IDS) {
      expect(sortedKinds(SOURCE_KINDS_BY_PRESET[id])).toEqual(EXPECTED_KINDS_BY_PRESET[id]);
    }
  });
});

describe('SHARED_SOURCE_KINDS', () => {
  it('is contained in every preset', () => {
    for (const id of ALL_SOURCE_PRESET_IDS) {
      const row = new Set(SOURCE_KINDS_BY_PRESET[id]);
      for (const k of SHARED_SOURCE_KINDS) {
        expect(row.has(k), `${id} should include ${k}`).toBe(true);
      }
    }
  });
});
