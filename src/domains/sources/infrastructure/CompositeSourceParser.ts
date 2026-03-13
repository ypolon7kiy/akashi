import type { SourceParserPort } from '../application/ports';
import type { SourceDocument, SourceRecord } from '../domain/model';
import { SourceKind } from '../domain/model';

const structuredConfigKinds: ReadonlySet<SourceKind> = new Set([
  SourceKind.CursorMcpJson,
  SourceKind.CodexConfigToml,
]);

/**
 * Routes each {@link SourceDocument} to a concrete parser by `kind`.
 * Reading bytes from disk stays in {@link SourceReaderPort} — this only shapes text already in `document.raw`.
 */
export class CompositeSourceParser implements SourceParserPort {
  public constructor(
    private readonly lineBased: SourceParserPort,
    private readonly singleBlock: SourceParserPort
  ) {}

  public parse(document: SourceDocument): SourceRecord {
    if (structuredConfigKinds.has(document.kind)) {
      return this.singleBlock.parse(document);
    }
    return this.lineBased.parse(document);
  }
}
