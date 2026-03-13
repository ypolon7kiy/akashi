import * as vscode from 'vscode';
import type { SourceReaderPort } from '../application/ports';

export class VscodeSourceReader implements SourceReaderPort {
  public async readUtf8(path: string): Promise<string> {
    const bytes = await vscode.workspace.fs.readFile(vscode.Uri.file(path));
    return Buffer.from(bytes).toString('utf8');
  }
}
