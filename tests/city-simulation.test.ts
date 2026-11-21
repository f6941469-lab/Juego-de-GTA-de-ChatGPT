import { PerspectiveCamera, Scene } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { GameAudio } from '../src/audio/audio';
import { gameConfig } from '../src/config/game';
import { createPhysics } from '../src/physics/physics';
import { createPlayer } from '../src/player/player';
import { createActor } from '../src/simulation/actor';
import { Journal } from '../src/simulation/model';
import { Navigation, navigationLimits } from '../src/simulation/navigation';
import { populationLimits } from '../src/simulation/population';
import { RoadNetwork, joinRoads, lanePose, turnPose } from '../src/simulation/road-network';
import { createSession } from '../src/simulation/session';
import { createTraffic } from '../src/simulation/traffic';
import { zoneIdAt } from '../src/simulation/world-state';
import { buildDistrict } from '../src/world/district';
import { roadRectangles } from '../src/world/generation/layout';

const dt = 1 / 60;
const floor = { x: 0, y: -0.5, z: 0, halfX: 100, halfY: 0.5, halfZ: 100 };
const point = (x: number, z: number) => ({ x, y: 0.08, z });
const idle = { x: 0, z: 0, run: false, jump: false, aim: false, fire: false };
const audio = (): GameAudio => ({ unlock: vi.fn(), play: vi.fn(), update: vi.fn(), setMuted: vi.fn(), pause: vi.fn(), dispose: vi.fn() });

describe('navegación jerárquica y cambios locales', () => {
  it('conserva el resultado de un obstáculo eliminado sin reconstruir las celdas de otros barrios', () => {
    const scene = new Scene(), district = buildDistrict(scene, gameConfig.seed);
    const barrier = { x: 0, y: 1, z: -20, halfX: 6.5, halfY: 1, halfZ: 0.2 };
    const nav = new Navigation([...district.colliders, barrier]);
    const count = nav.stats.cellsUpdated;
    nav.rebuild(district.colliders, barrier);
    expect(nav.stats.cellsUpdated).toBeLessThan(count / 30);
    const fresh = new Navigation(district.colliders);
    for (const [from, to] of [[point(-45, -80), point(28, 83)], [point(0, -25), point(0, -15)], [point(53, -70), point(53, 80)]]) {
      expect(nav.path(from, to)).toEqual(fresh.path(from, to));
      expect(nav.stats.coarseVisited).toBeLessThanOrEqual(48);
      expect(nav.stats.lastVisited).toBeLessThanOrEqual(navigationLimits.visitedPerSearch);
    }
  });

  it('reserva un paso para un solo actor y libera la reserva en el siguiente tick', () => {
    const nav = new Navigation([]), target = point(0, 0);
    nav.beginStep();
    expect(nav.reserveMove(1, target)).toBe(true);
    expect(nav.reserveMove(2, target)).toBe(false);
    nav.beginStep();
    expect(nav.reserveMove(2, target)).toBe(true);
    expect(nav.reserveMove(2, point(1000, 0))).toBe(false);
  });

  it('permite cruzarse a dos actores opuestos sin superponer sus cápsulas', async () => {
    const physics = await createPhysics([floor]), nav = new Navigation([floor]), scene = new Scene();
    const a = createActor(scene, physics, nav, point(-3, 0), 0x7799aa);
    const b = createActor(scene, physics, nav, point(3, 0), 0xbb8866);
    const occupants = [a, b].map(actor => ({ owner: actor.collider.handle, position: actor.position }));
    a.goTo(point(3, 0)); b.goTo(point(-3, 0));
    let closest = Infinity;
    try {
      for (let tick = 0; tick < 900; tick++) {
        nav.beginStep(occupants); a.prepare(dt); b.prepare(dt); physics.step(dt); a.finish(dt); b.finish(dt);
        closest = Math.min(closest, a.position.distanceTo(b.position));
      }
      expect(a.position.x).toBeGreaterThan(2.3);
      expect(b.position.x).toBeLessThan(-2.3);
      expect(closest).toBeGreaterThan(0.6);
    } finally { a.dispose(); b.dispose(); physics.dispose(); }
  });
});

