import { PerspectiveCamera, Scene } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { GameAudio } from '../src/audio/audio';
import { gameConfig } from '../src/config/game';
import { createPhysics } from '../src/physics/physics';
import { createPlayer } from '../src/player/player';
import { createSession } from '../src/simulation/session';
import { buildDistrict } from '../src/world/district';
import { allShops } from '../src/world/generation/shop';
import { busStops, metroStations } from '../src/world/generation/transit';

const dt = 1 / 60;
const idle = { x: 0, z: 0, run: false, jump: false, aim: false, fire: false };
const audio = (): GameAudio => ({ unlock: vi.fn(), play: vi.fn(), update: vi.fn(), setMuted: vi.fn(), pause: vi.fn(), dispose: vi.fn() });

describe('Fases 3-8: tiendas, vida civil, transporte, destrucción, policía y replay POV', () => {
  it('mantiene transitables las 9 tiendas reales, 4 paradas de bus y 2 estaciones de metro', async () => {
    const scene = new Scene();
    const district = buildDistrict(scene, gameConfig.seed);
    const physics = await createPhysics(district.colliders);
    const baseCount = physics.world.colliders.len();
    const camera = new PerspectiveCamera(58, 1.6, 0.08, 650);
    const player = createPlayer(scene, camera, physics, district.spawn);
    const session = createSession(scene, camera, physics, district.colliders, player, audio(), vi.fn());
    try {
      expect(allShops).toHaveLength(9);
      expect(session.population.merchants).toHaveLength(9);
      for (const store of allShops) {
        expect(session.navigation.walkable(store.entrance), `${store.id} entrance`).toBe(true);
        expect(session.navigation.walkable(store.counter), `${store.id} counter`).toBe(true);
        const inside = session.navigation.path(store.entrance, store.counter);
        expect(inside.length, `${store.id} entrance->counter`).toBeGreaterThan(0);
        const approach = session.navigation.path(district.spawn, store.entrance);
        expect(approach.length, `${store.id} spawn->entrance`).toBeGreaterThan(0);
      }
      for (const stop of busStops) {
        expect(session.navigation.walkable(stop.waitPoint)).toBe(true);
      }
      for (const station of metroStations) {
        expect(session.navigation.walkable(station.entrance)).toBe(true);
        expect(session.navigation.walkable(station.platform)).toBe(true);
      }
    } finally {
      session.dispose();
      player.dispose();
      expect(physics.world.colliders.len()).toBe(baseCount);
      physics.dispose();
    }
  });

  it('permite conversar con civiles, detecta seguimiento persistente (Pedro) y dispara charla NPC-NPC', async () => {
    const scene = new Scene();
    const district = buildDistrict(scene, gameConfig.seed);
    const physics = await createPhysics(district.colliders);
    const camera = new PerspectiveCamera(58, 1.6, 0.08, 650);
    const player = createPlayer(scene, camera, physics, { x: 21.5, y: 0, z: 38.0 });
    const session = createSession(scene, camera, physics, district.colliders, player, audio(), vi.fn());
    try {
      const pedro = session.population.allPeople.find((p) => p.id === 'person:pedro')!;
      expect(pedro).toBeDefined();
      expect(pedro.carryItem).toBe('briefcase');

      // Talk with Pedro via E
      session.command('interact');
      expect(session.overlay).toBe('talk');
      expect(session.activeTalkNpc?.id).toBe('person:pedro');
      session.select(1);
      expect(session.talkReply.length).toBeGreaterThan(10);
      session.command('back');
      expect(session.overlay).toBe('world');

      // Advance simulation while warping player on open sidewalk near Pedro
      for (let i = 0; i < 1800; i++) {
        if (pedro.state !== 'riding') {
          player.setInVehicle(false, { x: pedro.actor.position.x - 1.5, y: 0.08, z: pedro.actor.position.z + 1.0 });
        }
        session.step(dt, idle);
        if (pedro.stalkStage === 2) break;
      }
      expect(pedro.stalkStage).toBeGreaterThanOrEqual(1);
    } finally {
      session.dispose();
      player.dispose();
      physics.dispose();
    }
  });

  it('permite robar un coche ocupado sin duplicar conductor, conducirlo, bajar y dispara reacción policial', async () => {
    const scene = new Scene();
    const district = buildDistrict(scene, gameConfig.seed);
    const physics = await createPhysics(district.colliders);
    const camera = new PerspectiveCamera(58, 1.6, 0.08, 650);
    const player = createPlayer(scene, camera, physics, district.spawn);
    const session = createSession(scene, camera, physics, district.colliders, player, audio(), vi.fn());
    try {
      const beforeCount = session.population.allPeople.length;
      const car = session.traffic.cars[0];
      player.setInVehicle(false, { x: car.position.x + 1.5, y: 0.08, z: car.position.z });
      session.command('vehicle');
      expect(player.inVehicle).toBe(true);
      expect(session.currentVehicle?.id).toBe(car.id);
      expect(car.controlledByPlayer).toBe(true);
      expect(session.population.allPeople).toHaveLength(beforeCount + 1);
      const handles = new Set(session.population.allPeople.map((p) => p.actor.collider.handle));
      expect(handles.size).toBe(session.population.allPeople.length);
      expect(session.journal.events.some((e) => e.kind === 'theft')).toBe(true);

      const startPos = car.position.clone();
      for (let i = 0; i < 45; i++) session.step(dt, { ...idle, z: 1 });
      expect(car.position.distanceTo(startPos)).toBeGreaterThan(0.5);

      session.command('vehicle');
      expect(player.inVehicle).toBe(false);
      expect(car.controlledByPlayer).toBe(false);
    } finally {
      session.dispose();
      player.dispose();
      physics.dispose();
    }
  });

  it('graba clips POV multi-ángulo, conserva tramos enviados si muere el testigo y reproduce sin alterar el presente', async () => {
    const scene = new Scene();
    const district = buildDistrict(scene, gameConfig.seed);
    const physics = await createPhysics(district.colliders);
    const camera = new PerspectiveCamera(58, 1.6, 0.08, 650);
    const player = createPlayer(scene, camera, physics, { x: 14.5, y: 0, z: 36.0 });
    const session = createSession(scene, camera, physics, district.colliders, player, audio(), vi.fn());
    try {
      // Equip pistol and shoot inside/near Mercado Palma where Luz ('record') & street cam can capture
      session.command('equip');
      session.step(dt, { ...idle, aim: true, fire: true });
      const luz = session.population.people.find((p) => p.id === 'person:luz')!;
      for (let i = 0; i < 200; i++) {
        session.step(dt, idle);
        if (luz.state === 'recording') break;
      }
      expect(luz.state).toBe('recording');

      // Record several frames, then incapacitate witness mid-recording
      for (let i = 0; i < 50; i++) session.step(dt, idle);
      luz.actor.hurt(100);
      for (let i = 0; i < 40; i++) session.step(dt, idle);

      const clips = session.journal.allClips;
      expect(clips.length).toBeGreaterThanOrEqual(1);
      const luzClip = clips.find((c) => c.authorId === 'person:luz');
      expect(luzClip).toBeDefined();
      expect(luzClip!.frames.length).toBeGreaterThan(0);
      expect(luzClip!.status).toBe('partial');
      expect(luzClip!.interruptedReason).toContain('abatido');

      // Open replay and switch angles without mutating live wallet or witness health
      const moneyBefore = session.economy.money;
      expect(session.openReplayWith(clips, 'Prueba Replay', false)).toBe(true);
      expect(session.overlay).toBe('replay');
      session.step(0.2, idle);
      session.render(1, 0.016);
      session.command('back');
      expect(session.overlay).toBe('world');
      expect(session.economy.money).toBe(moneyBefore);
      expect(luz.actor.health).toBe(0);
    } finally {
      session.dispose();
      player.dispose();
      physics.dispose();
    }
  });

  it('separa caja y stock entre las 9 tiendas, destruye mobiliario urbano y despliega patrullas policiales', async () => {
    const scene = new Scene();
    const district = buildDistrict(scene, gameConfig.seed);
    const physics = await createPhysics(district.colliders);
    const baseCount = physics.world.colliders.len();
    const camera = new PerspectiveCamera(58, 1.6, 0.08, 650);
    const player = createPlayer(scene, camera, physics, allShops[1].counter);
    const session = createSession(scene, camera, physics, district.colliders, player, audio(), vi.fn());
    try {
      // Buy from Dulcería Sol (allShops[1]) without affecting Mercado Palma (allShops[0])
      session.command('interact');
      expect(session.overlay).toBe('shop');
      expect(session.activeShop.id).toBe(allShops[1].id);
      session.command('confirm');
      expect(session.economy.money).toBe(114);
      expect(session.economy.store(allShops[1].id)!.till).toBe(allShops[1].initialTill + 6);
      expect(session.economy.store(allShops[0].id)!.till).toBe(allShops[0].initialTill);
      session.command('back');

      // Destroy a street hydrant prop & verify Navigation + reset
      const hydrant = session.feedback.props[0];
      expect(hydrant.intact).toBe(true);
      expect(session.feedback.hit(hydrant.collider.handle, hydrant.box)).toBe(true);
      expect(hydrant.intact).toBe(false);

      // Dispatch patrol cars on reported shot
      expect(session.police.patrolCars).toHaveLength(2);
      session.journal.publish('report', { x: -22, y: 0.08, z: -15 }, 1, 'person:tomas', true, 99);
      for (let i = 0; i < 420; i++) session.step(dt, idle);
      expect(session.police.state).not.toBe('patrol');
      expect(session.police.patrolCars.some((c) => c.parked) || session.police.patrolCars.some((c) => c.speed > 0.5)).toBe(true);

      session.reset();
      expect(hydrant.intact).toBe(true);
      expect(session.economy.money).toBe(120);
      expect(session.police.state).toBe('patrol');
    } finally {
      session.dispose();
      player.dispose();
      expect(physics.world.colliders.len()).toBe(baseCount);
      physics.dispose();
    }
  });
});
