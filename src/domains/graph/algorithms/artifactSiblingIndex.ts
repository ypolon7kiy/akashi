import type { GraphNode3D } from '../domain/graphTypes';

export interface ArtifactSiblingIndex {
  /** nodeId → sibling nodeIds that share the same graphArtifactId but sit in a different category. */
  readonly crossCategorySiblings: ReadonlyMap<string, readonly string[]>;
}

/**
 * Build a cross-category artifact sibling index from graph nodes.
 *
 * Only `note`-type nodes with a `graphArtifactId` are considered.
 * A node appears in the index only when at least one sibling sits in
 * a different `graphCategoryId` (i.e. cross-branch in the hierarchy).
 */
export function buildArtifactSiblingIndex(
  nodes: readonly GraphNode3D[],
): ArtifactSiblingIndex {
  // Group note-type nodes by graphArtifactId.
  const byArtifact = new Map<string, GraphNode3D[]>();
  for (const n of nodes) {
    if (n.type !== 'note' || !n.graphArtifactId) {
      continue;
    }
    let arr = byArtifact.get(n.graphArtifactId);
    if (!arr) {
      arr = [];
      byArtifact.set(n.graphArtifactId, arr);
    }
    arr.push(n);
  }

  const map = new Map<string, readonly string[]>();

  for (const [, members] of byArtifact) {
    if (members.length < 2) {
      continue;
    }
    // Check whether members span more than one category.
    const categories = new Set(members.map((m) => m.graphCategoryId));
    if (categories.size < 2) {
      continue;
    }
    // Each member gets siblings = all other members.
    for (const m of members) {
      const siblings = members.filter((s) => s.id !== m.id).map((s) => s.id);
      map.set(m.id, siblings);
    }
  }

  return { crossCategorySiblings: map };
}
