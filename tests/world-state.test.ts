import { PerspectiveCamera, Scene } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { gameConfig } from '../src/config/game';
import type { GameAudio } from '../src/audio/audio';
import { createPhysics } from '../src/physics/physics';
import { createPlayer } from '../src/player/player';
import { Journal } from '../src/simulation/model';
import { Navigation, navigationLimits } from '../src/simulation/navigation';
import { createSession } from '../src/simulation/session';
import { WorldState, worldLimits, zoneIdAt } from '../src/simulation/world-state';
import { buildDistrict } from '../src/world/district';

const point = (x: number, z: number) => ({ x, y: 0, z });

describe('navegación global y presupuesto por tick', () => {
  it('cruza barrios del mapa real sin atravesar sólidos y difiere trabajo hasta el siguiente tick', () => {
    const district = buildDistrict(new Scene(), gameConfig.seed);
    const nav = new Navigation(district.colliders);
    const from = point(-45, -80), to = point(28, 83);
    const path = nav.path(from, to);
    expect(path.length).toBeGreaterThan(150);
    expect(path.every(p => nav.walkable(p))).toBe(true);
    expect(Math.hypot(path.at(-1)!.x - to.x, path.at(-1)!.z - to.z)).toBeLessThan(0.5);
    for (let i = 0; i < 3; i++) expect(nav.requestPath(from, to)).toEqual(path);
    nav.beginStep();
    expect(nav.requestPath(from, to)).toEqual(path);
    expect(nav.requestPath(to, from)?.length).toBeGreaterThan(150);
    expect(nav.requestPath(from, to)).toBeUndefined();
    nav.beginStep();
    expect(nav.requestPath(from, to)).toEqual(path);
    expect(nav.stats.deferred).toBe(1);
    expect(nav.stats.peakVisited).toBeLessThanOrEqual(navigationLimits.visitedPerSearch);
  });

  it('acota búsquedas inalcanzables y vuelve a calcular después de cambiar la geometría', () => {
    const wall = { x: 0, y: 1, z: 0, halfX: 100, halfY: 1, halfZ: 0.3 };
    const nav = new Navigation([wall]);
    const version = nav.version;
    expect(nav.path(point(0, -12), point(0, 12))).toEqual([]);
    expect(nav.stats.lastVisited).toBeLessThanOrEqual(navigationLimits.visitedPerSearch);
    nav.rebuild([]);
    expect(nav.version).toBeGreaterThan(version);
    expect(nav.path(point(0, -12), point(0, 12)).length).toBeGreaterThan(30);
    expect(nav.path(point(0, 0), point(NaN, 0))).toEqual([]);
    expect(nav.path(point(0, 0), point(80, 0))).toEqual([]);
  });
});

describe('identidad, zonas e historial acotado', () => {
  it('migra la misma entidad entre zonas, conserva daños al alejarse y copia las poses históricas', () => {
    const world = new WorldState();
    const position = point(15, 39);
    let health = 0;
    const entity = { id: 'damage:test', kind: 'damage' as const, position, get health() { return health; } };
    world.register(entity);
    world.update(0, position);
    const originalZone = zoneIdAt(position)!;
    expect(world.zones.get(originalZone)!.damaged.has(entity.id)).toBe(true);
    world.update(1, point(-45, -80));
    expect(world.tier(entity.id)).toBe('far');
    expect(world.entity(entity.id)).toBe(entity);
    expect(world.zones.get(originalZone)!.damaged.has(entity.id)).toBe(true);
    position.x = -45; position.z = -63;
    world.update(2, position);
    expect(world.count).toBe(1);
    expect(world.zones.get(originalZone)!.entities.has(entity.id)).toBe(false);
    expect(world.zones.get(zoneIdAt(position)!)!.entities.has(entity.id)).toBe(true);
    expect(world.history()[0].entities[0].x).toBe(15);
    for (let time = 3; time < 100; time++) world.update(time, position);
    expect(world.historyCount).toBe(worldLimits.historyFrames);
    health = 100; world.reset(position);
    expect(world.historyCount).toBe(1);
    expect([...world.zones.values()].every(zone => zone.damaged.size === 0)).toBe(true);
    expect(() => world.register(entity)).toThrow('duplicada');
  });

  it('mantiene cuotas e identifica la zona del incidente sin exponer la posición mutable del autor', () => {
    const world = new WorldState();
    for (let i = 0; i < worldLimits.entities; i++) world.register({ id: `person:${i}`, kind: 'person', position: point(0, 0) });
    expect(() => world.register({ id: 'extra', kind: 'person', position: point(0, 0) })).toThrow('presupuesto');
    const journal = new Journal();
    const source = point(-45, -63);
    const event = journal.publish('shot', source, 3);
    const zone = zoneIdAt(source);
    source.x = 15;
    expect(event.zoneId).toBe(zone);
    expect(event.position.x).toBe(-45);
    for (let i = 0; i < 200; i++) journal.publish('shot', source, i);
    expect(journal.events).toHaveLength(96);
  });

  it('integra IDs, ocupantes y daños con Session y limpia la historia al reiniciar', async () => {
    const scene = new Scene(), district = buildDistrict(scene, gameConfig.seed);
    const physics = await createPhysics(district.colliders);
    const player = createPlayer(scene, new PerspectiveCamera(), physics, district.spawn);
    const audio: GameAudio = { unlock: vi.fn(), play: vi.fn(), update: vi.fn(), setMuted: vi.fn(), pause: vi.fn(), dispose: vi.fn() };
    const session = createSession(scene, new PerspectiveCamera(), physics, district.colliders, player, audio, vi.fn());
    try {
      for (const car of session.traffic.cars) {
        expect(session.world.entity(car.seatId)?.occupantId).toBe(car.driverId);
        expect(session.world.entity(car.driverId)?.vehicleId).toBe(car.id);
      }
      const window = session.feedback.windows[0];
      const count = session.world.count;
      session.feedback.hit(window.collider.handle, window.box);
      session.world.update(1, point(-45, -80));
      expect(session.world.entity(window.id)?.health).toBe(0);
      session.world.update(2, player.position);
      expect(session.world.count).toBe(count);
      expect(session.world.zones.get(zoneIdAt(window.box)!)!.damaged.has(window.id)).toBe(true);
      session.reset();
      expect(session.world.entity(window.id)?.health).toBe(100);
      expect(session.world.count).toBe(count);
      expect(session.world.historyCount).toBe(1);
    } finally { session.dispose(); player.dispose(); physics.dispose(); }
  });
});
