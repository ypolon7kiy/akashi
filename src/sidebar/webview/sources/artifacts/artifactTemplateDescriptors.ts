// Webview-safe mirror of ArtifactTemplate with non-serializable fields stripped.
// Defined directly (no node:path imports) so it is safe to bundle in the browser webview.
// Must stay in sync with the domain-layer ArtifactTemplate definitions in
// domains/sources/presets/*/artifactTemplates.ts

export interface ArtifactTemplateDescriptor {
  readonly id: string;
  readonly label: string;
  readonly presetId: string;
  readonly categoryId: string;
  readonly scope: 'workspace' | 'user';
  readonly suggestedExtension: string;
  /**
   * When set, the user input becomes a folder name and this is the fixed file name inside it
   * (e.g. "SKILL.md"). The context menu placeholder adapts accordingly.
   */
  readonly fixedFileName?: string;
}

export const ARTIFACT_TEMPLATE_DESCRIPTORS: readonly ArtifactTemplateDescriptor[] = [
  // Claude
  {
    id: 'claude/skill/workspace',
    label: 'New Skill',
    presetId: 'claude',
    categoryId: 'skill',
    scope: 'workspace',
    suggestedExtension: '.md',
  },
  {
    id: 'claude/skill/user',
    label: 'New Skill (global)',
    presetId: 'claude',
    categoryId: 'skill',
    scope: 'user',
    suggestedExtension: '.md',
  },
  {
    id: 'claude/rule/workspace',
    label: 'New Rule',
    presetId: 'claude',
    categoryId: 'rule',
    scope: 'workspace',
    suggestedExtension: '.md',
  },
  {
    id: 'claude/rule/user',
    label: 'New Rule (global)',
    presetId: 'claude',
    categoryId: 'rule',
    scope: 'user',
    suggestedExtension: '.md',
  },
  {
    id: 'claude/context/workspace',
    label: 'New Context File',
    presetId: 'claude',
    categoryId: 'context',
    scope: 'workspace',
    suggestedExtension: '.md',
  },
  {
    id: 'claude/hook/workspace',
    label: 'New Hook',
    presetId: 'claude',
    categoryId: 'hook',
    scope: 'workspace',
    suggestedExtension: '.sh',
  },
  {
    id: 'claude/hook/user',
    label: 'New Hook (global)',
    presetId: 'claude',
    categoryId: 'hook',
    scope: 'user',
    suggestedExtension: '.sh',
  },
  // Cursor
  {
    id: 'cursor/skill/workspace',
    label: 'New Skill',
    presetId: 'cursor',
    categoryId: 'skill',
    scope: 'workspace',
    suggestedExtension: '.md',
  },
  {
    id: 'cursor/skill/user',
    label: 'New Skill (global)',
    presetId: 'cursor',
    categoryId: 'skill',
    scope: 'user',
    suggestedExtension: '.md',
  },
  {
    id: 'cursor/rule/workspace',
    label: 'New Rule',
    presetId: 'cursor',
    categoryId: 'rule',
    scope: 'workspace',
    suggestedExtension: '.mdc',
  },
  {
    id: 'cursor/rule/user',
    label: 'New Rule (global)',
    presetId: 'cursor',
    categoryId: 'rule',
    scope: 'user',
    suggestedExtension: '.mdc',
  },
  {
    id: 'cursor/context/workspace',
    label: 'New Context File',
    presetId: 'cursor',
    categoryId: 'context',
    scope: 'workspace',
    suggestedExtension: '.md',
  },
  // Codex
  {
    id: 'codex/skill/workspace',
    label: 'New Skill',
    presetId: 'codex',
    categoryId: 'skill',
    scope: 'workspace',
    suggestedExtension: '.md',
  },
  {
    id: 'codex/skill/user',
    label: 'New Skill (global)',
    presetId: 'codex',
    categoryId: 'skill',
    scope: 'user',
    suggestedExtension: '.md',
  },
  {
    id: 'codex/rule/workspace',
    label: 'New Rule',
    presetId: 'codex',
    categoryId: 'rule',
    scope: 'workspace',
    suggestedExtension: '.rules',
  },
  {
    id: 'codex/rule/user',
    label: 'New Rule (global)',
    presetId: 'codex',
    categoryId: 'rule',
    scope: 'user',
    suggestedExtension: '.rules',
  },
  {
    id: 'codex/context/workspace',
    label: 'New Context File',
    presetId: 'codex',
    categoryId: 'context',
    scope: 'workspace',
    suggestedExtension: '.md',
  },
  // Antigravity
  {
    id: 'antigravity/skill/workspace',
    label: 'New Skill',
    presetId: 'antigravity',
    categoryId: 'skill',
    scope: 'workspace',
    suggestedExtension: '',
    fixedFileName: 'SKILL.md',
  },
  {
    id: 'antigravity/skill/user',
    label: 'New Skill (global)',
    presetId: 'antigravity',
    categoryId: 'skill',
    scope: 'user',
    suggestedExtension: '',
    fixedFileName: 'SKILL.md',
  },
  {
    id: 'antigravity/context/workspace',
    label: 'New Context File',
    presetId: 'antigravity',
    categoryId: 'context',
    scope: 'workspace',
    suggestedExtension: '.md',
  },
];
