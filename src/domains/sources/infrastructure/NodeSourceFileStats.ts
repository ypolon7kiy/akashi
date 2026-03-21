import * as fs from 'node:fs/promises';
import { appendLine } from '../../../log';
import type { SourceFileStatsPort } from '../application/ports';

export class NodeSourceFileStats implements SourceFileStatsPort {
  public async statFile(path: string): Promise<{ byteLength: number; updatedAt: string }> {
    try {
      const st = await fs.stat(path);
      return {
        byteLength: st.size,
        updatedAt: st.mtime.toISOString(),
      };
    } catch (err) {
      const code =
        err && typeof err === 'object' && 'code' in err
          ? String((err as NodeJS.ErrnoException).code)
          : 'unknown';
      appendLine(`[Akashi][Sources] statFile failed errno=${code}`);
      return { byteLength: 0, updatedAt: new Date(0).toISOString() };
    }
  }
}
