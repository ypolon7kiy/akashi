import { appendLine } from '../../../log';
import type { SourcesLoggerPort } from '../application/ports';

export class VscodeSourcesLogger implements SourcesLoggerPort {
  public info(message: string): void {
    appendLine(message);
  }
}
