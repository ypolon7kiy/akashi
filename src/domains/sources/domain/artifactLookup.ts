/**
 * Lookup helpers for navigating between artifacts and their member entries.
 */

import type { IndexedArtifact } from './artifact';
import type { IndexedSourceEntry } from './model';

/** Minimal shape needed for the record→artifact lookup (works with both domain and DTO types). */
interface ArtifactLike {
  readonly id: string;
  readonly memberRecordIds: readonly string[];
}

/** Maps each member record id to its owning artifact id. */
export function buildRecordToArtifactMap(
  artifacts: readonly ArtifactLike[]
): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const a of artifacts) {
    for (const rid of a.memberRecordIds) {
      map.set(rid, a.id);
    }
  }
  return map;
}

/** Returns all member entries for a given artifact. */
export function getArtifactMembers(
  artifactId: string,
  artifacts: readonly IndexedArtifact[],
  entries: readonly IndexedSourceEntry[]
): readonly IndexedSourceEntry[] {
  const artifact = artifacts.find((a) => a.id === artifactId);
  if (!artifact) return [];
  const memberSet = new Set(artifact.memberRecordIds);
  return entries.filter((e) => memberSet.has(e.id));
}
