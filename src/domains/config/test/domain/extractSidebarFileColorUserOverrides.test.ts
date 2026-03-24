import { describe, expect, it } from 'vitest';
import { extractSidebarFileColorUserOverrides } from '../../domain/extractSidebarFileColorUserOverrides';

describe('extractSidebarFileColorUserOverrides', () => {
  it('merges user layers with workspaceFolder > workspace > global precedence', () => {
    const got = extractSidebarFileColorUserOverrides({
      globalValue: { context: '#111111', rule: '#121212' },
      workspaceValue: { context: '#222222', skill: '#232323' },
      workspaceFolderValue: { context: '#333333', hook: '#343434' },
    });
    expect(got).toEqual({
      context: '#333333',
      rule: '#121212',
      skill: '#232323',
      hook: '#343434',
    });
  });

  it('returns empty when no user layer is a plain object', () => {
    expect(
      extractSidebarFileColorUserOverrides({
        globalValue: undefined,
        workspaceValue: [],
        workspaceFolderValue: 'bad',
      })
    ).toEqual({});
    expect(extractSidebarFileColorUserOverrides(undefined)).toEqual({});
  });
});
