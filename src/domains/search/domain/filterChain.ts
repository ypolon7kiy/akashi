import type { SourceDescriptor } from '../../../shared/types/sourcesSnapshotPayload';

/**
 * A filter step is a pure function: takes records, returns a subset.
 * Each step narrows the result of the previous step in the chain.
 */
export type SourceFilterStep = (
  records: readonly SourceDescriptor[],
) => readonly SourceDescriptor[];

/**
 * Runs a chain of filter steps sequentially, each narrowing the result.
 * With zero steps, returns the input unchanged.
 */
export function applyFilterChain(
  records: readonly SourceDescriptor[],
  steps: readonly SourceFilterStep[],
): readonly SourceDescriptor[] {
  let result: readonly SourceDescriptor[] = records;
  for (const step of steps) {
    result = step(result);
  }
  return result;
}
