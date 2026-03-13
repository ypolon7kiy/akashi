import type * as vscode from 'vscode';
import { SourcesService } from '../application/SourcesService';
import { CompositeSourceParser } from './CompositeSourceParser';
import { LineBasedBlocksParser } from './LineBasedBlocksParser';
import { SingleBlockParser } from './SingleBlockParser';
import { VscodeSourcesLogger } from './VscodeSourcesLogger';
import { VscodeSourceReader } from './VscodeSourceReader';
import { VscodeSourcesSnapshotStore } from './VscodeSourcesSnapshotStore';
import { VscodeWorkspaceSourceScanner } from './VscodeWorkspaceSourceScanner';

export function createSourcesService(context: vscode.ExtensionContext): SourcesService {
  const lineBased = new LineBasedBlocksParser();
  const singleBlock = new SingleBlockParser();
  return new SourcesService(
    new VscodeWorkspaceSourceScanner(),
    new VscodeSourceReader(),
    new CompositeSourceParser(lineBased, singleBlock),
    new VscodeSourcesSnapshotStore(context),
    new VscodeSourcesLogger()
  );
}
