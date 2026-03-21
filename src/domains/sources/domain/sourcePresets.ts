import type { IndexedSourceEntry, SourceKind } from './model';
import { SourceKind as K } from './model';

/**
 * Sidebar / settings preset ids (no `vscode` here). Each preset owns an explicit list of {@link SourceKind}
 * values — this object is the single source of truth for “which kinds belong to which preset”.
 */
export const SourcePresetId = {
  Claude: 'claude',
  Cursor: 'cursor',
  Antigravity: 'antigravity',
} as const;

export type SourcePresetId = (typeof SourcePresetId)[keyof typeof SourcePresetId];

/** Injected at the extension composition root (reads VS Code settings). */
export type ActiveSourcePresetsGetter = () => ReadonlySet<SourcePresetId>;

export const ALL_SOURCE_PRESET_IDS: readonly SourcePresetId[] = [
  SourcePresetId.Claude,
  SourcePresetId.Cursor,
  SourcePresetId.Antigravity,
];

/** For each preset, which indexed source kinds it includes. */
export const SOURCE_KINDS_BY_PRESET: Readonly<Record<SourcePresetId, readonly SourceKind[]>> = {
  [SourcePresetId.Claude]: [
    K.AgentsMd,
    K.DotAgentsMd,
    K.TeamGuideMd,
    K.GithubCopilotInstructionsMd,
    K.ClaudeMd,
    K.ClaudeSettingsJson,
    K.ClaudeRulesMd,
    K.ClaudeHookFile,
    K.CodexConfigToml,
  ],
  [SourcePresetId.Cursor]: [
    K.AgentsMd,
    K.DotAgentsMd,
    K.TeamGuideMd,
    K.GithubCopilotInstructionsMd,
    K.CursorLegacyRules,
    K.CursorRulesMdc,
    K.CursorMcpJson,
  ],
  [SourcePresetId.Antigravity]: [
    K.AgentsMd,
    K.DotAgentsMd,
    K.TeamGuideMd,
    K.GithubCopilotInstructionsMd,
    K.GeminiMd,
  ],
};

export function isSourcePresetId(value: string): value is SourcePresetId {
  return (ALL_SOURCE_PRESET_IDS as readonly string[]).includes(value);
}

/** Union of kinds for the given active presets. */
export function sourceKindsForPresets(
  active: ReadonlySet<SourcePresetId>
): ReadonlySet<SourceKind> {
  const kinds = new Set<SourceKind>();
  for (const preset of active) {
    for (const kind of SOURCE_KINDS_BY_PRESET[preset]) {
      kinds.add(kind);
    }
  }
  return kinds;
}

export function recordMatchesSourceKinds(
  record: IndexedSourceEntry,
  allowedKinds: ReadonlySet<SourceKind>
): boolean {
  return allowedKinds.has(record.kind);
}

/** Presets whose kind list includes this kind (for UI / descriptors). */
export function presetsContainingKind(kind: SourceKind): SourcePresetId[] {
  const out: SourcePresetId[] = [];
  for (const preset of ALL_SOURCE_PRESET_IDS) {
    const kinds = SOURCE_KINDS_BY_PRESET[preset];
    if (kinds.includes(kind)) {
      out.push(preset);
    }
  }
  return out;
}
