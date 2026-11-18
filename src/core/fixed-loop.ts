/** Advances the simulation in fixed increments and returns the interpolation fraction. */
export class FixedLoop {
  private pendingSeconds = 0

  constructor(
    private readonly stepSeconds = 1 / 60,
    private readonly maxFrameSeconds = 0.1,
  ) {
    if (!Number.isFinite(stepSeconds) || !Number.isFinite(maxFrameSeconds)
      || stepSeconds <= 0 || maxFrameSeconds <= 0) {
      throw new RangeError('Simulation intervals must be finite and positive')
    }
  }

  advance(frameSeconds: number, step: (dt: number) => void): number {
    if (Number.isFinite(frameSeconds)) {
      this.pendingSeconds += Math.min(Math.max(frameSeconds, 0), this.maxFrameSeconds)
    }
    while (this.pendingSeconds >= this.stepSeconds) {
      step(this.stepSeconds)
      this.pendingSeconds -= this.stepSeconds
    }
    return this.pendingSeconds / this.stepSeconds
  }

  reset(): void {
    this.pendingSeconds = 0
  }
}
