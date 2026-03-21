import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

/**
 * VS Code webview panels often report 0×0 or stale canvas size until flex/layout settles.
 * Resize the WebGL drawing buffer when the canvas container changes size.
 */
export function WebGLResizeSync(): null {
  const gl = useThree((s) => s.gl);
  const setSize = useThree((s) => s.setSize);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const canvas = gl.domElement;
    const root = canvas.closest('.akashi-graph-canvas-wrap') ?? canvas.parentElement;
    if (!root) {
      return;
    }
    const apply = (): void => {
      const w = Math.max(1, Math.floor(root.clientWidth));
      const h = Math.max(1, Math.floor(root.clientHeight));
      setSize(w, h, false);
      invalidate();
    };
    apply();
    const ro = new ResizeObserver(() => {
      apply();
    });
    ro.observe(root);
    window.addEventListener('resize', apply);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', apply);
    };
  }, [gl, invalidate, setSize]);

  return null;
}
