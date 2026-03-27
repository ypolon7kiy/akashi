import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AkashiMetaFileStore } from '@src/domains/addons/infrastructure/AkashiMetaFileStore';
import { addEntry, emptyMeta } from '@src/domains/addons/domain/akashiMeta';

let tempDir: string;
let store: AkashiMetaFileStore;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'akashi-meta-test-'));
  store = new AkashiMetaFileStore();
});

afterEach(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

// workspace meta goes to <wsRoot>/.claude/akashi-meta.json
// user meta goes to <userRoot>/akashi-meta.json

const wsRoot = () => tempDir;
const userRoot = () => join(tempDir, 'user-claude');

describe('AkashiMetaFileStore', () => {
  it('returns emptyMeta when file does not exist', () => {
    const meta = store.readMeta('workspace', wsRoot(), userRoot());
    expect(meta).toEqual(emptyMeta());
  });

  it('round-trips write → read for workspace locality', async () => {
    const meta = addEntry(emptyMeta(), 'claude', {
      name: 'foo',
      category: 'skill',
      originId: 'origin-a',
      version: '1.0.0',
      installedPaths: [],
    });

    await store.writeMeta('workspace', wsRoot(), userRoot(), meta);
    const read = store.readMeta('workspace', wsRoot(), userRoot());

    expect(read.version).toBe(1);
    expect(read.installed.claude).toHaveLength(1);
    expect(read.installed.claude[0].name).toBe('foo');
  });

  it('round-trips write → read for user locality', async () => {
    const meta = addEntry(emptyMeta(), 'claude', {
      name: 'bar',
      category: 'command',
      originId: 'origin-b',
      version: '2.0.0',
      installedPaths: [],
    });

    await store.writeMeta('user', wsRoot(), userRoot(), meta);
    const read = store.readMeta('user', wsRoot(), userRoot());

    expect(read.installed.claude).toHaveLength(1);
    expect(read.installed.claude[0].name).toBe('bar');
  });

  it('returns emptyMeta for corrupt JSON', async () => {
    // Write garbage to the expected path
    const { mkdirSync } = await import('node:fs');
    const dir = join(wsRoot(), '.claude');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'akashi-meta.json'), '{{not valid json', 'utf-8');

    const meta = store.readMeta('workspace', wsRoot(), userRoot());
    expect(meta).toEqual(emptyMeta());
  });

  it('creates parent directories on write', async () => {
    // userRoot doesn't exist yet
    const meta = addEntry(emptyMeta(), 'claude', {
      name: 'baz',
      category: 'skill',
      originId: 'origin-c',
      version: '1.0.0',
      installedPaths: [],
    });

    await store.writeMeta('user', wsRoot(), userRoot(), meta);

    // File should exist and be readable
    const filePath = join(userRoot(), 'akashi-meta.json');
    const content = readFileSync(filePath, 'utf-8');
    expect(JSON.parse(content).version).toBe(1);
  });

  it('workspace and user meta files are independent', async () => {
    const wsMeta = addEntry(emptyMeta(), 'claude', {
      name: 'ws-only',
      category: 'skill',
      originId: 'origin-a',
      version: '1.0.0',
      installedPaths: [],
    });
    const userMeta = addEntry(emptyMeta(), 'claude', {
      name: 'user-only',
      category: 'skill',
      originId: 'origin-b',
      version: '1.0.0',
      installedPaths: [],
    });

    await store.writeMeta('workspace', wsRoot(), userRoot(), wsMeta);
    await store.writeMeta('user', wsRoot(), userRoot(), userMeta);

    const readWs = store.readMeta('workspace', wsRoot(), userRoot());
    const readUser = store.readMeta('user', wsRoot(), userRoot());

    expect(readWs.installed.claude[0].name).toBe('ws-only');
    expect(readUser.installed.claude[0].name).toBe('user-only');
  });
});
