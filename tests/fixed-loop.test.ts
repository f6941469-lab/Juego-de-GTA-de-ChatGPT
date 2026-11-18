import { describe, expect, it } from 'vitest'
import { FixedLoop } from '../src/core/fixed-loop'

describe('fixed simulation clock', () => {
  it('combines partial frames into fixed steps and keeps the remainder for interpolation', () => {
    const loop = new FixedLoop(0.02, 0.1)
    const steps: number[] = []
    const step = (seconds: number) => steps.push(seconds)

    expect(loop.advance(0.01, step)).toBeCloseTo(0.5)
    expect(steps).toHaveLength(0)
    expect(loop.advance(0.055, step)).toBeCloseTo(0.25)
    expect(steps).toEqual([0.02, 0.02, 0.02])
  })

  it('caps catch-up after a suspended frame and discards time on reset', () => {
    const loop = new FixedLoop(0.025, 0.11)
    const steps: number[] = []
    const step = (seconds: number) => steps.push(seconds)

    loop.advance(5, step)
    expect(steps).toHaveLength(4)
    loop.reset()
    expect(loop.advance(0.02, step)).toBeCloseTo(0.8)
    expect(steps).toHaveLength(4)
  })
})
