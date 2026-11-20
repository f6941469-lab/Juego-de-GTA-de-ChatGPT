import { PerspectiveCamera, Scene } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { GameAudio } from '../src/audio/audio';
import { gameConfig } from '../src/config/game';
import { createCharacterCollider, createPhysics, type StaticBox } from '../src/physics/physics';
import { createPlayer } from '../src/player/player';
import { Economy, Journal, Weapon } from '../src/simulation/model';
import { Navigation } from '../src/simulation/navigation';
import { createPolice } from '../src/simulation/police';
import { createPopulation } from '../src/simulation/population';
import { createSession } from '../src/simulation/session';
import { createTraffic } from '../src/simulation/traffic';
import { buildDistrict } from '../src/world/district';

const dt = 1 / 60;
const floor: StaticBox = { x: 0, y: -0.5, z: 0, halfX: 100, halfY: 0.5, halfZ: 100 };
const idle = { x: 0, z: 0, run: false, jump: false, aim: false, fire: false };
const audio = (): GameAudio => ({ unlock: vi.fn(), play: vi.fn(), update: vi.fn(), setMuted: vi.fn(), pause: vi.fn(), dispose: vi.fn() });

it('queues two character moves and advances the shared world once', async () => {
  const physics = await createPhysics([floor]);
  const a = createCharacterCollider(physics, { x: 0, y: 0, z: 0 });
  const b = createCharacterCollider(physics, { x: 3, y: 0, z: 0 });
  physics.step(dt);
  a.move(dt, { x: 0, y: -0.1, z: -0.1 }); b.move(dt, { x: 0, y: -0.1, z: -0.1 });
  expect(a.readFeet().z).toBe(0); expect(b.readFeet().z).toBe(0);
  physics.step(dt);
  expect(a.readFeet().z).toBeCloseTo(-0.1); expect(b.readFeet().z).toBeCloseTo(-0.1);
  a.dispose(); b.dispose(); physics.dispose();
});

describe('transactions and pistol state', () => {
  it('validates products, funds and stock without partial transactions', () => {
    const economy = new Economy();
    expect(economy.buy('water')).toBeNull(); expect(economy.money).toBe(112); expect(economy.inventory.water).toBe(1);
    economy.money = 7; const stock = economy.stock.water;
    expect(economy.buy('water')).toBe('Saldo insuficiente'); expect(economy.stock.water).toBe(stock);
    expect(economy.buy('__proto__')).toBe('Producto desconocido'); expect(economy.money).toBe(7);
    economy.stock.snack = 0; expect(economy.buy('snack')).toBe('Producto agotado');
    expect(economy.use('water')).toBe(true); expect(economy.use('water')).toBe(false);
    const till = economy.till; expect(economy.rob()).toBe(till); expect(economy.rob()).toBe(0);
  });
  it('limits fire rate, empty magazines and reload transfer; holstering cancels reload', () => {
    const gun = new Weapon(); expect(gun.fire()).toBe(false); gun.toggle();
    for (let i = 0; i < 8; i++) { expect(gun.fire()).toBe(true); expect(gun.fire()).toBe(false); gun.tick(0.3); }
    expect(gun.fire()).toBe(false); expect(gun.reload()).toBe(true); gun.tick(0.6); expect(gun.rounds).toBe(0);
    gun.toggle(); gun.tick(2); expect(gun.rounds).toBe(0); expect(gun.reserve).toBe(24);
    gun.toggle(); gun.reload(); gun.tick(1.3); expect(gun.rounds).toBe(8); expect(gun.reserve).toBe(16);
  });
});

it('routes around walls and rejects destinations outside the simulated block', () => {
  const wall = { x: 15, y: 1.5, z: 35, halfX: 0.3, halfY: 1.5, halfZ: 2 };
  const nav = new Navigation([floor, wall]);
  const path = nav.path({ x: 13, y: 0, z: 35 }, { x: 17, y: 0, z: 35 });
  expect(path.length).toBeGreaterThan(5); expect(path.every((point) => nav.walkable(point))).toBe(true);
  expect(path.some((point) => Math.abs(point.z - 35) > 2.4)).toBe(true);
  expect(nav.path({ x: 13, y: 0, z: 35 }, { x: 90, y: 0, z: 90 })).toEqual([]);
});

