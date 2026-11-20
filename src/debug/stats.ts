import type { WebGLRenderer } from 'three'

export class FrameStats {
  private time = 0
  private renderTime = 0
  private frames = 0

  sample(
    dt: number,
    renderTimeMs: number,
    renderer: WebGLRenderer,
    colliders: number,
    entityCount = 1,
  ): string | undefined {
    this.time += dt
    this.renderTime += renderTimeMs
    this.frames++
    if (this.time < 0.3) return undefined
    const { calls, triangles } = renderer.info.render
    const result = [
      `${Math.round(this.frames / this.time)} FPS`,
      `${(this.renderTime / this.frames).toFixed(2)} ms render (CPU)`,
      `${calls.toLocaleString('es')} llamadas · ${triangles.toLocaleString('es')} triángulos`,
      `${entityCount} entidades · ${colliders} colisionadores`,
    ].join('\n')
    this.time = this.renderTime = this.frames = 0
    return result
  }
}
