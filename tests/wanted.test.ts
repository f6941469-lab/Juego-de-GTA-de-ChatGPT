import { describe, expect, it } from 'vitest'
import { createWantedSystem } from '../src/ai/police/wanted'

describe('búsqueda policial', () => {
  it('mantiene la última posición observada al perder contacto', () => {
    const search = createWantedSystem()
    search.report({ x: 0, z: 0 })
    expect(search.state).toBe('Investigación')
    search.step(0.25, { x: 1, z: 2 })
    search.step(0.25, { x: 3, z: 4 })
    expect(search.state).toBe('Persecución')
    expect(search.predicted?.x).toBeGreaterThan(3)
    search.step(2)
    expect(search.state).toBe('Búsqueda')
    expect(search.lastKnown).toEqual({ x: 3, z: 4 })
  })

  it('procesa incidentes repetidos con un intervalo y reduce las estrellas al escapar', () => {
    const search = createWantedSystem()
    search.report({ x: 0, z: 0 }, 2)
    search.report({ x: 0, z: 0 }, 2)
    expect(search.level).toBe(2)
    search.step(3)
    search.report({ x: 0, z: 0 }, 4)
    expect(search.level).toBe(5)
    search.step(23)
    expect(search.level).toBe(4)
    search.step(20)
    search.step(17)
    search.step(14)
    search.step(11)
    expect(search.level).toBe(0)
    expect(search.lastKnown).toBeUndefined()
  })
})