it('integrates walking into the shop, a purchase, modal controls, destruction and reset without leaking colliders', async () => {
  const scene = new Scene(); const district = buildDistrict(scene, gameConfig.seed); const physics = await createPhysics(district.colliders);
  const baseCount = physics.world.colliders.len(); const camera = new PerspectiveCamera(58, 1.6, 0.08, 650);
  const player = createPlayer(scene, camera, physics, district.spawn); const onContext = vi.fn();
  const session = createSession(scene, camera, physics, district.colliders, player, audio(), onContext);
  function advance(frames: number, controls = idle) { for (let i = 0; i < frames; i++) { session.step(dt, controls); player.render(1, dt); } }
  try {
    advance(110, { ...idle, z: 1 }); advance(20, { ...idle, x: 1 }); advance(30);
    expect(player.position.z).toBeLessThan(35); expect(player.position.y).toBeCloseTo(0.08, 1); expect(session.prompt).toContain('comprar');
    session.command('interact'); expect(session.overlay).toBe('shop'); session.command('confirm');
    expect(session.economy.money).toBe(112); expect(session.economy.inventory.water).toBe(1);
    const before = player.position.clone(); advance(60, { ...idle, z: 1, fire: true });
    expect(player.position.distanceTo(before)).toBeLessThan(0.05); expect(session.weapon.rounds).toBe(8);
    session.command('back'); session.command('phone'); expect(session.overlay).toBe('phone'); expect(session.phonePage).toBe('home');
    session.command('confirm'); expect(session.phonePage).toBe('feed'); expect(session.journal.posts).toEqual([]);
    session.command('back'); expect(session.phonePage).toBe('home'); session.command('back'); expect(session.overlay).toBe('world');
    const window = session.feedback.windows[0]; const ray = { x: 0, y: 0, z: -1 };
    const origin = { x: window.box.x, y: 1.6, z: 41 };
    expect(physics.raycast(origin, ray, 3)?.collider.handle).toBe(window.collider.handle);
    expect(session.feedback.hit(window.collider.handle, window.box)).toBe(true);
    expect(session.feedback.hit(window.collider.handle, window.box)).toBe(false);
    physics.step(dt); expect(physics.raycast(origin, ray, 3)).toBeNull(); expect(window.mesh.visible).toBe(false);
    advance(180); expect(session.feedback.particleCount).toBe(0);
    session.reset(); advance(2); expect(window.intact).toBe(true); expect(session.economy.money).toBe(120);
    expect(physics.raycast(origin, ray, 3)?.collider.handle).toBe(window.collider.handle);
  } finally { session.dispose(); player.dispose(); expect(physics.world.colliders.len()).toBe(baseCount); physics.dispose(); }
});

it('delays witness reports, bounds evidence and searches reported positions without tracking an unseen player', async () => {
  const physics = await createPhysics([floor]); const scene = new Scene(); const journal = new Journal(); const nav = new Navigation([floor]);
  const population = createPopulation(scene, physics, nav, journal, -1); const police = createPolice(scene, physics, nav, journal, -1, vi.fn());
  physics.step(dt);
  const actualPlayer = { x: 60, y: 0, z: 80 }; const incident = { x: 8, y: 0, z: 38 };
  try {
    journal.publish('shot', { x: 60, y: 0, z: 80 }, 0); population.step(dt, 0, actualPlayer, false);
    expect(population.people.every((person) => person.state === 'routine' || person.state === 'browsing')).toBe(true);
    journal.publish('shot', incident, 0.1); population.step(dt, 0.1, actualPlayer, false); police.step(dt, 0.1, actualPlayer, false);
    expect(journal.events.some((event) => event.kind === 'report')).toBe(false); expect(police.state).toBe('patrol');
    for (let i = 1; i <= 240; i++) { population.step(dt, 0.1 + i * dt, actualPlayer, false); police.step(dt, 0.1 + i * dt, actualPlayer, false); }
    expect(journal.events.some((event) => event.kind === 'report')).toBe(true); expect(police.state).toBe('respond'); expect(police.lastKnown).toEqual(incident);
    police.step(23, 28, actualPlayer, false); expect(police.state).toBe('patrol'); expect(police.lastKnown).toBeUndefined();
    for (let i = 0; i < 150; i++) { const event = journal.publish('shot', incident, i); journal.post(`Testigo ${i}`, event); }
    expect(journal.events).toHaveLength(96); expect(journal.posts).toHaveLength(16); expect(journal.posts.every((post) => post.recording === 'unavailable')).toBe(true);
  } finally { population.dispose(); police.dispose(); physics.dispose(); }
});

