/**
 * U+001F Unit Separator — not used in real file paths; safe delimiter when joining
 * preset / origin / path into a single id or dedupe key.
 */
export const SOURCE_RECORD_ID_FIELD_SEP = '\u001f';

/**
 * Stable unique id for one indexed source row. The same filesystem path may appear
 * in multiple rows when it matches discovery rules for more than one preset.
 * Includes `locality` so workspace vs user rows never collide.
 *
 * Argument order matches the encoded segments: `preset`, `locality`, `filePath`.
 */
export function sourceRecordId(
  preset: string,
  locality: 'workspace' | 'user',
  filePath: string
): string {
  return [preset, locality, filePath].join(SOURCE_RECORD_ID_FIELD_SEP);
}
