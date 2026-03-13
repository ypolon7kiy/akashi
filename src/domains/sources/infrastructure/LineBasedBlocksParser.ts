import type { SourceParserPort } from '../application/ports';
import type { NormalizedBlock, SourceDocument, SourceRecord } from '../domain/model';

/**
 * Splits non-empty trimmed lines into blocks — good for markdown / rules text.
 * Not AGENTS-specific; used for most instruction-like sources.
 */
export class LineBasedBlocksParser implements SourceParserPort {
  public parse(document: SourceDocument): SourceRecord {
    const lines = document.raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const blocks: NormalizedBlock[] = lines.map((line, index) => ({
      id: `${document.id}#${index + 1}`,
      text: line,
    }));

    return {
      document,
      blocks,
      metadata: {
        byteLength: Buffer.byteLength(document.raw, 'utf8'),
        updatedAt: new Date().toISOString(),
      },
    };
  }
}
