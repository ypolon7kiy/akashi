import * as path from 'node:path';
import type { ArtifactTemplate } from '../domain/artifactTemplate';

export interface ResolveArtifactCreationRequest {
  template: ArtifactTemplate;
  /** User-entered name (no extension). Already validated by the caller; host re-validates. */
  fileName: string;
  /** Absolute target directory, already resolved from `template.targetDirResolver`. */
  resolvedDir: string;
}

export type ResolveArtifactCreationResult =
  | { ok: true; absolutePath: string; content: string }
  | { ok: false; error: string };

/**
 * Derives the absolute file path and initial content from a template and user input.
 * Pure — no file I/O. The host handler performs the actual write after calling this.
 */
export function resolveArtifactCreation(
  req: ResolveArtifactCreationRequest
): ResolveArtifactCreationResult {
  const { template, resolvedDir } = req;
  const name = req.fileName.trim();

  if (!resolvedDir) {
    return { ok: false, error: 'No target directory could be determined.' };
  }
  if (!name) {
    return { ok: false, error: 'Enter a name.' };
  }

  if (template.fixedFileName) {
    // Antigravity-style: user input = folder name, file is always `fixedFileName`.
    const absolutePath = path.join(resolvedDir, name, template.fixedFileName);
    const content =
      typeof template.initialContent === 'function'
        ? template.initialContent(name)
        : template.initialContent;
    return { ok: true, absolutePath, content };
  }

  // Standard case: append extension if missing.
  const withExt =
    template.suggestedExtension && !name.endsWith(template.suggestedExtension)
      ? `${name}${template.suggestedExtension}`
      : name;
  const absolutePath = path.join(resolvedDir, withExt);
  const content =
    typeof template.initialContent === 'function'
      ? template.initialContent(withExt)
      : template.initialContent;
  return { ok: true, absolutePath, content };
}
