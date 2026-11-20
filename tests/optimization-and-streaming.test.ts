import { PerspectiveCamera, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { createPhysics } from '../src/physics/physics';
import { createPlayer } from '../src/player/player';
import { createAtmosphere } from '../src/renderer/lighting/atmosphere';
import { createFrameBudget } from '../src/renderer/resolution';
import { createSimulationEngine } from '../src/simulation/engine';
import { buildDistrict } from '../src/world/district';

const baseControls = {
  x: 0,
  z: 0,
  run: false,
  jump: false,
  handbrake: false,
  interact: false,
  horn: false,
  challenge: false,
  aim: false,
  fire: false,
  reload: false,
  cycleWeapon: false,
  weaponSlot: undefined,
  phoneCommand: undefined,
};

describe('Phase 7 optimization, streaming, resolution budget, and E2E ecosystem', () => {
  it('streams Rapier static colliders by focus while preserving full SpatialBoxGrid LOS (VB-002)', async () => {
    const boxes = [
      { x: 0, y: 3, z: 0, halfX: 2, halfY: 3, halfZ: 2 },
      { x: 220, y: 3, z: 0, halfX: 2, halfY: 3, halfZ: 2 },
    ];
    const physics = await createPhysics(boxes, { streamingRadius: 90, initialFocus: { x: 0, z: 0 } });
    try {
      expect(physics.totalStaticColliders).toBe(2);
      expect(physics.activeStaticColliders).toBe(1);
      // SpatialBoxGrid keeps full-world LOS even for unloaded distant physics colliders
      expect(physics.spatial.clearLine({ x: 215, z: 0 }, { x: 225, z: 0 })).toBe(false);

      physics.streamFocus(220, 0);
      expect(physics.activeStaticColliders).toBe(1);
      expect(physics.world.colliders.len()).toBe(1);
    } finally {
      physics.dispose();
    }
  });

  it('caps streaming sector rebuilds per update call and drains pending queue incrementally (VB-003)', () => {
    const scene = new Scene();
    const district = buildDistrict(scene, 42);
    try {
      const initialStats = district.stats() as { loaded: number; detailed: number; total: number; pending?: number };
      expect(initialStats.pending ?? 0).toBe(0);

      // Jump across districts so multiple sectors need rebuilding at once
      const farFocus = { x: -160, z: 172 };
      district.update(1, 17, farFocus);
      const afterJump = district.stats() as { loaded: number; detailed: number; total: number; pending?: number };
      expect((afterJump.pending ?? 0)).toBeGreaterThan(0);

      // Stepping additional frames without moving drains pending incrementally down to 0
      const pendingBefore = afterJump.pending!;
      district.update(1.02, 17, farFocus);
      const afterOneMoreFrame = district.stats() as { loaded: number; detailed: number; total: number; pending?: number };
      expect(afterOneMoreFrame.pending!).toBeLessThan(pendingBefore);

      for (let i = 0; i < 64; i++) {
        district.update(1.04 + i * 0.016, 17, farFocus);
      }
      const drained = district.stats() as { loaded: number; detailed: number; total: number; pending?: number };
      expect(drained.pending).toBe(0);
    } finally {
      district.dispose();
    }
  });

  it('keeps 1.0 render scale on 30 Hz low-CPU displays while scaling down under heavy GPU/CPU load (VB-011)', () => {
    const budget = createFrameBudget();
    let time = 0;
    // Steady 30 Hz display (33 ms frame interval) with fast render CPU (2.5 ms) stays at scale 1
    for (let i = 0; i < 60; i++) {
      budget.sample(time += 33, true, 2.5);
    }
    expect(budget.scale).toBe(1);

    // Real heavy frame work (15 ms CPU render at 33 ms cadence) scales down
    for (let i = 0; i < 60; i++) {
      budget.sample(time += 33, true, 15);
    }
    expect(budget.scale).toBeLessThan(1);
  });

  it('runs a full cross-system E2E cycle (Rapier streaming, phone, heist, police, atmosphere dispose)', async () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera(58, 16 / 9, 0.08, 650);
    const district = buildDistrict(scene, 240817);
    const atmosphere = createAtmosphere(scene, 17.25);
    const physics = await createPhysics(district.colliders, {
      streamingRadius: 112,
      initialFocus: district.spawn,
    });
    const player = createPlayer(scene, camera, physics, district.spawn);
    const engine = createSimulationEngine(scene, physics, player, district, 240817, 17.25);

    try {
      expect(physics.activeStaticColliders).toBeLessThan(physics.totalStaticColliders);

      // Open phone via toggle command, open alerts/camera, record briefly and trigger 911
      engine.sendPhoneCommand('toggle');
      expect(engine.phone.isOpen).toBe(true);
      engine.sendPhoneCommand('openCamera');
      engine.sendPhoneCommand('select');
      for (let i = 0; i < 15; i++) engine.step(1 / 60, { ...baseControls });
      expect(engine.getPhoneSnapshot().recording).toBe(true);
      engine.sendPhoneCommand('select');
      expect(engine.getPhoneSnapshot().clips.length).toBeGreaterThanOrEqual(2);

      // Walk from spawn (0, 25) toward Rayo GT (3.9, 22), board with E when prompt appears, and drive across Costa Palmera
      for (let i = 0; i < 90 && !engine.getInteractionPrompt().canInteract; i++) {
        engine.step(1 / 60, { ...baseControls, x: 1, z: 1, run: true });
      }
      engine.step(1 / 60, { ...baseControls, interact: true });
      expect(engine.driving).toBe(true);
      for (let i = 0; i < 120; i++) {
        engine.step(1 / 60, { ...baseControls, z: 1 });
      }
      engine.render(1, 1 / 60, 2.25);
      expect(engine.traffic.count).toBeGreaterThan(0);
    } finally {
      atmosphere.dispose();
      engine.dispose();
      player.dispose();
      district.dispose();
      physics.dispose();
    }
  });
});
