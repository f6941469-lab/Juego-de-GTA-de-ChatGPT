import { PerspectiveCamera, Scene, Vector3 } from 'three';
import type { GameAudio } from '../audio/audio';
import type { Command, InputContext } from '../core/input';
import type { Physics, StaticBox } from '../physics/physics';
import type { createPlayer, MovementInput } from '../player/player';
import { shop } from '../world/generation/shop';
import { createFeedback } from './feedback';
import { Economy, eyes, Journal, planarDistance, products, Weapon } from './model';
import { Navigation } from './navigation';
import { createPolice } from './police';
import { createPopulation } from './population';
import { createTraffic } from './traffic';
import { WorldState } from './world-state';
import type { Actor } from './actor';

type Player = ReturnType<typeof createPlayer>;
export type PhonePage = 'home' | 'feed' | 'bag' | 'help';
const idle = { x: 0, z: 0, run: false, jump: false, aim: false, fire: false };
export function createSession(scene: Scene, camera: PerspectiveCamera, physics: Physics, boxes: readonly StaticBox[], player: Player, audio: GameAudio, onContext: (context: InputContext) => void) {
  const journal = new Journal(); const economy = new Economy(); const weapon = new Weapon();
  const world = new WorldState();
  const navigation = new Navigation(boxes);
  const feedback = createFeedback(scene, physics, (glass, changed) => navigation.rebuild([...boxes, ...glass], changed));
  const population = createPopulation(scene, physics, navigation, journal, player.collider.handle);
  const traffic = createTraffic(scene, physics, journal);
  let now = 0; let overlay: InputContext = 'world'; let phonePage: PhonePage = 'home'; let selection = 0;
  let notice = ''; let noticeUntil = 0; let threatTime = 0; let threatSent = false; let robberyPaid = false;
  let aim = false; let health = 100; let hitUntil = 0; let footDistance = 0; let muted = false; let detention = false;
  const previousFeet = player.position.clone();
  const direction = new Vector3();
  let emptyLatched = false;
  const police = createPolice(scene, physics, navigation, journal, player.collider.handle, () => { detention = true; });
  const actors = [...population.people.map((person) => person.actor), ...police.units.map((unit) => unit.actor)];
  const walkers = [{ owner: player.collider.handle, position: player.position },
    ...actors.map(actor => ({ owner: actor.collider.handle, position: actor.position, get active() { return actor.health > 0; } }))];
  function registerActor(id: string, actor: Actor) {
    world.register({ id, kind: 'person', position: actor.position,
      get heading() { return actor.heading; }, get health() { return actor.health; } });
  }
  world.register({ id: 'player', kind: 'person', position: player.position,
    get heading() { return player.heading; }, get health() { return health; } });
  for (const person of population.people) registerActor(person.id, person.actor);
  for (const unit of police.units) registerActor(unit.id, unit.actor);
  for (const car of traffic.cars) {
    world.register({ id: car.id, kind: 'vehicle', position: car.position, get heading() { return car.heading; } });
    world.register({ id: car.driverId, kind: 'person', position: car.position, vehicleId: car.id });
    world.register({ id: car.seatId, kind: 'seat', position: car.position, occupantId: car.driverId, vehicleId: car.id });
  }
  world.register({ id: shop.id, kind: 'shop', position: shop.counter });
  for (const window of feedback.windows) {
    world.register({ id: window.id, kind: 'damage', position: window.box, get health() { return window.intact ? 100 : 0; } });
  }
  world.update(0, player.position);
  physics.step(1 / 60);
  function tell(message: string, sound = false) { notice = message; noticeUntil = now + 4; if (sound) audio.play('notice'); }
  function context(value: InputContext) { overlay = value; selection = 0; aim = false; player.setWeapon(weapon.equipped, false); onContext(value); }
  function canTrade() {
    const merchant = population.cashier;
    return !weapon.equipped && merchant.actor.health > 0 && ['routine', 'browsing'].includes(merchant.state)
      && player.position.y < 0.7 && planarDistance(player.position, shop.counter) < 2.1
      && physics.canSee(eyes(player.position), eyes(merchant.actor.position), [player.collider.handle, merchant.actor.collider.handle]);
  }
  function buy(index: number) {
    if (!canTrade()) { tell('El mostrador no está disponible'); context('world'); return; }
    const product = products[index]; if (!product) return;
    const error = economy.buy(product.id);
    if (error) tell(error, true);
    else { tell(`${product.name} en tu mochila · −$${product.price}`); audio.play('purchase'); }
  }
  function use(index: number) {
    const product = products[index]; if (!product) return;
    if (product.id === 'ammo' && weapon.reserve > 108) { tell('Reserva de munición llena'); return; }
    if (product.id !== 'ammo' && health >= 100) { tell('Tu salud ya está al máximo'); return; }
    if (!economy.use(product.id)) { tell('No tienes este producto'); return; }
    if (product.id === 'ammo') weapon.reserve += 12;
    else health = Math.min(100, health + (product.id === 'water' ? 15 : 30));
    tell(`${product.name} utilizado`); audio.play('purchase');
  }
  function select(index: number) {
    selection = index;
    if (overlay === 'shop') buy(index);
    else if (overlay === 'phone') {
      if (phonePage === 'home') {
        if (index === 3) { muted = !muted; audio.setMuted(muted); tell(muted ? 'Sonido desactivado' : 'Sonido activado'); }
        else { phonePage = (['feed', 'bag', 'help'] as const)[index] ?? 'home'; selection = 0; }
      } else if (phonePage === 'bag') use(index);
      else if (phonePage === 'feed' && journal.posts.length) tell('Testimonio real. La grabación de video todavía no está disponible.');
    }
  }
  function command(command: Command) {
    if (overlay !== 'world') {
      if (command === 'back') { if (overlay === 'phone' && phonePage !== 'home') { phonePage = 'home'; selection = 0; } else context('world'); }
      else if (['up', 'down', 'left', 'right'].includes(command)) {
        const count = overlay === 'shop' || phonePage === 'bag' ? 3 : phonePage === 'home' ? 4 : Math.max(1, journal.posts.length);
        const delta = command === 'up' || command === 'left' ? -1 : 1; selection = (selection + delta + count) % count;
      } else if (command === 'confirm' || command === 'interact') select(selection);
      return;
    }
    if (command === 'phone') { weapon.equipped = false; weapon.reloadTime = 0; phonePage = 'home'; context('phone'); audio.play('notice'); }
    else if (command === 'interact') {
      if (canTrade()) context('shop');
      else tell(weapon.equipped ? 'Guarda la pistola con 1 para comprar' : planarDistance(player.position, shop.entrance) < 12 ? 'Acércate al mostrador. La entrada central está abierta.' : 'Mercado Palma está junto a Club Neón; búscalo en el mapa.');
    } else if (command === 'equip') { weapon.toggle(); tell(weapon.equipped ? 'Pistola equipada · botón derecho para apuntar' : 'Pistola guardada'); }
    else if (command === 'reload') { if (weapon.reload()) audio.play('reload'); else tell(weapon.rounds === 8 ? 'Cargador lleno' : 'Sin munición de reserva'); }
  }
  function aimHit() {
    camera.getWorldDirection(direction);
    return physics.raycast(camera.position, direction, 70, [player.collider.handle]);
  }
  function shoot() {
    const targetHit = aimHit();
    const target = camera.position.clone().addScaledVector(direction, targetHit?.timeOfImpact ?? 70);
    const yaw = player.aimHeading;
    const muzzle = new Vector3(player.position.x + Math.sin(yaw) * 0.65 + Math.cos(yaw) * 0.3, player.position.y + 1.36, player.position.z - Math.cos(yaw) * 0.65 + Math.sin(yaw) * 0.3);
    const trajectory = target.clone().sub(muzzle); const distance = trajectory.length(); trajectory.normalize();
    const hit = physics.raycast(muzzle, trajectory, distance + 0.01, [player.collider.handle]);
    const impact = muzzle.clone().addScaledVector(trajectory, hit?.timeOfImpact ?? distance);
    feedback.shot(muzzle, impact, hit !== null); audio.play('shot', muzzle); player.kick();
    journal.publish('shot', player.position, now);
    if (!hit) return;
    if (feedback.hit(hit.collider.handle, impact)) { journal.publish('glass', impact, now, 'impact', false); audio.play('glass', impact); hitUntil = now + 0.15; }
    const actor = actors.find((actor) => actor.collider.handle === hit.collider.handle);
    if (actor) { actor.hurt(35); audio.play('impact', impact); hitUntil = now + 0.18; }
    else if (!feedback.windows.some((window) => window.collider.handle === hit.collider.handle)) audio.play('impact', impact);
  }
  function reset() {
    context('world'); now = 0; journal.reset(); economy.reset(); weapon.reset(); population.reset(); police.reset(); traffic.reset(); feedback.reset(); player.reset();
    health = 100; threatTime = footDistance = 0; threatSent = robberyPaid = detention = emptyLatched = false; hitUntil = 0; previousFeet.copy(player.position);
    world.reset(player.position);
    physics.step(1 / 60); tell('Mercado Palma · entra por la puerta central y acércate a Mara');
  }
  const api = {
    journal, economy, weapon, population, police, traffic, feedback, navigation, world,
    get time() { return now; }, get overlay() { return overlay; }, get phonePage() { return phonePage; }, get selection() { return selection; },
    get health() { return health; }, get muted() { return muted; }, get aiming() { return aim; }, get hit() { return now < hitUntil; },
    get notice() { return now < noticeUntil ? notice : ''; },
    get threat() { return threatTime > 0 ? Math.min(1, threatTime / 3) : 0; },
    get prompt() { return canTrade() ? 'E · Hablar con Mara / comprar' : planarDistance(player.position, shop.entrance) < 5 ? 'Mercado Palma · entrada abierta' : ''; },
    command, select,
    closeOverlay() { context('world'); },
    step(dt: number, controls: MovementInput & { aim: boolean; fire: boolean }) {
      navigation.beginStep(walkers);
      now += dt; const input = overlay === 'world' ? controls : idle;
      weapon.tick(dt); aim = weapon.equipped && (input.aim || input.fire);
      player.setWeapon(weapon.equipped, aim); previousFeet.copy(player.position); player.prepareStep(dt, input);
      population.step(dt, now, player.position, weapon.equipped, world); police.step(dt, now, player.position, weapon.equipped);
      actors.forEach((actor) => actor.prepare(dt)); traffic.prepare(dt, now);
      physics.step(dt); player.finishStep(dt); actors.forEach((actor) => actor.finish(dt)); traffic.finish();
      footDistance += planarDistance(previousFeet, player.position);
      if (footDistance > (input.run ? 1.65 : 1.3) && Math.abs(player.position.y - previousFeet.y) < 0.025) { footDistance = 0; audio.play('step', player.position); }
      if (input.fire && weapon.fire()) shoot();
      if (!input.fire) emptyLatched = false;
      else if (weapon.equipped && weapon.rounds === 0 && weapon.reloadTime === 0 && !emptyLatched) {
        emptyLatched = true;
        tell(weapon.reserve > 0 ? 'Cargador vacío · R para recargar' : 'Sin munición · compra una caja en el mercado', true);
      }
      const cashier = population.cashier.actor;
      const target = aim ? aimHit() : null;
      const threatening = aim && target?.collider.handle === cashier.collider.handle && planarDistance(player.position, cashier.position) < 11 && cashier.health > 0;
      if (threatening) {
        threatTime += dt;
        if (threatTime > 0.7 && !threatSent) { journal.publish('threat', player.position, now); threatSent = true; tell('Mara ha reconocido la amenaza'); }
        if (threatTime >= 3 && !robberyPaid) { const cash = economy.rob(); robberyPaid = true; journal.publish('robbery', player.position, now); tell(cash ? `Mara entrega $${cash} · hay testigos del asalto` : 'La caja está vacía'); audio.play('purchase'); }
      } else { threatTime = 0; threatSent = robberyPaid = false; }
      if (overlay === 'shop' && !canTrade()) { context('world'); tell('La atención se ha interrumpido'); }
      for (const car of traffic.cars) {
        if (car.speed > 2.8 && planarDistance(car.position, player.position) < 1.5 && player.position.y < 1 && now > hitUntil + 1) {
          health = Math.max(0, health - 20); hitUntil = now + 0.3; audio.play('impact', player.position); tell('Golpe de vehículo · usa comida desde la mochila');
        }
      }
      if (detention || health === 0) {
        reset(); economy.money = Math.max(0, economy.money - 30);
        tell('Traslado al inicio · nueva escena · $30 de gastos', true);
      }
      world.update(now, player.position);
      feedback.step(dt); audio.update(player.position, traffic.cars, police.state !== 'patrol', now);
    },
    render(alpha: number, dt: number) {
      for (const actor of actors) actor.render(alpha, dt, police.units.some((unit) => unit.actor === actor) && police.state === 'pursue', camera.position);
      traffic.render(alpha);
    },
    reset,
    dispose() { population.dispose(); police.dispose(); traffic.dispose(); feedback.dispose(); },
  };
  tell('Mercado Palma · entra por la puerta central y acércate a Mara');
  return api;
}
export type Session = ReturnType<typeof createSession>;
