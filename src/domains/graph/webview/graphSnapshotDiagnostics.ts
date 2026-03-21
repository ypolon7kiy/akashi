import { isSourcesSnapshotPayload } from '../../../shared/types/sourcesSnapshotPayload';

export interface SnapshotInboundDiagnostics {
  readonly messageType: string;
  readonly payloadPresent: boolean;
  readonly payloadType: string;
  readonly topLevelKeys: string;
  readonly validationPassed: boolean;
  readonly detailLines: readonly string[];
}

export function diagnoseInboundSnapshotMessage(data: {
  type?: string;
  payload?: unknown;
}): SnapshotInboundDiagnostics {
  const messageType = typeof data?.type === 'string' ? data.type : '(missing type)';
  const p = data?.payload;
  const payloadPresent = p !== undefined;
  const payloadType = p === null ? 'null' : typeof p;
  const topLevelKeys = p !== null && typeof p === 'object' ? Object.keys(p).join(', ') : '—';

  const detailLines: string[] = [];

  if (p === undefined) {
    detailLines.push('payload field is undefined (expected null or object).');
  } else if (p === null) {
    detailLines.push('payload is null — no index yet or empty snapshot from host.');
  } else if (typeof p !== 'object') {
    detailLines.push(`payload must be object, got ${typeof p}.`);
  } else {
    const o = p as Record<string, unknown>;
    if (typeof o.generatedAt !== 'string') {
      detailLines.push(`generatedAt: need string, got ${typeof o.generatedAt}.`);
    }
    if (typeof o.sourceCount !== 'number') {
      detailLines.push(`sourceCount: need number, got ${typeof o.sourceCount}.`);
    }
    if (!Array.isArray(o.records)) {
      detailLines.push(`records: need array, got ${typeof o.records}.`);
    } else {
      detailLines.push(`records.length = ${o.records.length}`);
    }
    if (!Array.isArray(o.workspaceFolders)) {
      detailLines.push(`workspaceFolders: need array, got ${typeof o.workspaceFolders}.`);
    } else {
      detailLines.push(`workspaceFolders.length = ${o.workspaceFolders.length}`);
    }
  }

  const validationPassed = isSourcesSnapshotPayload(p);

  if (!validationPassed && p !== null && p !== undefined && typeof p === 'object') {
    detailLines.push('isSourcesSnapshotPayload returned false — see field checks above.');
  }

  return {
    messageType,
    payloadPresent,
    payloadType,
    topLevelKeys,
    validationPassed,
    detailLines,
  };
}