it('brakes traffic for a solid obstacle and resumes when the obstacle is removed', async () => {
  const physics = await createPhysics([floor]); const journal = new Journal(); const traffic = createTraffic(new Scene(), physics, journal);
  const wall = physics.addBox({ x: 2, y: 1, z: 33, halfX: 1.5, halfY: 1, halfZ: 0.5 }); physics.step(dt);
  const advance = (frames: number, start: number) => { for (let i = 0; i < frames; i++) { traffic.prepare(dt, start + i * dt); physics.step(dt); traffic.finish(); } };
  try {
    advance(420, 0); const car = traffic.cars[0];
    traffic.render(1);
    const wheels = car.mesh.children.filter((part) => part.name === 'Wheel');
    expect(wheels).toHaveLength(4);
    for (const wheel of wheels) expect(car.mesh.position.y + wheel.position.y - wheel.scale.y / 2).toBeCloseTo(0);
    expect(car.position.z).toBeLessThan(39); expect(car.position.z).toBeGreaterThan(35.3); expect(car.speed).toBeLessThan(0.2);
    const stopped = car.position.clone(); physics.world.removeCollider(wall, true); physics.step(dt); advance(420, 16);
    expect(car.position.distanceTo(stopped)).toBeGreaterThan(5); expect(car.occupiedSeats).toBe(1);
  } finally { traffic.dispose(); physics.dispose(); }
});

it('recognizes sustained aim, transfers the register once, damages the actual ray target and generates witness evidence', async () => {
  const scene = new Scene(); const district = buildDistrict(scene, gameConfig.seed); const physics = await createPhysics(district.colliders);
  const camera = new PerspectiveCamera(58, 1.6, 0.08, 650); const player = createPlayer(scene, camera, physics, district.spawn);
  const session = createSession(scene, camera, physics, district.colliders, player, audio(), vi.fn());
  try {
    for (let i = 0; i < 110; i++) { session.step(dt, { ...idle, z: 1 }); player.render(1, dt); }
    for (let i = 0; i < 20; i++) { session.step(dt, { ...idle, x: 1 }); player.render(1, dt); }
    for (let i = 0; i < 30; i++) { session.step(dt, idle); player.render(1, dt); }
    session.command('equip'); camera.position.set(17.6, 1.6, 36); camera.lookAt(17.6, 1.6, 30.6);
    for (let i = 0; i < 240; i++) session.step(dt, { ...idle, aim: true });
    expect(session.economy.till).toBe(0); expect(session.economy.money).toBe(210);
    expect(session.journal.events.filter((event) => event.kind === 'robbery')).toHaveLength(1);
    expect(session.journal.events.some((event) => event.kind === 'report')).toBe(true);
    expect(session.police.state).not.toBe('patrol');
    expect(session.journal.posts.some((post) => post.event.kind === 'threat' || post.event.kind === 'robbery')).toBe(true);
    session.step(dt, { ...idle, aim: true, fire: true });
    expect(session.weapon.rounds).toBe(7); expect(session.population.cashier.actor.health).toBe(65);
    expect(session.population.people[1].actor.health).toBe(100);
  } finally { session.dispose(); player.dispose(); physics.dispose(); }
});
