import { describe, expect, it } from 'vitest';
import {
  GRAPH_SOURCE_CATEGORY_IDS_FOR_EMPTY_NODES,
  GRAPH_SOURCE_CATEGORY_LABELS,
  labelGraphSourceCategory,
} from '@src/domains/graph/domain/graphSourceCategoryLabels';

describe('graphSourceCategoryLabels', () => {
  it('labelGraphSourceCategory returns mapped label for known ids', () => {
    expect(labelGraphSourceCategory('context')).toBe('Context');
    expect(labelGraphSourceCategory('unknown')).toBe('Other');
  });

  it('labelGraphSourceCategory falls back to the raw id when unmapped', () => {
    expect(labelGraphSourceCategory('futureCategory')).toBe('futureCategory');
  });

  it('GRAPH_SOURCE_CATEGORY_IDS_FOR_EMPTY_NODES excludes unknown', () => {
    expect(GRAPH_SOURCE_CATEGORY_IDS_FOR_EMPTY_NODES).not.toContain('unknown');
    expect(GRAPH_SOURCE_CATEGORY_IDS_FOR_EMPTY_NODES.length).toBe(
      Object.keys(GRAPH_SOURCE_CATEGORY_LABELS).length - 1
    );
  });
});
