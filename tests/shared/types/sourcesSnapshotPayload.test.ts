import { describe, expect, it } from 'vitest';
import { isSourcesSnapshotPayload } from '@src/shared/types/sourcesSnapshotPayload';

describe('isSourcesSnapshotPayload', () => {
  it('rejects null, primitives, and arrays', () => {
    expect(isSourcesSnapshotPayload(null)).toBe(false);
    expect(isSourcesSnapshotPayload(undefined)).toBe(false);
    expect(isSourcesSnapshotPayload(0)).toBe(false);
    expect(isSourcesSnapshotPayload('x')).toBe(false);
    expect(isSourcesSnapshotPayload([])).toBe(false);
  });

  it('accepts any plain object (host-trusted shape)', () => {
    expect(isSourcesSnapshotPayload({})).toBe(true);
    expect(
      isSourcesSnapshotPayload({
        generatedAt: 't',
        sourceCount: 0,
        records: [],
        workspaceFolders: [],
      })
    ).toBe(true);
    expect(
      isSourcesSnapshotPayload({
        generatedAt: 'g',
        sourceCount: 0,
        records: 'bad',
        workspaceFolders: [],
      })
    ).toBe(true);
  });
});
