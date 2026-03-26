import { describe, expect, it } from 'vitest';
import { validateSkillName } from '@src/shared/validateSkillName';

describe('validateSkillName()', () => {
  describe('valid names', () => {
    it.each([
      'a',
      'my-skill',
      'skill-123',
      'a-b-c-d',
      'code-review',
      'pdf-processing',
      'x1',
      'abc',
    ])('accepts "%s"', (name) => {
      expect(validateSkillName(name)).toBeNull();
    });

    it('accepts name at exactly 64 characters', () => {
      const name = 'a'.repeat(64);
      expect(validateSkillName(name)).toBeNull();
    });
  });

  describe('invalid names', () => {
    it('rejects empty string', () => {
      expect(validateSkillName('')).toBeTruthy();
    });

    it('rejects whitespace-only', () => {
      expect(validateSkillName('   ')).toBeTruthy();
    });

    it('rejects uppercase letters', () => {
      const err = validateSkillName('MySkill');
      expect(err).toBe('Skill name must be lowercase.');
    });

    it('rejects underscores with helpful message', () => {
      const err = validateSkillName('my_skill');
      expect(err).toBe('Use hyphens (-) instead of underscores (_).');
    });

    it('rejects leading hyphen', () => {
      const err = validateSkillName('-skill');
      expect(err).toBe('Skill name cannot start or end with a hyphen.');
    });

    it('rejects trailing hyphen', () => {
      const err = validateSkillName('skill-');
      expect(err).toBe('Skill name cannot start or end with a hyphen.');
    });

    it('rejects consecutive hyphens', () => {
      const err = validateSkillName('my--skill');
      expect(err).toBe('Skill name cannot contain consecutive hyphens.');
    });

    it('rejects dots', () => {
      const err = validateSkillName('my.skill');
      expect(err).toBeTruthy();
    });

    it('rejects spaces', () => {
      const err = validateSkillName('my skill');
      expect(err).toBeTruthy();
    });

    it('rejects names longer than 64 characters', () => {
      const name = 'a'.repeat(65);
      const err = validateSkillName(name);
      expect(err).toBe('Skill name must be at most 64 characters.');
    });

    it('rejects path traversal characters', () => {
      expect(validateSkillName('../traversal')).toBeTruthy();
    });

    it('rejects special characters', () => {
      expect(validateSkillName('skill:name')).toBeTruthy();
    });
  });
});
