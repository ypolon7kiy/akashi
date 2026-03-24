/**
 * Indexed sources: each row is tagged by preset (who discovered it), category (artifact role),
 * and locality (project vs user-home). The same filesystem `path` may appear in multiple rows when
 * it matches more than one preset (e.g. overlapping globs); rows are distinguished by `id`.
 */

import {
  SIDEBAR_SOURCE_CATEGORY_KEYS,
  type SidebarSourceCategoryKey,
} from '../../../shared/sourceCategoryKeys';

/** Same ordered set as `SIDEBAR_SOURCE_CATEGORY_KEYS` / `akashi.sidebar.fileColors` / graph category ids. */
export const SOURCE_CATEGORIES = SIDEBAR_SOURCE_CATEGORY_KEYS;

export type SourceCategory = SidebarSourceCategoryKey;

export const SourceScope = {
  Workspace: 'workspace',
  File: 'file',
  User: 'user',
} as const;

export type SourceScope = (typeof SourceScope)[keyof typeof SourceScope];

export const SourceTagType = {
  Preset: 'preset',
  Category: 'category',
  Locality: 'locality',
} as const;

export type SourceTagType = (typeof SourceTagType)[keyof typeof SourceTagType];

export interface SourceFacetTag {
  readonly type: SourceTagType;
  readonly value: string;
}

/** One indexed source path: catalog entry only (no file body read into the index). */
export interface IndexedSourceEntry {
  /** Stable row id (`sourceRecordId` in `shared/sourceRecordId`); same `path` may appear on multiple rows. */
  id: string;
  path: string;
  /** Preset that owns the discovery rule for this path. */
  preset: string;
  category: SourceCategory;
  scope: SourceScope;
  origin: 'workspace' | 'user';
  /** Facet tags: locality, category, preset (see `sourceTags.ts`). */
  tags: readonly SourceFacetTag[];
  metadata: {
    byteLength: number;
    updatedAt: string;
  };
}

export interface SourceIndexSnapshot {
  generatedAt: string;
  sourceCount: number;
  records: IndexedSourceEntry[];
}
