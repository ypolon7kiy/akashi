import { SourceKind } from '../../domain/model';
import type { WorkspaceGlobContribution } from '../../domain/sourcePresetDefinition';

/** Workspace paths matched by multiple presets; filtered at scan time by allowed kinds. */
export const sharedWorkspaceGlobContributions: readonly WorkspaceGlobContribution[] = [
  {
    glob: '**/{AGENTS.md,agents.md,.agents.md,TEAM_GUIDE.md,team_guide.md,CLAUDE.md,claude.md,GEMINI.md,gemini.md,.cursorrules}',
    kinds: [
      SourceKind.AgentsMd,
      SourceKind.DotAgentsMd,
      SourceKind.TeamGuideMd,
      SourceKind.ClaudeMd,
      SourceKind.GeminiMd,
      SourceKind.CursorLegacyRules,
    ],
  },
  {
    glob: '**/.github/copilot-instructions.md',
    kinds: [SourceKind.GithubCopilotInstructionsMd],
  },
  {
    glob: '**/.agents/skills/**/SKILL.md',
    kinds: [SourceKind.AgentsSkillMd],
  },
];
