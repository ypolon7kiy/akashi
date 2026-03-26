import { describe, expect, it } from 'vitest';
import { parseGitignorePatterns } from '@src/domains/config/domain/parseGitignorePatterns';

describe('parseGitignorePatterns', () => {
  it('returns empty array for empty content', () => {
    expect(parseGitignorePatterns('')).toEqual([]);
  });

  it('returns empty array for whitespace-only content', () => {
    expect(parseGitignorePatterns('   \n   \n  ')).toEqual([]);
  });

  it('skips comment lines', () => {
    const content = '# This is a comment\nnode_modules\n# Another comment';
    expect(parseGitignorePatterns(content)).toEqual(['node_modules']);
  });

  it('strips trailing slashes', () => {
    const content = 'dist/\nbuild/';
    expect(parseGitignorePatterns(content)).toEqual(['dist', 'build']);
  });

  it('skips negation patterns', () => {
    const content = 'node_modules\n!important\ndist';
    expect(parseGitignorePatterns(content)).toEqual(['node_modules', 'dist']);
  });

  it('skips patterns with internal path separators', () => {
    const content = 'node_modules\nfoo/bar\ndist\nsome/deep/path';
    expect(parseGitignorePatterns(content)).toEqual(['node_modules', 'dist']);
  });

  it('trims whitespace from each line', () => {
    const content = '  node_modules  \n  dist  ';
    expect(parseGitignorePatterns(content)).toEqual(['node_modules', 'dist']);
  });

  it('preserves glob patterns without path separators', () => {
    const content = '*.log\n*.vsix\nnode_modules';
    expect(parseGitignorePatterns(content)).toEqual(['*.log', '*.vsix', 'node_modules']);
  });

  it('handles a realistic .gitignore file', () => {
    const content = [
      '# Dependencies',
      'node_modules',
      '',
      '# Build output',
      'dist/',
      'out/',
      '',
      '# Test artifacts',
      '.vscode-test',
      '*.vsix',
      '*.log',
      '',
      '# Negate a specific file',
      '!keep-this.log',
    ].join('\n');

    expect(parseGitignorePatterns(content)).toEqual([
      'node_modules',
      'dist',
      'out',
      '.vscode-test',
      '*.vsix',
      '*.log',
    ]);
  });

  it('skips lines that become empty after stripping trailing slash', () => {
    const content = '/\nnode_modules';
    // '/' stripped becomes '' which includes a '/' so it's skipped, plus it becomes empty
    expect(parseGitignorePatterns(content)).toEqual(['node_modules']);
  });
});