describe('red vial compartida', () => {
  it('conecta todo el trazado, mantiene las uniones y libera las reservas de cruces', () => {
    const roads = new RoadNetwork(), nodes = [...roads.nodes.values()];
    expect(nodes).toHaveLength(25); expect(roads.lanes).toHaveLength(80);
    const route = roads.route(nodes[0], nodes.at(-1)!);
    expect(route.length).toBe(8);
    for (let index = 1; index < route.length; index++) {
      const a = route[index - 1], b = route[index], turn = joinRoads(a, b);
      expect(turnPose(turn, 0).x).toBeCloseTo(lanePose(a, a.length).x);
      expect(turnPose(turn, turn.length).z).toBeCloseTo(lanePose(b, 0).z);
      expect(turn.length).toBeGreaterThan(0);
    }
    const rectangles = roadRectangles();
    for (const lane of roads.lanes) for (const next of roads.lanes.filter(next => next.from === lane.to && next.to !== lane.from)) {
      const turn = joinRoads(lane, next);
      for (let step = 0; step <= 8; step++) {
        const pose = turnPose(turn, turn.length * step / 8);
        expect(rectangles.some(road => Math.abs(pose.x - road.x) <= road.width / 2 && Math.abs(pose.z - road.z) <= road.depth / 2)).toBe(true);
      }
    }
    expect(roads.reserve(nodes[0], 'car:a')).toBe(true);
    expect(roads.reserve(nodes[0], 'car:b')).toBe(false);
    roads.release(nodes[0], 'car:a');
    expect(roads.reserve(nodes[0], 'car:b')).toBe(true);
    roads.reset(); expect(roads.reserve(nodes[0], 'car:a')).toBe(true);
  });

  it('lleva los mismos coches a calles exteriores al circuito inicial', async () => {
    const scene = new Scene(), district = buildDistrict(scene, gameConfig.seed);
    const physics = await createPhysics(district.colliders), traffic = createTraffic(scene, physics, new Journal());
    const initial = traffic.cars.map(car => car.id), visited = new Set<string>();
    physics.step(dt);
    try {
      for (let tick = 0; tick < 4800; tick++) {
        traffic.prepare(dt, tick * dt); physics.step(dt); traffic.finish();
        for (const car of traffic.cars) { visited.add(car.lane.id); expect(Number.isFinite(car.position.x + car.position.z)).toBe(true); }
      }
      expect(visited.size).toBeGreaterThan(6);
      expect([...visited].some(id => id.includes('road:-22:'))).toBe(true);
      expect(traffic.cars.map(car => car.id)).toEqual(initial);
      traffic.reset(); expect(traffic.cars[0].lane).toBe(traffic.cars[0].initialLane);
      expect(traffic.cars.map(car => car.destination)).toEqual([0, 7, 14]);
    } finally { traffic.dispose(); physics.dispose(); }
  });
});

describe('actividad civil entre zonas', () => {
  it('simula residentes alejados desde el inicio con cuotas de decisiones y rutas', async () => {
    const scene = new Scene(), district = buildDistrict(scene, gameConfig.seed), physics = await createPhysics(district.colliders);
    const camera = new PerspectiveCamera(), player = createPlayer(scene, camera, physics, district.spawn);
    const session = createSession(scene, camera, physics, district.colliders, player, audio(), vi.fn());
    const positions = new Map(session.population.people.map(person => [person.id, person.actor.position.clone()]));
    const remote = session.population.people.filter(person => person.actor.position.distanceTo(player.position) > 84);
    try {
      expect(session.population.people).toHaveLength(10);
      expect(remote.length).toBeGreaterThanOrEqual(3);
      for (let tick = 0; tick < 360; tick++) {
        const before = session.navigation.stats.searches;
        session.step(dt, idle);
        expect(session.population.stats.decisions).toBeLessThanOrEqual(populationLimits.decisionsPerStep);
        expect(session.navigation.stats.searches - before).toBeLessThanOrEqual(navigationLimits.searchesPerStep);
      }
      expect(remote.some(person => person.actor.position.distanceTo(positions.get(person.id)!) > 0.6)).toBe(true);
      for (const person of remote) expect(session.world.entity(person.id)?.position).toBe(person.actor.position);
      const count = session.world.count;
      const glass = session.feedback.windows[0];
      session.feedback.hit(glass.collider.handle, glass.box);
      expect(session.navigation.stats.cellsUpdated).toBeLessThan(500);
      session.world.update(10, remote[0].actor.position);
      session.world.update(11, player.position);
      expect(session.world.entity(glass.id)?.health).toBe(0);
      expect(session.world.count).toBe(count);
      session.reset(); expect(session.world.count).toBe(count); expect(session.world.entity(glass.id)?.health).toBe(100);
    } finally { session.dispose(); player.dispose(); physics.dispose(); }
  });

  it('genera un aviso de un disparo real lejos del mercado sin revelar una posición posterior', async () => {
    const scene = new Scene(), district = buildDistrict(scene, gameConfig.seed), physics = await createPhysics(district.colliders);
    const camera = new PerspectiveCamera(), player = createPlayer(scene, camera, physics, point(-50.6, -78));
    const session = createSession(scene, camera, physics, district.colliders, player, audio(), vi.fn());
    try {
      player.render(1, dt); session.command('equip'); session.step(dt, { ...idle, aim: true, fire: true });
      const shot = session.journal.events.find(event => event.kind === 'shot')!;
      expect(shot).toBeDefined(); expect(shot.zoneId).toBe(zoneIdAt(player.position));
      for (let tick = 0; tick < 420; tick++) session.step(dt, tick < 120 ? { ...idle, z: -1 } : idle);
      const report = session.journal.events.find(event => event.kind === 'report' && event.incident === shot.id)!;
      expect(report).toBeDefined(); expect(report.source).toBe('person:ines'); expect(report.position).toEqual(shot.position);
      expect(session.population.cashier.memory).toBeUndefined();
      expect(session.police.lastKnown).toEqual(shot.position);
      expect(player.position.distanceTo(shot.position)).toBeGreaterThan(3);
      expect(session.world.entity('person:ines')).toBeDefined();
    } finally { session.dispose(); player.dispose(); physics.dispose(); }
  });
});
