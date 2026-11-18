import { Scene } from 'three'
import { describe, expect, it } from 'vitest'
import { createPolice } from '../src/ai/police/police'
import { buildRoadGraph } from '../src/navigation/road-graph'
import type { StaticBox } from '../src/physics/physics'

const spawn = { x: 0, z: 0, heading: 0, speed: 0 }

function policeAtCrossroads(boxes: readonly StaticBox[]) {
  const graph = buildRoadGraph([
    { x: 60, z: 0, width: 10, depth: 40 },
    { x: 60, z: 0, width: 40, depth: 10 },
  ])
  return createPolice(new Scene(), graph, boxes)
}

const stepSeconds = 1 / 60

describe('detección policial en la simulación', () => {
  it('investiga un incidente y adquiere contacto visual al acercarse el jugador', () => {
    const police = policeAtCrossroads([])
    try {
      police.wanted.report(spawn)
      police.step(stepSeconds, spawn)
      expect(police.units).toHaveLength(1)
      expect(police.wanted.state).toBe('Investigación')

      const player = { ...spawn, x: 33 }
      for (let frame = 0; frame < 18; frame++) police.step(stepSeconds, player)

      expect(police.wanted.state).toBe('Persecución')
      expect(police.wanted.lastKnown).toMatchObject({ x: 33, z: 0 })
    } finally {
      police.reset()
    }
  })

  it('mantiene la última posición conocida si un edificio bloquea la vista', () => {
    const police = policeAtCrossroads([
      { x: 46, y: 3, z: 0, halfX: 1, halfY: 3, halfZ: 4 },
    ])
    try {
      police.wanted.report(spawn)
      police.step(stepSeconds, spawn)
      const player = { ...spawn, x: 33 }
      for (let frame = 0; frame < 18; frame++) police.step(stepSeconds, player)

      expect(police.wanted.state).toBe('Investigación')
      expect(police.wanted.lastKnown).toMatchObject({ x: 0, z: 0 })
      expect(police.takeDetention()).toBe(false)
    } finally {
      police.reset()
    }
  })
})
