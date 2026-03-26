import { validateSourceFileBaseName } from './validateSourceFileBaseName';

const MAX_SKILL_NAME_LENGTH = 64;

/**
 * AgentSkills.io-compliant skill name validator.
 *
 * Rules (https://agentskills.io/specification#name-field):
 * - 1–64 characters
 * - Lowercase alphanumeric and hyphens only
 * - Cannot start or end with a hyphen
 * - No consecutive hyphens
 *
 * Also delegates to {@link validateSourceFileBaseName} for filesystem safety.
 * Returns `null` if valid; otherwise a user-facing reason string.
 */
export function validateSkillName(name: string): string | null {
  const t = name.trim();
  if (t === '') {
    return 'Enter a skill name.';
  }

  const baseErr = validateSourceFileBaseName(t);
  if (baseErr) {
    return baseErr;
  }

  if (t.length > MAX_SKILL_NAME_LENGTH) {
    return `Skill name must be at most ${MAX_SKILL_NAME_LENGTH} characters.`;
  }

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t)) {
    if (t !== t.toLowerCase()) {
      return 'Skill name must be lowercase.';
    }
    if (t.includes('_')) {
      return 'Use hyphens (-) instead of underscores (_).';
    }
    if (t.startsWith('-') || t.endsWith('-')) {
      return 'Skill name cannot start or end with a hyphen.';
    }
    if (t.includes('--')) {
      return 'Skill name cannot contain consecutive hyphens.';
    }
    return 'Skill name may only contain lowercase letters, numbers, and hyphens.';
  }

  return null;
}
