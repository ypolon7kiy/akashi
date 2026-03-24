import type { SourcePresetId } from '../../../shared/sourcePresetId';
import type { SourceCategory } from './model';

// ---------------------------------------------------------------------------
// R1 — Canonical locality and artifact kind
// ---------------------------------------------------------------------------

/** Canonical locality discriminator: workspace-local vs user-home. */
export type SourceLocality = 'workspace' | 'user';

/**
 * The three dimensions shared by discovered entries and creation blueprints.
 * Both `IndexedSourceEntry` and `ArtifactCreator` satisfy this shape.
 */
export interface ArtifactKind {
  readonly presetId: SourcePresetId;
  readonly category: SourceCategory;
  readonly locality: SourceLocality;
}

// ---------------------------------------------------------------------------
// R2 — Typed artifact creator id
// ---------------------------------------------------------------------------

/**
 * Compile-time validated creator id: `"<presetId>/<segment>/<locality>"`.
 *
 * The middle segment is `string` (not `SourceCategory`) because some existing
 * ids use non-category values (e.g. `claude-md`, `hook-config`, `agents-md-fixed`).
 * The {@link buildArtifactCreatorId} builder enforces `SourceCategory` for new
 * conforming creators.
 */
export type ArtifactCreatorId = `${SourcePresetId}/${string}/${SourceLocality}`;

/** Build a creator id from typed component parts. */
export function buildArtifactCreatorId(
  presetId: SourcePresetId,
  category: SourceCategory,
  locality: SourceLocality,
): ArtifactCreatorId {
  return `${presetId}/${category}/${locality}`;
}
