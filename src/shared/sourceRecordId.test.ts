import { describe, expect, it } from 'vitest';
import { sourceRecordId } from './sourceRecordId';

describe('sourceRecordId', () => {
  it('differs by preset for same path', () => {
    const p = '/ws/shared.md';
    expect(sourceRecordId('claude', 'workspace', p)).not.toBe(
      sourceRecordId('cursor', 'workspace', p)
    );
  });

  it('differs by origin for same path and preset', () => {
    const p = '/home/.cursor/mcp.json';
    expect(sourceRecordId('cursor', 'workspace', p)).not.toBe(
      sourceRecordId('cursor', 'user', p)
    );
  });

  it('is stable across calls', () => {
    expect(sourceRecordId('codex', 'user', '/a')).toBe(sourceRecordId('codex', 'user', '/a'));
  });
});
