/**
 * Type-safe bridge to the VS Code extension host from the webview.
 * Use acquireVsCodeApi() once and then postMessage.
 */

export interface VscodeApi {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VscodeApi;
  }
}

export function getVscodeApi(): VscodeApi | undefined {
  if (cachedVscodeApi) {
    return cachedVscodeApi;
  }
  if (typeof window.acquireVsCodeApi !== 'function') {
    return undefined;
  }
  // VS Code allows acquiring the API only once per webview session.
  cachedVscodeApi = window.acquireVsCodeApi();
  return cachedVscodeApi;
}

let cachedVscodeApi: VscodeApi | undefined;

interface CorrelatedResponse {
  requestId?: string;
}

/** RFC 4122 UUID v4 for correlating webview ↔ host request/response pairs. */
export function newRequestId(): string {
  const c = globalThis.crypto;
  if (!c || typeof c.randomUUID !== 'function') {
    throw new Error('Akashi: crypto.randomUUID is not available in this webview');
  }
  return c.randomUUID();
}

export function postRequest<TResponse extends CorrelatedResponse>(
  vscode: VscodeApi,
  message: { type: string; payload?: unknown },
  responseType: string,
  timeoutMs = 8000
): Promise<TResponse> {
  const requestId = newRequestId();
  const outbound = { ...message, requestId };

  return new Promise<TResponse>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      reject(new Error(`Request timed out: ${message.type}`));
    }, timeoutMs);

    const onMessage = (event: MessageEvent<unknown>): void => {
      const incoming = event.data as { type?: string; requestId?: string };
      if (incoming?.type !== responseType || incoming.requestId !== requestId) {
        return;
      }
      window.clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
      resolve(event.data as TResponse);
    };

    window.addEventListener('message', onMessage);
    vscode.postMessage(outbound);
  });
}
