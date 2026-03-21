import { SourceKind as K } from '../../domain/model';

/**
 * Kinds included in every built-in preset (universal docs + Copilot).
 * Preset-specific lists are `[...SHARED_SOURCE_KINDS, ...extra]`.
 */
export const SHARED_SOURCE_KINDS = [
  K.AgentsMd,
  K.DotAgentsMd,
  K.TeamGuideMd,
  K.GithubCopilotInstructionsMd,
] as const;
