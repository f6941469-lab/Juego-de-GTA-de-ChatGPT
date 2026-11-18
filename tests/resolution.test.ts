import { describe, expect, it } from 'vitest'
import { createFrameBudget } from '../src/renderer/resolution'

describe('resolución adaptativa', () => {
  it('baja escala con carga sostenida y la restaura con varios segundos estables', () => {
    const budget = createFrameBudget()
    let time = 0
    for (let i = 0; i < 50; i++) budget.sample(time += 31, true)
    expect(budget.scale).toBeLessThan(1)
    for (let i = 0; i < 460; i++) budget.sample(time += 14, true)
    expect(budget.scale).toBe(1)
  })

  it('descarta las pausas del navegador y los cuadros fuera de la partida', () => {
    const budget = createFrameBudget()
    budget.sample(0, true)
    budget.sample(1300, true)
    for (let time = 1330; time < 9000; time += 30) budget.sample(time, false)
    expect(budget.scale).toBe(1)
    expect(budget.average).toBeNull()
  })
})
