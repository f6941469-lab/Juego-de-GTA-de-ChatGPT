import { PerspectiveCamera, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { createPhysics } from '../src/physics/physics';
import { createPlayer, type MovementInput } from '../src/player/player';
import { createSimulationEngine } from '../src/simulation/engine';
import { buildDistrict } from '../src/world/district';
import { storeSpecs } from '../src/world/generation/layout';
import { createStores, getStoreInteriorLayout } from '../src/world/stores';

const dt = 1 / 60;
const idleControls = {
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
  weaponSlot: undefined as 0 | 1 | 2 | undefined,
};
const idleMove: MovementInput = { x: 0, z: 0, run: false, jump: false };

describe('Phase 2 urban life', () => {
  it('allows the player to physically walk inside stores through open doorways up to the counter', async () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera(58, 1, 0.1, 200);
    const district = buildDistrict(scene, 240817);
    const physics = await createPhysics(district.colliders);
    const stores = createStores(scene, storeSpecs);

    try {
      for (const spec of storeSpecs) {
        const interior = getStoreInteriorLayout(spec);
        const player = createPlayer(scene, camera, physics, { x: spec.doorX, y: 0, z: spec.doorZ });

        // Yaw=0 moves toward -Z; walk straight from outside doorway to interior counter
        for (let step = 0; step < 210; step++) {
          const dx = interior.counterFrontX - player.position.x;
          const dz = interior.counterFrontZ - player.position.z;
          const len = Math.hypot(dx, dz);
          if (len < 0.7) break;
          const input: MovementInput = {
            x: dx / len,
            z: -dz / len,
            run: false,
            jump: false,
          };
          player.step(dt, input);
        }

        const movedFromDoor = Math.hypot(player.position.x - spec.doorX, player.position.z - spec.doorZ);
        const distToCounter = Math.hypot(
          player.position.x - interior.counterFrontX,
          player.position.z - interior.counterFrontZ,
        );
        expect(movedFromDoor).toBeGreaterThan(2.0);
        expect(distToCounter).toBeLessThan(1.3);

        expect(stores.findNearby(player.position)?.store.id).toBe(spec.id);
        expect(stores.rob(player.position)?.store.id).toBe(spec.id);
        player.dispose();
      }
    } finally {
      stores.dispose();
      physics.dispose();
      district.dispose();
    }
  });

  it('populates instanced clerks + pedestrians, supports hijacking traffic drivers, and disposes cleanly', async () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera(58, 1, 0.1, 200);
    const district = buildDistrict(scene, 240817);
    const physics = await createPhysics(district.colliders);
    const player = createPlayer(scene, camera, physics, district.spawn);
    const engine = createSimulationEngine(scene, physics, player, district, 240817, 14);

    try {
      // Advance simulation so traffic populates with real drivers and pedestrians populate sidewalks
      for (let i = 0; i < 160; i++) {
        engine.step(dt, idleControls);
      }

      expect(engine.traffic.count).toBeGreaterThan(0);
      expect(engine.traffic.vehicles.every((car) => car.driver.role === 'driver')).toBe(true);
      expect(engine.npcPopulation.count).toBeGreaterThanOrEqual(storeSpecs.length + 5);
      expect(engine.entities.countByKind('npc')).toBe(engine.npcPopulation.count);

      // Move player beside a traffic car and hijack it
      const targetCar = engine.traffic.vehicles[0];
      player.exitVehicle({ x: targetCar.x + 1.5, y: 0, z: targetCar.z }, 0);
      const countBeforeHijack = engine.traffic.count;

      engine.step(dt, { ...idleControls, interact: true });

      expect(engine.driving).toBe(true);
      expect(engine.traffic.count).toBe(countBeforeHijack - 1);
      // Both original Rayo GT and the stolen traffic car coexist physically
      expect(engine.vehicles.all.length).toBe(2);
      // Displaced driver became an active NPC in the world and emitted vehicle_hijacked
      expect(engine.npcPopulation.agents.some((agent) => agent.kind === 'driver_displaced')).toBe(true);
      expect(engine.eventBus.recent(8).some((evt) => evt.type === 'vehicle_hijacked')).toBe(true);

      // Stop and exit stolen car; previous car stays in world
      for (let i = 0; i < 20; i++) {
        engine.step(dt, { ...idleControls, handbrake: true });
      }
      engine.step(dt, { ...idleControls, interact: true });
      expect(engine.driving).toBe(false);
      expect(engine.vehicles.all.length).toBe(2);

      // Step player walking away and check clean reset & dispose
      for (let i = 0; i < 10; i++) {
        engine.step(dt, { ...idleControls, ...idleMove });
      }
      engine.reset();
      expect(engine.vehicles.all.length).toBe(1);
    } finally {
      engine.dispose();
      player.dispose();
      physics.dispose();
      district.dispose();
      expect(scene.children).toHaveLength(0);
    }
  });
});
