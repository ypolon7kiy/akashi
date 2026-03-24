/**
 * Minimal stub so Vitest can load extension-host modules that import `vscode`.
 * Interactive methods are no-ops / return undefined.
 */
/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-empty-function -- async shape matches VS Code API */

export const window = {
  showInputBox: async () => undefined,
  showQuickPick: async () => undefined,
  showInformationMessage: async () => undefined,
  showErrorMessage: async () => undefined,
  showWarningMessage: async () => undefined,
  showTextDocument: async () => ({}),
  activeTextEditor: undefined,
};

export const workspace = {
  getWorkspaceFolder: () => undefined,
  workspaceFolders: undefined,
  fs: {
    stat: async () => {
      throw Object.assign(new Error('not found'), { code: 'FileNotFound' });
    },
    readFile: async () => new Uint8Array(),
    writeFile: async () => {},
    createDirectory: async () => {},
  },
  openTextDocument: async () => ({}),
};

export const commands = {
  executeCommand: async () => undefined,
};

export const Uri = {
  file: (p: string) => ({ fsPath: p, scheme: 'file' }),
};

export class FileSystemError extends Error {
  code?: string;
}

export enum ExtensionMode {
  Production = 1,
  Development = 2,
}

export default {
  window,
  workspace,
  commands,
  Uri,
  FileSystemError,
  ExtensionMode,
};
