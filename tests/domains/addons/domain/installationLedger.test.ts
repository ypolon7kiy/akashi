import { describe, expect, it } from 'vitest';
import {
  emptyLedger,
  addToLedger,
  removeFromLedger,
  findInLedger,
  findInLedgerByPath,
  type InstalledAddonRecord,
  type InstallationLedger,
} from '@src/domains/addons/domain/installationLedger';

function record(
  name: string,
  installedFiles: readonly string[] = [],
  overrides: Partial<InstalledAddonRecord> = {}
): InstalledAddonRecord {
  return {
    id: `${name}@origin`,
    name,
    originId: 'origin',
    presetId: 'claude',
    category: 'skill',
    version: '1.0.0',
    installedAt: '2025-01-01T00:00:00.000Z',
    installedFiles,
    installedJsonEntries: [],
    ...overrides,
  };
}

describe('installationLedger', () => {
  describe('emptyLedger', () => {
    it('returns a ledger with no records', () => {
      const ledger = emptyLedger();
      expect(ledger.version).toBe(1);
      expect(ledger.records).toEqual([]);
    });
  });

  describe('addToLedger', () => {
    it('adds a record to an empty ledger', () => {
      const r = record('foo', ['/a.md']);
      const result = addToLedger(emptyLedger(), r);
      expect(result.records).toHaveLength(1);
      expect(result.records[0].name).toBe('foo');
    });

    it('replaces an existing record with the same id', () => {
      const r1 = record('foo', ['/a.md']);
      const r2 = record('foo', ['/b.md']);
      const ledger = addToLedger(emptyLedger(), r1);
      const result = addToLedger(ledger, r2);
      expect(result.records).toHaveLength(1);
      expect(result.records[0].installedFiles).toEqual(['/b.md']);
    });
  });

  describe('removeFromLedger', () => {
    it('removes a record by id', () => {
      const ledger = addToLedger(emptyLedger(), record('foo', ['/a.md']));
      const result = removeFromLedger(ledger, 'foo@origin');
      expect(result.records).toHaveLength(0);
    });

    it('returns unchanged ledger if id not found', () => {
      const ledger = addToLedger(emptyLedger(), record('foo', ['/a.md']));
      const result = removeFromLedger(ledger, 'bar@origin');
      expect(result.records).toHaveLength(1);
    });
  });

  describe('findInLedger', () => {
    it('finds a record by id', () => {
      const ledger = addToLedger(emptyLedger(), record('foo', ['/a.md']));
      expect(findInLedger(ledger, 'foo@origin')?.name).toBe('foo');
    });

    it('returns undefined when not found', () => {
      expect(findInLedger(emptyLedger(), 'foo@origin')).toBeUndefined();
    });
  });

  describe('findInLedgerByPath', () => {
    it('finds a record that contains the given path in installedFiles', () => {
      const ledger = addToLedger(
        emptyLedger(),
        record('foo', ['/ws/.claude/skills/foo/SKILL.md', '/ws/.claude/skills/foo/README.md'])
      );
      const found = findInLedgerByPath(ledger, '/ws/.claude/skills/foo/SKILL.md');
      expect(found?.name).toBe('foo');
    });

    it('returns undefined when no record has the given path', () => {
      const ledger = addToLedger(emptyLedger(), record('foo', ['/a.md']));
      expect(findInLedgerByPath(ledger, '/b.md')).toBeUndefined();
    });

    it('matches against secondary files, not just the first', () => {
      const ledger = addToLedger(
        emptyLedger(),
        record('foo', ['/ws/.claude/skills/foo/SKILL.md', '/ws/.claude/skills/foo/extra.md'])
      );
      const found = findInLedgerByPath(ledger, '/ws/.claude/skills/foo/extra.md');
      expect(found?.name).toBe('foo');
    });

    it('returns the first match when multiple records share a path', () => {
      let ledger: InstallationLedger = emptyLedger();
      ledger = addToLedger(ledger, record('alpha', ['/shared.md'], { id: 'alpha@origin' }));
      ledger = addToLedger(ledger, record('beta', ['/shared.md', '/b.md'], { id: 'beta@origin' }));
      const found = findInLedgerByPath(ledger, '/shared.md');
      expect(found).toBeDefined();
    });

    it('returns undefined for empty ledger', () => {
      expect(findInLedgerByPath(emptyLedger(), '/any.md')).toBeUndefined();
    });
  });
});
