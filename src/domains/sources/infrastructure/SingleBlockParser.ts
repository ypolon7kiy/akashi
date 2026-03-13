import type { SourceParserPort } from '../application/ports';
import type { SourceDocument, SourceRecord } from '../domain/model';

/**
 * Keeps the entire file as one normalized block — good for JSON/TOML and other
 * structured configs where line-splitting would distort meaning.
 */
export class SingleBlockParser implements SourceParserPort {
  public parse(document: SourceDocument): SourceRecord {
    return {
      document,
      blocks: [
        {
          id: `${document.id}#1`,
          text: document.raw,
        },
      ],
      metadata: {
        byteLength: Buffer.byteLength(document.raw, 'utf8'),
        updatedAt: new Date().toISOString(),
      },
    };
  }
}
