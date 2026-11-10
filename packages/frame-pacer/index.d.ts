export interface FramePacerOptions {
  /** How many recent animation-frame gaps to take the refresh interval from. Default 30. */
  refreshSamples?: number;
  /** How many recent frame costs to take the pace from. Default 60. */
  costSamples?: number;
  /** The share of recent frames, from 0 to 1, that the pace must fit. Default 0.9. */
  percentile?: number;
  /** Milliseconds added to a frame's cost for handing it to the screen. Default 0.5. */
  handover?: number;
}

export interface FramePacer {
  /** The screen's refresh interval in milliseconds: the shortest recent gap between animation frames. */
  readonly refresh: number;
  /** How many screen refreshes each frame should take, from 1 up. */
  readonly pace: number;
  /** Call once per requestAnimationFrame callback, with its timestamp. */
  tick(now: number): void;
  /** Call when a frame has finished drawing, with what it cost in milliseconds. */
  report(ms: number): void;
  /**
   * Whether a new frame should start now.
   * @param now this callback's timestamp
   * @param lastFrame the timestamp the last frame started at
   * @param maxFps a limit on the frame rate, such as while the animation idles
   */
  due(now: number, lastFrame: number, maxFps?: number): boolean;
  /** Forgets the frame costs. Call after lowering the drawing quality, since the old costs no longer apply. */
  restart(): void;
}

export function createFramePacer(options?: FramePacerOptions): FramePacer;
