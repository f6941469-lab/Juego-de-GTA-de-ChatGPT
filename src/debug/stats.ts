import type { WebGLRenderer } from 'three'

export class FrameStats {
  private time = 0
  private renderTime = 0
  private frames = 0
  private simulationTime = 0

  sample(dt: number, renderTimeMs: number, renderer: WebGLRenderer, colliders: number, characters = 1, simulationMs = 0): string | undefined {
    this.time += dt
    this.renderTime += renderTimeMs
    this.simulationTime += simulationMs
    this.frames++
    if (this.time < 0.3) return undefined
    const { calls, triangles } = renderer.info.render
    const result = [
      `${Math.round(this.frames / this.time)} FPS`,
      `${(this.renderTime / this.frames).toFixed(2)} ms render (CPU)`,
      `${calls.toLocaleString('es')} llamadas · ${triangles.toLocaleString('es')} triángulos`,
      `${(this.simulationTime / this.frames).toFixed(2)} ms simulación (CPU)`,
      `${characters} personajes · ${colliders} colisionadores`,
    ].join('\n')
    this.time = this.renderTime = this.simulationTime = this.frames = 0
    return result
  }
}
