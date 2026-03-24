import { describe, expect, it } from 'vitest';
import {
  defaultGraph2DWebviewPersistedState,
  parseGraph2DWebviewPersistedState,
} from '@src/domains/graph/webview/graph2d/graph2dViewSettings';

describe('parseGraph2DWebviewPersistedState', () => {
  it('defaults enabledCategories to null', () => {
    expect(defaultGraph2DWebviewPersistedState().enabledCategories).toBe(null);
  });

  it('parses enabledCategories null as all', () => {
    const d = defaultGraph2DWebviewPersistedState();
    const s = parseGraph2DWebviewPersistedState({ ...d, enabledCategories: null });
    expect(s.enabledCategories).toBe(null);
  });

  it('parses enabledCategories array with dedupe and trim filter', () => {
    const d = defaultGraph2DWebviewPersistedState();
    const s = parseGraph2DWebviewPersistedState({
      ...d,
      enabledCategories: ['context', 'rule', 'context', '  ', 'skill'],
    });
    expect(s.enabledCategories).toEqual(['context', 'rule', 'skill']);
  });

  it('falls back when enabledCategories is invalid', () => {
    const d = defaultGraph2DWebviewPersistedState();
    const s = parseGraph2DWebviewPersistedState({
      ...d,
      enabledCategories: 'nope' as unknown as string[],
    });
    expect(s.enabledCategories).toBe(d.enabledCategories);
  });
});
