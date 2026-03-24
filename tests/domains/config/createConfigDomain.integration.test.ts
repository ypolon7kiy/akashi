import { describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';

const hoisted = vi.hoisted(() => ({
  configListener: null as null | ((e: vscode.ConfigurationChangeEvent) => void),
}));

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: () => ({
      inspect: (): undefined => undefined,
      get: (): undefined => undefined,
    }),
    onDidChangeConfiguration: (cb: (e: vscode.ConfigurationChangeEvent) => void) => {
      hoisted.configListener = cb;
      return { dispose: vi.fn() };
    },
  },
}));

import { createConfigDomain } from '@src/domains/config/createConfigDomain';

describe('createConfigDomain (integration)', () => {
  it('invokes indexing callbacks when change affects akashi.presets', async () => {
    const subscriptions: { dispose: () => void }[] = [];
    const domain = createConfigDomain({ subscriptions } as vscode.ExtensionContext);
    const indexingSpy = vi.fn();
    domain.onIndexingSettingsChanged(async () => {
      indexingSpy();
    });

    expect(hoisted.configListener).toBeTypeOf('function');

    hoisted.configListener!({
      affectsConfiguration: (section: string) => section === 'akashi.presets',
    });

    expect(indexingSpy).toHaveBeenCalledTimes(1);
  });

  it('does not invoke indexing callbacks when change is unrelated', () => {
    const subscriptions: { dispose: () => void }[] = [];
    const domain = createConfigDomain({ subscriptions } as vscode.ExtensionContext);
    const indexingSpy = vi.fn();
    domain.onIndexingSettingsChanged(async () => {
      indexingSpy();
    });

    hoisted.configListener!({
      affectsConfiguration: (section: string) => section === 'editor.fontSize',
    });

    expect(indexingSpy).not.toHaveBeenCalled();
  });
});
