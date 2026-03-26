const DEFAULT_DESCRIPTION = 'TODO: Describe what this skill does and when to use it.';

/** Build a SKILL.md body with AgentSkills.io-compliant YAML frontmatter. */
export function buildSkillContent(name: string, description: string): string {
  const raw = description.trim() || DEFAULT_DESCRIPTION;
  // Collapse newlines to spaces to prevent YAML frontmatter injection.
  const desc = raw.replace(/[\r\n]+/g, ' ').trim();
  return `---\nname: ${name}\ndescription: ${desc}\n---\n\n`;
}
