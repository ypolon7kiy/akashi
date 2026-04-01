import { useCallback, useEffect, useState } from 'react';
import { getVscodeApi } from '../../../../../webview-shared/api';
import { DiffMessageType } from '../messages';
import type { DiffResult, DiffOutputFormat, DiffTarget } from '../../../domain/model';

export function useDiffState() {
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<DiffOutputFormat>('line-by-line');
  const [activeTarget, setActiveTarget] = useState<DiffTarget['kind']>('working');

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      const message = event.data as { type?: string; payload?: unknown };
      if (message?.type === DiffMessageType.DiffData) {
        setDiffResult(message.payload as DiffResult);
        setError(null);
      }
      if (message?.type === DiffMessageType.DiffError) {
        const p = message.payload as { error?: string } | undefined;
        setError(p?.error ?? 'Unknown error');
      }
    };

    window.addEventListener('message', onMessage);

    const vscodeApi = getVscodeApi();
    vscodeApi?.postMessage({ type: DiffMessageType.WebviewReady });

    return () => window.removeEventListener('message', onMessage);
  }, []);

  const requestDiff = useCallback((target: DiffTarget) => {
    setActiveTarget(target.kind);
    const vscodeApi = getVscodeApi();
    vscodeApi?.postMessage({
      type: DiffMessageType.RequestDiff,
      payload: { target },
    });
  }, []);

  const refresh = useCallback(() => {
    const vscodeApi = getVscodeApi();
    const target: DiffTarget = activeTarget === 'staged' ? { kind: 'staged' } : { kind: 'working' };
    vscodeApi?.postMessage({
      type: DiffMessageType.RefreshRequest,
      payload: { target },
    });
  }, [activeTarget]);

  const toggleFormat = useCallback(() => {
    setOutputFormat((prev) => (prev === 'line-by-line' ? 'side-by-side' : 'line-by-line'));
  }, []);

  return {
    diffResult,
    error,
    outputFormat,
    activeTarget,
    requestDiff,
    refresh,
    toggleFormat,
    setOutputFormat,
  };
}
