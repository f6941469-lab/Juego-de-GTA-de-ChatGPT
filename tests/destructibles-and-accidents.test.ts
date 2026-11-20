import { PerspectiveCamera, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { createPhysics } from '../src/physics/physics';
import { createPlayer } from '../src/player/player';
import { createSimulationEngine } from '../src/simulation/engine';
import { buildDistrict } from '../src/world/district';

const dt = 1 / 60;
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
  weaponSlot: undefined as 0 | 1 | 2 | undefined,
};

describe('Phase 4 destructible environment, glass shattering, and traffic accidents', () => {
  it('shatters storefront glass with gunfire, emits glass_broken, intimidates clerk, and bounds debris TTL', async () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera(58, 1, 0.1, 200);
    const district = buildDistrict(scene, 240817);
    const physics = await createPhysics(district.colliders);
    const player = createPlayer(scene, camera, physics, district.spawn);
    const cues: string[] = [];
    const engine = createSimulationEngine(scene, physics, player, district, 240817, 15, {
      onAudioCue: (cue) => cues.push(cue),
    });

    try {
      const glassPane = engine.destructibles.props.find((p) => p.kind === 'store_glass')!;
      expect(glassPane).toBeDefined();
      expect(glassPane.broken).toBe(false);

      // Stand outside Joyería Coral looking straight east (-facing) or perpendicular toward the pane
      const store = district.map.stores!.find((s) => s.id === glassPane.storeId)!;
      const nx = store.facing === 'east' ? 1 : store.facing === 'west' ? -1 : 0;
      const nz = store.facing === 'south' ? 1 : store.facing === 'north' ? -1 : 0;
      const standX = glassPane.x + nx * 2.2;
      const standZ = glassPane.z + nz * 2.2;
      const heading = Math.atan2(glassPane.x - standX, -(glassPane.z - standZ));
      player.exitVehicle({ x: standX, y: 0, z: standZ }, heading);

      engine.step(dt, { ...baseControls, weaponSlot: 1 });
      for (let i = 0; i < 14; i++) engine.step(dt, baseControls);

      engine.step(dt, { ...baseControls, fire: true });

      expect(glassPane.broken).toBe(true);
      expect(engine.destructibles.debrisCount).toBeGreaterThan(0);
      expect(cues).toContain('glass');
      expect(engine.eventBus.recent().some((e) => e.type === 'glass_broken')).toBe(true);

      const clerk = engine.npcPopulation.agents.find((a) => a.kind === 'clerk' && a.home?.storeId === glassPane.storeId);
      expect(clerk?.state).toBe('cooperating');

      // Bounded debris fades and cleans up completely
      for (let i = 0; i < 230; i++) engine.step(dt, baseControls);
      expect(engine.destructibles.debrisCount).toBe(0);
    } finally {
      engine.dispose();
      player.dispose();
      district.dispose();
      physics.dispose();
      expect(scene.children).toHaveLength(0);
    }
  });

  it('removes physical Rapier collider when a street crate or hydrant is destroyed and emits water jet plumes', async () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera(58, 1, 0.1, 200);
    const district = buildDistrict(scene, 240817);
    const physics = await createPhysics(district.colliders);
    const player = createPlayer(scene, camera, physics, district.spawn);
    const cues: string[] = [];
    const engine = createSimulationEngine(scene, physics, player, district, 240817, 15, {
      onAudioCue: (cue) => cues.push(cue),
    });

    try {
      const hydrant = engine.destructibles.props.find((p) => p.kind === 'hydrant')!;
      expect(hydrant).toBeDefined();
      expect(hydrant.collider).toBeDefined();

      // Aim cleanly from sidewalk/road gap toward the hydrant (stand ~3 m south of it)
      const standX = hydrant.x + 1.8;
      const standZ = hydrant.z + 1.8;
      const heading = Math.atan2(hydrant.x - standX, -(hydrant.z - standZ));
      player.exitVehicle({ x: standX, y: 0, z: standZ }, heading);
      engine.step(dt, { ...baseControls, weaponSlot: 2 });
      for (let i = 0; i < 14; i++) engine.step(dt, baseControls);

      engine.step(dt, { ...baseControls, fire: true });
      for (let i = 0; i < 10; i++) engine.step(dt, baseControls);

      expect(hydrant.broken).toBe(true);
      expect(hydrant.collider).toBeUndefined();
      expect(hydrant.waterTimer).toBeGreaterThan(0);
      expect(engine.destructibles.plumeCount).toBeGreaterThan(0);
      expect(cues).toContain('debris');
      expect(engine.eventBus.recent().some((e) => e.type === 'object_destroyed')).toBe(true);
    } finally {
      engine.dispose();
      player.dispose();
      district.dispose();
      physics.dispose();
      expect(scene.children).toHaveLength(0);
    }
  });

  it('triggers traffic_accident with occupant escape, vehicle damage, smoke plumes, and clean reset/dispose', async () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera(58, 1, 0.1, 200);
    const district = buildDistrict(scene, 240817);
    const physics = await createPhysics(district.colliders);
    const player = createPlayer(scene, camera, physics, district.spawn);
    const engine = createSimulationEngine(scene, physics, player, district, 240817, 15);

    try {
      // Advance briefly so local traffic near player spawn has active cars
      for (let i = 0; i < 12; i++) engine.step(dt, baseControls);
      const targetCar = engine.traffic.vehicles.find((c) => c.occupied && !c.wrecked)!;
      expect(targetCar).toBeDefined();

      // Place armed player 3.4 m away with clear sightline to target traffic vehicle
      const standX = targetCar.x - Math.sin(targetCar.heading) * 3.4;
      const standZ = targetCar.z + Math.cos(targetCar.heading) * 3.4;
      const heading = Math.atan2(targetCar.x - standX, -(targetCar.z - standZ));
      player.exitVehicle({ x: standX, y: 0, z: standZ }, heading);

      // Fire carbine rounds to severely wreck the vehicle cleanly
      engine.step(dt, { ...baseControls, weaponSlot: 2 });
      for (let i = 0; i < 14; i++) engine.step(dt, baseControls);
      for (let shot = 0; shot < 4; shot++) {
        engine.step(dt, { ...baseControls, fire: true });
        for (let w = 0; w < 10; w++) engine.step(dt, baseControls);
        if (targetCar.wrecked) break;
      }

      expect(targetCar.wrecked).toBe(true);
      expect(targetCar.occupied).toBe(false);
      expect(targetCar.damage).toBeGreaterThan(0.5);
      expect(engine.eventBus.recent().some((e) => e.type === 'traffic_accident')).toBe(true);
      expect(engine.npcPopulation.agents.some((a) => a.kind === 'driver_displaced')).toBe(true);

      // Smoke continues emitting while wrecked
      for (let i = 0; i < 20; i++) engine.step(dt, baseControls);
      expect(engine.destructibles.plumeCount).toBeGreaterThan(0);

      // Reset restores all destructibles & clears debris cleanly
      engine.reset();
      expect(engine.destructibles.brokenCount).toBe(0);
      expect(engine.destructibles.debrisCount).toBe(0);
    } finally {
      engine.dispose();
      player.dispose();
      district.dispose();
      physics.dispose();
      expect(scene.children).toHaveLength(0);
    }
  });
});
