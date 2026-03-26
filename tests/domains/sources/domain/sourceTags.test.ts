import { describe, expect, it } from 'vitest';
import { SourceTagType } from '@src/domains/sources/domain/model';
import {
  buildSourceFacetTags,
  SourceCategoryId,
  SourceLocalityTagValue,
} from '@src/domains/sources/domain/sourceTags';

describe('sourceTags', () => {
  it('orders locality, category, preset for workspace', () => {
    const tags = buildSourceFacetTags({
      category: SourceCategoryId.Rule,
      preset: 'cursor',
      locality: 'workspace',
    });
    expect(tags[0]).toEqual({
      type: SourceTagType.Locality,
      value: SourceLocalityTagValue.Project,
    });
    expect(tags[1]).toEqual({ type: SourceTagType.Category, value: SourceCategoryId.Rule });
    expect(tags[2]).toEqual({ type: SourceTagType.Preset, value: 'cursor' });
  });

  it('uses global locality for user locality', () => {
    const tags = buildSourceFacetTags({
      category: SourceCategoryId.Mcp,
      preset: 'cursor',
      locality: 'user',
    });
    expect(tags[0]?.value).toBe(SourceLocalityTagValue.Global);
  });
});
