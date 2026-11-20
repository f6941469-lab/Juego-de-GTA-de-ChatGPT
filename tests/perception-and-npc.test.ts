import { describe, expect, it } from 'vitest'
import { createNpcBrain, stepNpcBrain } from '../src/ai/npc/npc-brain'
import { createNpcIdentity } from '../src/ai/npc/profiles'
import { createObserverState, evaluatePerception } from '../src/ai/perception'
import { WorldEventBus } from '../src/core/events'
import type { StaticBox } from '../src/physics/physics'
import { SpatialBoxGrid } from '../src/physics/spatial-index'
import { EntityRegistry } from '../src/simulation/entities'

describe('NPC perception system', () => {
  it('blocks visual sight behind walls, requires recognition accumulation, and attenuates muffled sounds', () => {
    const wall: StaticBox = { x: 10, y: 2, z: 0, halfX: 1, halfY: 2, halfZ: 8 }
    const spatial = new SpatialBoxGrid([wall])
    const entities = new EntityRegistry()
    const events = new WorldEventBus()

    entities.upsert({
      id: 'player', kind: 'player', position: { x: 18, y: 0, z: 0 },
      heading: 0, velocity: { x: 0, z: 0 }, radius: 0.4, active: true, tier: 'high', threatLevel: 0.9,
    })
    entities.updateSpatialAndTiers(0, 0)

    // Observer behind the wall facing +X (heading = +PI/2)
    const behindWall = createObserverState('obs-1', 0, 0, Math.PI / 2)
    const blockedFrame = evaluatePerception(behindWall, 0.2, entities, events, spatial)
    expect(blockedFrame.visualTargets).toHaveLength(0)

    // Gunshot behind the wall is still heard muffled (intensity 1.0 * falloff * 0.42)
    events.emit({
      type: 'gunshot_fired', sourceId: 'player',
      position: { x: 18, y: 1, z: 0 }, intensity: 1, radius: 60, severity: 4, visual: true, auditory: true,
    })
    const heardFrame = evaluatePerception(behindWall, 0.05, entities, events, spatial)
    expect(heardFrame.auditoryEvents).toHaveLength(1)
    expect(heardFrame.auditoryEvents[0].occluded).toBe(true)

    // Clear line of sight requires sustained time to confirm recognition (prevents accidental flick triggers)
    const openObserver = createObserverState('obs-2', 12, 0, Math.PI / 2)
    const firstGlimpse = evaluatePerception(openObserver, 0.05, entities, events, spatial)
    expect(firstGlimpse.visualTargets[0].confirmed).toBe(false)

    const confirmed = evaluatePerception(openObserver, 0.45, entities, events, spatial)
    expect(confirmed.visualTargets[0].confirmed).toBe(true)
    expect(confirmed.highestThreat).toBeGreaterThan(0.5)
  })
})

describe('NPC personality and emotional decision system', () => {
  it('produces distinct coherent responses across nervous, curious, aggressive, and merchant profiles', () => {
    const spatial = new SpatialBoxGrid([])
    const entities = new EntityRegistry()
    const events = new WorldEventBus()

    entities.upsert({
      id: 'player', kind: 'player', position: { x: 0, y: 0, z: -8 },
      heading: 0, velocity: { x: 0, z: 0 }, radius: 0.4, active: true, tier: 'high', threatLevel: 0.95,
    })
    entities.updateSpatialAndTiers(0, 0)

    const runProfile = (role: 'nervous_civilian' | 'curious_civilian' | 'aggressive_civilian' | 'merchant', threatEvents: boolean) => {
      const id = createNpcIdentity(42, role, 1)
      const brain = createNpcBrain(id)
      const observer = createObserverState(id.id, 0, 0, 0)
      if (threatEvents) {
        events.emit({
          type: 'robbery_started', sourceId: 'player',
          position: { x: 0, y: 1, z: -6 }, intensity: 0.9, radius: 30, severity: 2, visual: true, auditory: true,
        })
      }
      for (let i = 0; i < 8; i++) {
        events.advance(0.25)
        const perception = evaluatePerception(observer, 0.25, entities, events, spatial)
        if (!threatEvents) perception.highestThreat = 0.28 // Mild curiosity stimulus without high fear
        stepNpcBrain(brain, 0.25, {
          simTime: events.time,
          perception,
          escapeAvailable: true,
          shelterAvailable: true,
          policeNearby: false,
          witnessesNearby: 1,
        })
      }
      return brain
    }

    const nervous = runProfile('nervous_civilian', true)
    expect(['fleeing', 'panicking', 'alarmed', 'scared']).toContain(nervous.state)
    expect(nervous.intent).toBe('flee')

    const aggressive = runProfile('aggressive_civilian', true)
    expect(aggressive.state).toBe('aggressive')
    expect(aggressive.intent).toBe('confront')

    const merchant = runProfile('merchant', true)
    expect(['cooperating', 'calling_help', 'seeking_cover', 'fleeing']).toContain(merchant.state)

    // Curious civilian observing a moderate incident with low fear records it
    events.reset()
    entities.upsert({
      id: 'player', kind: 'player', position: { x: 0, y: 0, z: -18 },
      heading: 0, velocity: { x: 0, z: 0 }, radius: 0.4, active: true, tier: 'high', threatLevel: 0.15,
    })
    events.emit({
      type: 'vehicle_collision', sourceId: 'car-1',
      position: { x: 0, y: 0.8, z: -12 }, intensity: 0.6, radius: 35, severity: 1, visual: true, auditory: true,
    })
    const curious = runProfile('curious_civilian', false)
    expect(['recording', 'curious']).toContain(curious.state)
  })
})
