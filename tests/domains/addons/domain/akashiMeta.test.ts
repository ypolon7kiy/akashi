import { describe, expect, it } from 'vitest';
import {
  emptyMeta,
  addEntry,
  removeEntry,
  findEntry,
  getEntries,
  parseAkashiMeta,
  type AkashiMetaEntry,
} from '@src/domains/addons/domain/akashiMeta';

// ── Factories ──────────────────────────────────────────────────────

function entry(name: string, overrides: Partial<AkashiMetaEntry> = {}): AkashiMetaEntry {
  return {
    name,
    category: 'skill',
    originId: 'origin-a',
    version: '1.0.0',
    installedPaths: [],
    ...overrides,
  };
}

// ── emptyMeta ──────────────────────────────────────────────────────

describe('emptyMeta', () => {
  it('returns version 1 with empty installed map', () => {
    const meta = emptyMeta();
    expect(meta.version).toBe(1);
    expect(meta.installed).toEqual({});
  });
});

// ── addEntry ───────────────────────────────────────────────────────

describe('addEntry', () => {
  it('adds an entry to a new preset', () => {
    const meta = addEntry(emptyMeta(), 'claude', entry('foo'));
    expect(getEntries(meta, 'claude')).toHaveLength(1);
    expect(getEntries(meta, 'claude')[0].name).toBe('foo');
  });

  it('appends entries with different names', () => {
    let meta = addEntry(emptyMeta(), 'claude', entry('foo'));
    meta = addEntry(meta, 'claude', entry('bar'));
    expect(getEntries(meta, 'claude')).toHaveLength(2);
  });

  it('replaces entry with same name + category (upsert)', () => {
    let meta = addEntry(emptyMeta(), 'claude', entry('foo', { version: '1.0.0' }));
    meta = addEntry(meta, 'claude', entry('foo', { version: '2.0.0' }));
    expect(getEntries(meta, 'claude')).toHaveLength(1);
    expect(getEntries(meta, 'claude')[0].version).toBe('2.0.0');
  });

  it('does not replace entry with same name but different category', () => {
    let meta = addEntry(emptyMeta(), 'claude', entry('foo', { category: 'skill' }));
    meta = addEntry(meta, 'claude', entry('foo', { category: 'command' }));
    expect(getEntries(meta, 'claude')).toHaveLength(2);
  });

  it('keeps entries in other presets untouched', () => {
    let meta = addEntry(emptyMeta(), 'cursor', entry('bar'));
    meta = addEntry(meta, 'claude', entry('foo'));
    expect(getEntries(meta, 'cursor')).toHaveLength(1);
    expect(getEntries(meta, 'claude')).toHaveLength(1);
  });
});

// ── removeEntry ────────────────────────────────────────────────────

describe('removeEntry', () => {
  it('removes an entry by name + category', () => {
    const meta = addEntry(emptyMeta(), 'claude', entry('foo'));
    const updated = removeEntry(meta, 'claude', 'foo', 'skill');
    expect(getEntries(updated, 'claude')).toHaveLength(0);
  });

  it('does not remove entry with different category', () => {
    const meta = addEntry(emptyMeta(), 'claude', entry('foo', { category: 'command' }));
    const updated = removeEntry(meta, 'claude', 'foo', 'skill');
    expect(getEntries(updated, 'claude')).toHaveLength(1);
  });

  it('returns meta unchanged when preset does not exist', () => {
    const meta = emptyMeta();
    const updated = removeEntry(meta, 'claude', 'foo', 'skill');
    expect(updated).toBe(meta);
  });
});

// ── findEntry ──────────────────────────────────────────────────────

describe('findEntry', () => {
  it('finds an entry by name + category', () => {
    const meta = addEntry(emptyMeta(), 'claude', entry('foo'));
    expect(findEntry(meta, 'claude', 'foo', 'skill')).toBeDefined();
    expect(findEntry(meta, 'claude', 'foo', 'skill')!.name).toBe('foo');
  });

  it('returns undefined when not found', () => {
    expect(findEntry(emptyMeta(), 'claude', 'foo', 'skill')).toBeUndefined();
  });

  it('returns undefined for wrong category', () => {
    const meta = addEntry(emptyMeta(), 'claude', entry('foo', { category: 'command' }));
    expect(findEntry(meta, 'claude', 'foo', 'skill')).toBeUndefined();
  });
});

// ── getEntries ─────────────────────────────────────────────────────

describe('getEntries', () => {
  it('returns empty array for missing preset', () => {
    expect(getEntries(emptyMeta(), 'claude')).toEqual([]);
  });
});

// ── parseAkashiMeta ────────────────────────────────────────────────

describe('parseAkashiMeta', () => {
  it('parses a valid meta object', () => {
    const raw = {
      version: 1,
      installed: {
        claude: [{ name: 'foo', category: 'skill', originId: 'origin-a', version: '1.0.0' }],
      },
    };
    const meta = parseAkashiMeta(raw);
    expect(meta.version).toBe(1);
    expect(getEntries(meta, 'claude')).toHaveLength(1);
  });

  it('returns emptyMeta for null', () => {
    expect(parseAkashiMeta(null)).toEqual(emptyMeta());
  });

  it('returns emptyMeta for undefined', () => {
    expect(parseAkashiMeta(undefined)).toEqual(emptyMeta());
  });

  it('returns emptyMeta for wrong version', () => {
    expect(parseAkashiMeta({ version: 2, installed: {} })).toEqual(emptyMeta());
  });

  it('returns emptyMeta for array', () => {
    expect(parseAkashiMeta([])).toEqual(emptyMeta());
  });

  it('skips entries with missing fields', () => {
    const raw = {
      version: 1,
      installed: {
        claude: [
          { name: 'valid', category: 'skill', originId: 'origin-a', version: '1.0.0' },
          { name: 'incomplete' }, // missing fields
          42, // not an object
        ],
      },
    };
    const meta = parseAkashiMeta(raw);
    expect(getEntries(meta, 'claude')).toHaveLength(1);
    expect(getEntries(meta, 'claude')[0].name).toBe('valid');
  });

  it('skips non-array preset values', () => {
    const raw = {
      version: 1,
      installed: {
        claude: 'not-an-array',
      },
    };
    const meta = parseAkashiMeta(raw);
    expect(getEntries(meta, 'claude')).toEqual([]);
  });
});
