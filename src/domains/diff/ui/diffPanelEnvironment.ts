import type { DiffResult, DiffTarget } from '../domain/model';

/** Dependency-injection interface for the DiffPanel — no vscode imports allowed. */
export interface DiffPanelEnvironment {
  getDiff: (target: DiffTarget) => Promise<DiffResult>;
}
