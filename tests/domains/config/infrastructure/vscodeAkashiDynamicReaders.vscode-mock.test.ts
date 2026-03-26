import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ALL_SOURCE_PRESET_IDS } from '@src/shared/sourcePresetId';
import { readActiveSourcePresets } from '@src/domains/config/infrastructure/vscodeAkashiPresets';
import { readIncludeHomeConfig } from '@src/domains/config/infrastructure/vscodeAkashiIncludeHome';

const config = new Map<string, unknown>();

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: (section: string) => ({
      get: (key: string) => config.get(`${section}\0${key}`),
    }),
  },
}));

describe('VS Code Akashi dynamic config readers (mocked)', () => {
  beforeEach(() => {
    config.clear();
  });

  afterEach(() => {
    config.clear();
  });

  it('readActiveSourcePresets falls back to first preset when array is empty', () => {
    config.set('akashi\0presets', []);
    const s = readActiveSourcePresets();
    expect(s.size).toBe(1);
    expect(s).toEqual(new Set([ALL_SOURCE_PRESET_IDS[0]]));
  });

  it('readActiveSourcePresets uses valid entries when set', () => {
    config.set('akashi\0presets', ['cursor', 'claude']);
    expect(readActiveSourcePresets()).toEqual(new Set(['cursor', 'claude']));
  });

  it('readActiveSourcePresets drops invalid strings and falls back to first preset when none left', () => {
    config.set('akashi\0presets', ['not-a-preset', '']);
    const s = readActiveSourcePresets();
    expect(s.size).toBe(1);
    expect(s).toEqual(new Set([ALL_SOURCE_PRESET_IDS[0]]));
  });

  it('readIncludeHomeConfig defaults to true when undefined', () => {
    expect(readIncludeHomeConfig()).toBe(true);
  });

  it('readIncludeHomeConfig returns configured value', () => {
    config.set('akashi\0includeHomeConfig', false);
    expect(readIncludeHomeConfig()).toBe(false);
    config.set('akashi\0includeHomeConfig', true);
    expect(readIncludeHomeConfig()).toBe(true);
  });
});
