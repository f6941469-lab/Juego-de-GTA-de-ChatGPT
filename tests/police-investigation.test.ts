import { InstancedMesh, Scene } from 'three'
import { describe, expect, it } from 'vitest'
import { createPolice } from '../src/ai/police/police'
import { buildRoadGraph } from '../src/navigation/road-graph'
import type { StaticBox } from '../src/physics/physics'

const dt = 1 / 60

function createTestPoliceEnv(boxes: readonly StaticBox[] = []) {
  const scene = new Scene()
  const graph = buildRoadGraph([
    { x: 0, z: 0, width: 140, depth: 12 },
    { x: 0, z: 58, width: 140, depth: 12 },
    { x: 0, z: -58, width: 140, depth: 12 },
    { x: 58, z: 0, width: 12, depth: 140 },
    { x: -58, z: 0, width: 12, depth: 140 },
    { x: 0, z: 0, width: 12, depth: 140 },
  ])
  const police = createPolice(scene, graph, boxes)
  return { scene, police }
}

describe('policía avanzada, instanciación GPU e investigación criminal (Fase 6)', () => {
  it('renderiza múltiples patrullas con InstancedMesh compartido (VB-005) y limpia en dispose()', () => {
    const { scene, police } = createTestPoliceEnv()
    const target = { x: 0, z: 0, heading: 0, speed: 0, inVehicle: false, armed: false }
    try {
      police.wanted.report(target, 5, 5, { kind: 'robbery', storeSiege: true })
      for (let i = 0; i < 90; i++) police.step(dt, target)
      police.render(1, dt, 1.5, 22)

      expect(police.units.length).toBeGreaterThanOrEqual(3)
      const instanced = scene.children.filter((c) => c instanceof InstancedMesh)
      expect(instanced).toHaveLength(4)
      expect(scene.children.filter((c) => c.name === 'Patrulla')).toHaveLength(0)
    } finally {
      police.dispose()
    }
    expect(scene.children.filter((c) => c instanceof InstancedMesh)).toHaveLength(0)
  })

  it('frena ante obstáculos de tráfico civil frente a la patrulla (VB-004)', () => {
    const { police } = createTestPoliceEnv()
    const origin = { x: 0, z: 0, heading: 0, speed: 0 }
    try {
      police.wanted.report(origin)
      police.step(dt, origin)
      const unit = police.units[0]
      expect(unit).toBeDefined()

      // Place a stationary civilian vehicle 3.5 m straight ahead of the patrol heading
      const blocker = {
        x: unit.x + Math.sin(unit.heading) * 3.5,
        z: unit.z - Math.cos(unit.heading) * 3.5,
        radius: 1.9,
      }
      for (let i = 0; i < 45; i++) {
        police.step(dt, origin, undefined, [blocker])
      }
      expect(unit.speed).toBeLessThan(0.5)
    } finally {
      police.dispose()
    }
  })

  it('usa memoria descriptiva del vehículo sin omnisciencia al cambiar de coche fuera de vista', () => {
    const { police } = createTestPoliceEnv()
    const spawn = { x: 0, z: 0, heading: 0, speed: 0 }
    try {
      police.wanted.report(spawn, 2, 2, {
        kind: 'witness',
        suspect: { inVehicle: true, vehicleId: 'rayo-gt', vehicleLabel: 'Rayo GT', armed: false },
      })
      police.step(dt, { ...spawn, inVehicle: true, vehicleId: 'rayo-gt', vehicleLabel: 'Rayo GT', armed: false })
      const unit = police.units[0]
      expect(unit).toBeDefined()

      // Switch to a different civilian vehicle 24 m perpendicular to lastKnown (0, 0) while unit searches toward (0, 0):
      // within 39 m normal sight, outside 16 m suspect-mismatch cap
      const baseTarget = {
        x: 0,
        z: 24,
        heading: 0,
        speed: 0,
        inVehicle: true,
        vehicleId: 'traffic-sedan-3',
        vehicleLabel: 'Vehículo urbano',
        armed: false,
      }
      // Step past Investigation (4s) into Búsqueda keeping 24 m distance from unit
      for (let i = 0; i < 270; i++) {
        police.step(dt, baseTarget)
      }
      expect(police.wanted.state).toBe('Búsqueda')
      expect(police.statusLabel).toBe('Búsqueda · Vehículo distinto')

      // Now face the searching unit at 24 m in the originally fichado Rayo GT -> immediate recognition!
      const dirToUnit = Math.atan2(unit.x - baseTarget.x, -(unit.z - baseTarget.z))
      const knownTarget = {
        ...baseTarget,
        x: unit.x + Math.sin(unit.heading) * 24,
        z: unit.z - Math.cos(unit.heading) * 24,
        heading: dirToUnit,
        vehicleId: 'rayo-gt',
        vehicleLabel: 'Rayo GT',
      }
      for (let i = 0; i < 20; i++) police.step(dt, knownTarget)
      expect(police.wanted.state).toBe('Persecución')
      expect(police.statusLabel).toContain('Rayo GT')
    } finally {
      police.dispose()
    }
  })

  it('despliega cerco en tienda y agentes a pie al llegar cerca de la última posición conocida', () => {
    const { police } = createTestPoliceEnv([
      { x: 18, y: 3, z: -18, halfX: 8, halfY: 3, halfZ: 8 },
    ])
    const storePos = { x: 0, z: 0 }
    try {
      police.wanted.report(storePos, 2, 2, {
        kind: 'robbery',
        storeSiege: true,
        suspect: { inVehicle: false, armed: true },
      })
      // Suspect hiding behind an alleyway building away from the road junctions
      const hidingSuspect = { x: 30, z: -30, heading: 0, speed: 0, inVehicle: false, armed: true }
      police.step(dt, hidingSuspect)
      expect(police.statusLabel).toBe('Cerco en tienda')

      // Let patrol approach the store perimeter around (0, 0) and park + dismount foot officer
      for (let i = 0; i < 420; i++) {
        police.step(dt, hidingSuspect)
      }
      const dismountedUnit = police.units.find((u) => u.dismounted && u.officer.active)
      expect(dismountedUnit).toBeDefined()
    } finally {
      police.dispose()
    }
  })
})
