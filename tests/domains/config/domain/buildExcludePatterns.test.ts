import { describe, expect, it } from 'vitest';
import { buildResolvedExcludePatterns } from '@src/domains/config/domain/buildExcludePatterns';

describe('buildResolvedExcludePatterns', () => {
  it('always includes .git in homeScanSkipDirNames even with empty input', () => {
    const result = buildResolvedExcludePatterns([]);
    expect(result.homeScanSkipDirNames.has('.git')).toBe(true);
  });

  it('always includes .git in the findFiles glob', () => {
    const result = buildResolvedExcludePatterns([]);
    expect(result.findFilesExcludeGlob).toContain('.git');
  });

  it('produces correct glob for a single directory name', () => {
    const result = buildResolvedExcludePatterns(['node_modules']);
    // Should produce **/{.git,node_modules}/** (sorted)
    expect(result.findFilesExcludeGlob).toBe('**/{.git,node_modules}/**');
  });

  it('produces correct brace-expanded glob for multiple directory names', () => {
    const result = buildResolvedExcludePatterns(['node_modules', 'dist', 'out']);
    // .git is always added, all sorted
    expect(result.findFilesExcludeGlob).toBe('**/{.git,dist,node_modules,out}/**');
  });

  it('includes directory names in homeScanSkipDirNames', () => {
    const result = buildResolvedExcludePatterns(['node_modules', 'dist']);
    expect(result.homeScanSkipDirNames).toEqual(new Set(['.git', 'node_modules', 'dist']));
  });

  it('does not include glob patterns in homeScanSkipDirNames', () => {
    const result = buildResolvedExcludePatterns(['node_modules', '*.log', '*.vsix']);
    expect(result.homeScanSkipDirNames).toEqual(new Set(['.git', 'node_modules']));
    expect(result.homeScanSkipDirNames.has('*.log')).toBe(false);
  });

  it('includes glob patterns in findFilesExcludeGlob', () => {
    const result = buildResolvedExcludePatterns(['node_modules', '*.log']);
    expect(result.findFilesExcludeGlob).toContain('*.log');
  });

  it('deduplicates .git if explicitly provided', () => {
    const result = buildResolvedExcludePatterns(['.git', 'dist']);
    const dirNames = [...result.homeScanSkipDirNames];
    const gitCount = dirNames.filter((n) => n === '.git').length;
    expect(gitCount).toBe(1);
  });

  it('handles only .git with no additional patterns', () => {
    const result = buildResolvedExcludePatterns([]);
    expect(result.findFilesExcludeGlob).toBe('**/.git/**');
    expect(result.homeScanSkipDirNames).toEqual(new Set(['.git']));
  });

  it('handles question mark glob metacharacter', () => {
    const result = buildResolvedExcludePatterns(['temp?']);
    // temp? contains ?, so treated as glob pattern — not in homeScanSkipDirNames
    expect(result.homeScanSkipDirNames.has('temp?')).toBe(false);
    expect(result.findFilesExcludeGlob).toContain('temp?');
  });
});
