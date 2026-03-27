/**
 * File-based reader/writer for akashi-meta.json at both locality scopes.
 *
 * Workspace: `<workspaceRoot>/.claude/akashi-meta.json`
 * User:      `<userRoot>/akashi-meta.json`   (userRoot is typically `~/.claude`)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { SourceLocality } from '../../sources/domain/artifactKind';
import { type AkashiMeta, parseAkashiMeta } from '../domain/akashiMeta';

const META_FILENAME = 'akashi-meta.json';

function resolvePath(locality: SourceLocality, workspaceRoot: string, userRoot: string): string {
  if (locality === 'workspace') {
    return join(workspaceRoot, '.claude', META_FILENAME);
  }
  return join(userRoot, META_FILENAME);
}

export class AkashiMetaFileStore {
  readMeta(locality: SourceLocality, workspaceRoot: string, userRoot: string): AkashiMeta {
    const filePath = resolvePath(locality, workspaceRoot, userRoot);
    try {
      const content = readFileSync(filePath, 'utf-8');
      return parseAkashiMeta(JSON.parse(content));
    } catch {
      return parseAkashiMeta(undefined);
    }
  }

  async writeMeta(
    locality: SourceLocality,
    workspaceRoot: string,
    userRoot: string,
    meta: AkashiMeta
  ): Promise<void> {
    const filePath = resolvePath(locality, workspaceRoot, userRoot);
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify(meta, null, 2), 'utf-8');
  }
}
