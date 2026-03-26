import * as path from 'node:path';

/** True if `filePath` is `rootDir` or contained in it (normalized). */
export function isUnderRoot(filePath: string, rootDir: string): boolean {
  const rel = path.relative(path.normalize(rootDir), path.normalize(filePath));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}
