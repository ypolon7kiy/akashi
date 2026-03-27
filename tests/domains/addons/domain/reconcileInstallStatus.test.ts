import { describe, expect, it } from 'vitest';
import { deriveNameFromPath } from '@src/domains/addons/domain/reconcileInstallStatus';

describe('deriveNameFromPath', () => {
  it('extracts basename without extension for flat files', () => {
    expect(deriveNameFromPath('/home/user/.claude/commands/foo.md')).toBe('foo');
  });

  it('extracts folder name for SKILL.md layout', () => {
    expect(deriveNameFromPath('/home/user/.claude/skills/my-skill/SKILL.md')).toBe('my-skill');
  });

  it('handles Windows-style separators', () => {
    expect(deriveNameFromPath('C:\\Users\\me\\.claude\\commands\\bar.md')).toBe('bar');
  });

  it('handles bare filename without directory', () => {
    expect(deriveNameFromPath('notes.txt')).toBe('notes');
  });

  it('handles SKILL.md at root-like path', () => {
    expect(deriveNameFromPath('my-skill/SKILL.md')).toBe('my-skill');
  });
});
