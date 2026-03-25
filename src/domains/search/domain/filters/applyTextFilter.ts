import type { SourceFilterStep } from '../filterChain';

/**
 * Creates a filter step that restricts records by case-insensitive path substring match.
 * Empty text passes all records through unchanged.
 */
export function applyTextFilter(text: string): SourceFilterStep {
  return (records) => {
    if (text === '') return records;
    const lower = text.toLowerCase();
    return records.filter((r) => r.path.toLowerCase().includes(lower));
  };
}
