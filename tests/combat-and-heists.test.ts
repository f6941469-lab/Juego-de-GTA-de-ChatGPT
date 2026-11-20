import { PerspectiveCamera, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { createPolice } from '../src/ai/police/police';
import { buildRoadGraph } from '../src/navigation/road-graph';
import { createPhysics } from '../src/physics/physics';
import { SpatialBoxGrid } from '../src/physics/spatial-index';
import { createPlayer } from '../src/player/player';
import { createWeaponSystem } from '../src/player/weapons';
import { createSimulationEngine } from '../src/simulation/engine';
import { buildDistrict } from '../src/world/district';
import { storeSpecs } from '../src/world/generation/layout';
import { getStoreInteriorLayout } from '../src/world/stores';

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

describe('Phase 3 weapons, combat, witnesses, and complete store heists', () => {
  it('blocks gunshots with walls in SpatialBoxGrid, consumes ammo/reloads, and damages unobstructed NPC targets', () => {
    const scene = new Scene();
    const weapons = createWeaponSystem(scene);
    const spatial = new SpatialBoxGrid([
      { x: 0, y: 2, z: -10, halfX: 6, halfY: 2, halfZ: 0.5 },
    ]);

    try {
      expect(weapons.equipped).toBe('unarmed');
      weapons.selectSlot(1);
      expect(weapons.equipped).toBe('pistol');
      expect(weapons.ammo.mag).toBe(12);

      // Wall at z = -10 blocks hit on NPC standing behind it at z = -16
      const blockedShot = weapons.step(
        0.2,
        { aim: true, fire: true, reload: false, cycleWeapon: false },
        { x: 0, y: 0, z: 0, heading: 0, inVehicle: false },
        spatial,
        [{ id: 'npc-behind-wall', x: 0, z: -16, radius: 0.48, kind: 'npc' }],
      );
      expect(blockedShot.fired).toBe(true);
      expect(blockedShot.hitWall).toBe(true);
      expect(blockedShot.hitTarget).toBeUndefined();
      expect(weapons.ammo.mag).toBe(11);

      // Clear target at z = -6 (in front of wall) gets hit
      const clearShot = weapons.step(
        0.35,
        { aim: true, fire: true, reload: false, cycleWeapon: false },
        { x: 0, y: 0, z: 0, heading: 0, inVehicle: false },
        spatial,
        [{ id: 'npc-open', x: 0, z: -6, radius: 0.48, kind: 'npc' }],
      );
      expect(clearShot.fired).toBe(true);
      expect(clearShot.hitTarget?.id).toBe('npc-open');
      expect(weapons.ammo.mag).toBe(10);

      // Reload transfers bullets from reserve after reload duration
      weapons.step(
        0.1,
        { aim: false, fire: false, reload: true, cycleWeapon: false },
        { x: 0, y: 0, z: 0, heading: 0, inVehicle: false },
        spatial,
        [],
      );
      expect(weapons.reloading).toBe(true);
      weapons.step(
        1.25,
        { aim: false, fire: false, reload: false, cycleWeapon: false },
        { x: 0, y: 0, z: 0, heading: 0, inVehicle: false },
        spatial,
        [],
      );
      expect(weapons.reloading).toBe(false);
      expect(weapons.ammo.mag).toBe(12);
      expect(weapons.ammo.reserve).toBe(46);
    } finally {
      weapons.dispose();
      expect(scene.children).toHaveLength(0);
    }
  });

  it('executes progressive store heists inside the shop, intimidates the clerk, pays cash, and emits gunfire/injuries', async () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera(58, 1, 0.1, 200);
    const district = buildDistrict(scene, 240817);
    const physics = await createPhysics(district.colliders);
    const player = createPlayer(scene, camera, physics, district.spawn);
    const engine = createSimulationEngine(scene, physics, player, district, 240817, 15);

    try {
      const store = storeSpecs[0];
      const interior = getStoreInteriorLayout(store);

      // Walk/warp inside the store facing the clerk behind the counter (heading toward clerk)
      const dx = interior.clerkX - interior.counterFrontX;
      const dz = interior.clerkZ - interior.counterFrontZ;
      const headingToClerk = Math.atan2(dx, -dz);
      player.exitVehicle({ x: interior.counterFrontX, y: 0, z: interior.counterFrontZ }, headingToClerk);

      // Equip pistol and press E to begin progressive heist
      engine.step(dt, { ...baseControls, weaponSlot: 1 });
      expect(engine.armed).toBe(true);
      engine.step(dt, { ...baseControls, interact: true });

      expect(engine.stores.activeHeist?.store.id).toBe(store.id);
      const clerk = engine.npcPopulation.agents.find((a) => a.kind === 'clerk' && a.home?.storeId === store.id)!;
      expect(clerk.state).toBe('cooperating');

      // Non-omniscient: starting robbery does not magically give instant stars before alarm/witness
      expect(engine.police.wanted.level).toBe(0);

      // Hold position & aim weapon inside store until heist completes (~2.6s * speedFactor)
      for (let i = 0; i < 165; i++) {
        engine.step(dt, { ...baseControls, aim: true });
        if (!engine.stores.activeHeist) break;
      }

      expect(engine.stores.activeHeist).toBeNull();
      expect(engine.cash).toBe(store.loot);
      expect(engine.eventBus.recent(10).some((evt) => evt.type === 'robbery_finished')).toBe(true);

      // Fire a gunshot at a street NPC and verify ballistic injury + gunshot_fired event
      const victim = engine.npcPopulation.agents.find((a) => a.kind === 'pedestrian') ?? clerk;
      const aimX = victim.x - (victim.x + 3);
      const headingAtVictim = Math.atan2(aimX, 0);
      player.exitVehicle({ x: victim.x + 3, y: 0, z: victim.z }, headingAtVictim);
      const healthBefore = victim.brain.health;
      engine.step(dt, { ...baseControls, fire: true });

      expect(victim.brain.health).toBeLessThan(healthBefore);
      expect(engine.eventBus.recent(8).some((evt) => evt.type === 'gunshot_fired')).toBe(true);
      expect(engine.eventBus.recent(8).some((evt) => evt.type === 'npc_injured')).toBe(true);
    } finally {
      engine.dispose();
      player.dispose();
      physics.dispose();
      district.dispose();
      expect(scene.children).toHaveLength(0);
    }
  });

  it('respects building cover against police gunfire at wanted level >= 2', () => {
    const graph = buildRoadGraph([
      { x: 60, z: 0, width: 10, depth: 40 },
      { x: 60, z: 0, width: 40, depth: 10 },
    ]);
    const wall = { x: 48, y: 2.5, z: 0, halfX: 1, halfY: 2.5, halfZ: 8 };

    // Blocked by wall -> zero shots fired
    const coveredPolice = createPolice(new Scene(), graph, [wall]);
    coveredPolice.wanted.report({ x: 0, z: 0 }, 2);
    coveredPolice.step(dt, { x: 0, z: 0, speed: 0, heading: 0 });
    let shotsBlocked = 0;
    for (let i = 0; i < 120; i++) {
      coveredPolice.step(dt, { x: 42, z: 0, speed: 0, heading: 0 }, {
        onFire: () => { shotsBlocked += 1; },
      });
    }
    expect(shotsBlocked).toBe(0);
    coveredPolice.reset();

    // Open line of sight at < 25m -> police fire during pursuit
    const openPolice = createPolice(new Scene(), graph, []);
    openPolice.wanted.report({ x: 0, z: 0 }, 2);
    openPolice.step(dt, { x: 0, z: 0, speed: 0, heading: 0 });
    let shotsOpen = 0;
    for (let i = 0; i < 120; i++) {
      openPolice.step(dt, { x: 42, z: 0, speed: 0, heading: 0 }, {
        onFire: () => { shotsOpen += 1; },
      });
    }
    expect(shotsOpen).toBeGreaterThan(0);
    openPolice.reset();
  });
});
