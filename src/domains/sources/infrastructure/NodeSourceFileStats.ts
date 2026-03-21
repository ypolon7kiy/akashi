import * as fs from 'node:fs/promises';
import type { SourceFileStatsPort } from '../application/ports';

export class NodeSourceFileStats implements SourceFileStatsPort {
  public async statFile(path: string): Promise<{ byteLength: number; updatedAt: string }> {
    try {
      const st = await fs.stat(path);
      return {
        byteLength: st.size,
        updatedAt: st.mtime.toISOString(),
      };
    } catch {
      return { byteLength: 0, updatedAt: new Date(0).toISOString() };
    }
  }
}
