import { describe, expect, it } from 'vitest';
import {
  buildWatcherGlobPatterns,
  WORKSPACE_GLOB_SCAN_ROWS,
} from '@src/domains/sources/registerSourcePresets';

describe('buildWatcherGlobPatterns', () => {
  const patterns = buildWatcherGlobPatterns();

  it('returns exactly 2 patterns (standalone files + dot-directories)', () => {
    expect(patterns).toHaveLength(2);
  });

  it('first pattern covers standalone root-level filenames', () => {
    const standalonePattern = patterns.find((p) => !p.endsWith('/**'))!;
    expect(standalonePattern).toBeDefined();
    expect(standalonePattern).toContain('CLAUDE.md');
    expect(standalonePattern).toContain('claude.md');
    expect(standalonePattern).toContain('.mcp.json');
    expect(standalonePattern).toContain('.cursorrules');
    expect(standalonePattern).toContain('AGENTS.md');
    expect(standalonePattern).toContain('GEMINI.md');
  });

  it('second pattern covers tool dot-directories', () => {
    const dirPattern = patterns.find((p) => p.endsWith('/**'))!;
    expect(dirPattern).toBeDefined();
    expect(dirPattern).toContain('.claude');
    expect(dirPattern).toContain('.cursor');
    expect(dirPattern).toContain('.codex');
    expect(dirPattern).toContain('.gemini');
    expect(dirPattern).toContain('.agents');
    expect(dirPattern).toContain('.agent');
  });

  it('every workspace glob row is covered by at least one watcher pattern', () => {
    for (const row of WORKSPACE_GLOB_SCAN_ROWS) {
      const suffix = row.glob.startsWith('**/') ? row.glob.slice(3) : row.glob;

      const slashIdx = suffix.indexOf('/');
      const isDir = slashIdx > 0 && suffix.startsWith('.');

      if (isDir) {
        const dirName = suffix.slice(0, slashIdx);
        const dirPattern = patterns.find((p) => p.endsWith('/**'));
        expect(
          dirPattern?.includes(dirName),
          `dot-directory pattern should include "${dirName}" (from glob "${row.glob}")`
        ).toBe(true);
      } else {
        const filePattern = patterns.find((p) => !p.endsWith('/**'));
        expect(
          filePattern?.includes(suffix),
          `standalone pattern should include "${suffix}" (from glob "${row.glob}")`
        ).toBe(true);
      }
    }
  });

  it('patterns use brace-expansion syntax when they contain multiple entries', () => {
    for (const p of patterns) {
      expect(p).toMatch(/^\*\*\/\{.+\}/);
    }
  });

  it('all patterns start with **/', () => {
    for (const p of patterns) {
      expect(p.startsWith('**/')).toBe(true);
    }
  });

  it('standalone pattern has no duplicate filenames', () => {
    const standalonePattern = patterns.find((p) => !p.endsWith('/**'))!;
    const inner = standalonePattern.slice(4, -1); // strip "**/{" and "}"
    const names = inner.split(',');
    expect(names.length).toBe(new Set(names).size);
  });

  it('directory pattern has no duplicate directory names', () => {
    const dirPattern = patterns.find((p) => p.endsWith('/**'))!;
    const inner = dirPattern.slice(4, -4); // strip "**/{" and "}/**"
    const names = inner.split(',');
    expect(names.length).toBe(new Set(names).size);
  });
});
