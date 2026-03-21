export class FrameRateController {
  private static instance: FrameRateController;
  private targetFPS = 30;
  private frameInterval = 1000 / this.targetFPS;
  private lastFrameTime = 0;
  private animationFrameId: number | null = null;
  private isRunning = false;
  private callbacks = new Set<(currentTime: number) => void>();

  // eslint-disable-next-line @typescript-eslint/no-empty-function -- singleton
  private constructor() {}

  public static getInstance(): FrameRateController {
    if (!FrameRateController.instance) {
      FrameRateController.instance = new FrameRateController();
    }
    return FrameRateController.instance;
  }

  public registerCallback(callback: (currentTime: number) => void): () => void {
    this.callbacks.add(callback);
    if (!this.isRunning) {
      this.start();
    }
    return () => {
      this.callbacks.delete(callback);
      if (this.callbacks.size === 0) {
        this.stop();
      }
    };
  }

  private start(): void {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.scheduleNextFrame();
  }

  private stop(): void {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private scheduleNextFrame(): void {
    if (!this.isRunning) {
      return;
    }
    this.animationFrameId = requestAnimationFrame((currentTime) => {
      this.processFrame(currentTime);
    });
  }

  private processFrame(currentTime: number): void {
    if (!this.isRunning) {
      return;
    }
    if (currentTime - this.lastFrameTime >= this.frameInterval) {
      this.lastFrameTime = currentTime;
      this.callbacks.forEach((callback) => {
        try {
          callback(currentTime);
        } catch (e) {
          console.error('FrameRateController callback error', e);
        }
      });
    }
    this.scheduleNextFrame();
  }
}

export const frameRateController = FrameRateController.getInstance();
