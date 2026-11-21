import type { Scene } from 'three';
import type { Physics, Point3 } from '../physics/physics';
import { shop } from '../world/generation/shop';
import { createActor, type Actor } from './actor';
import { eyes, Journal, planarDistance, type WorldEvent } from './model';
import type { Navigation } from './navigation';
import type { WorldState } from './world-state';
import { cityResidents } from './city-residents';

export const populationLimits = { decisionsPerStep: 4 } as const;

export type CivilianState = 'routine' | 'browsing' | 'nervous' | 'reacting' | 'reporting' | 'fleeing' | 'recovering' | 'down';
interface Civilian {
  id: string; name: string; actor: Actor; role: 'cashier' | 'customer' | 'walker'; personality: 'flee' | 'call' | 'record';
  nextDecision: number; lastDecision: number;
  state: CivilianState; timer: number; route: Point3[]; stop: number; cursor: number;
  memory?: { event: WorldEvent; identified: boolean }; fearUntil: number;
}
export function createPopulation(scene: Scene, physics: Physics, navigation: Navigation, journal: Journal, playerHandle: number) {
  const walk = [{ x: 8, y: 0.08, z: 41 }, { x: 22, y: 0.08, z: 41 }, { x: 22, y: 0.08, z: 36 }];
  const specs = [
    { id: 'person:mara', name: 'Mara', spawn: shop.cashier, role: 'cashier', color: 0xd69751, personality: 'call', route: [] },
    { id: 'person:luz', name: 'Luz', spawn: shop.products, role: 'customer', color: 0xb76378, personality: 'record', route: [shop.products, shop.counter, shop.entrance, walk[1], shop.entrance] },
    { id: 'person:tomas', name: 'Tomás', spawn: walk[1], role: 'walker', color: 0x7096b1, personality: 'call', route: [walk[0], walk[1], walk[2]] },
    { id: 'person:sol', name: 'Sol', spawn: walk[0], role: 'walker', color: 0xe1ad6a, personality: 'flee', route: [walk[1], walk[2], walk[0]] },
  ] as const;
  const definitions = [...specs, ...cityResidents(navigation)];
  const people: Civilian[] = definitions.map((spec) => ({ ...spec, route: [...spec.route], actor: createActor(scene, physics, navigation, spec.spawn, spec.color, spec.role === 'cashier' ? Math.PI : 0), nextDecision: 0, lastDecision: 0, state: 'routine', timer: 0, stop: 0, cursor: 0, fearUntil: 0 }));
  const safePlaces = [{ x: 8, y: 0.08, z: 51 }, { x: 22, y: 0.08, z: 51 }, { x: 34.3, y: 0.08, z: 41 }];
  function sees(person: Civilian, point: Point3, fov = true) {
    const { actor } = person; const distance = planarDistance(actor.position, point);
    if (distance > 22) return false;
    if (fov && distance > 2 && ((point.x - actor.position.x) * Math.sin(actor.heading) - (point.z - actor.position.z) * Math.cos(actor.heading)) / distance < 0.25) return false;
    return physics.canSee(eyes(actor.position), eyes(point), [actor.collider.handle, playerHandle]);
  }
  function notice(person: Civilian, event: WorldEvent, identified: boolean) {
    if (person.memory && event.time - person.memory.event.time < 3) return;
    person.memory = { event, identified }; person.state = 'reacting';
    person.timer = 0.35 + people.indexOf(person) * 0.18; person.fearUntil = event.time + 14;
    person.actor.goTo(undefined);
  }
  let decisionCursor = 0;
  const stats = { decisions: 0, deferred: 0 };
  const api = {
    people, stats,
    cashier: people[0],
    step(dt: number, now: number, player: Point3, armed: boolean, world?: WorldState) {
      stats.decisions = 0;
      const first = decisionCursor;
      decisionCursor = (decisionCursor + 1) % people.length;
      for (let offset = 0; offset < people.length; offset++) {
        const index = (first + offset) % people.length;
        const person = people[index];
        const { actor } = person;
        if (actor.health <= 0) { person.state = 'down'; continue; }
        if (now < person.nextDecision) continue;
        if (stats.decisions >= populationLimits.decisionsPerStep) { stats.deferred++; continue; }
        stats.decisions++;
        const decisionDt = Math.max(dt, now - person.lastDecision);
        person.lastDecision = now;
        const tier = world?.tier(person.id) ?? 'near';
        const urgent = !['routine', 'browsing'].includes(person.state);
        person.nextDecision = now + (urgent ? 0.05 : tier === 'far' ? 0.6 : tier === 'middle' ? 0.25 : 0.1);
        person.timer = Math.max(0, person.timer - decisionDt);
        for (const event of journal.since(person.cursor)) {
          person.cursor = event.id;
          if (event.kind === 'report' || now - event.time > 2) continue;
          const visible = sees(person, event.position);
          const distance = planarDistance(actor.position, event.position);
          const audible = ['shot', 'glass', 'collision'].includes(event.kind) && distance < (sees(person, event.position, false) ? 26 : 9);
          if (visible || audible) notice(person, event, visible && event.identified);
        }
        actor.action('relaxed');
        if (person.state === 'reacting') {
          actor.action('handsUp'); actor.face(person.memory!.event.position, decisionDt);
          if (person.timer === 0) {
            person.state = person.personality === 'flee' ? 'fleeing' : 'reporting'; person.timer = 2.1;
          }
        } else if (person.state === 'reporting') {
          actor.action(person.role === 'cashier' ? 'handsUp' : 'phone');
          if (person.timer === 0 && person.memory) {
            const { event, identified } = person.memory;
            journal.publish('report', event.position, now, person.id, identified, event.id);
            if (person.personality === 'record' && identified) journal.post(person.name, event);
            person.state = person.role === 'cashier' ? 'recovering' : 'fleeing'; person.timer = 9;
          }
        } else if (person.state === 'fleeing') {
          if (actor.arrived || actor.stuck > 2.5) {
            const destinations = (index < 4 ? [...safePlaces] : [...person.route]).sort((a, b) => planarDistance(b, person.memory?.event.position ?? player) - planarDistance(a, person.memory?.event.position ?? player));
            actor.goTo(destinations[(actor.stuck > 2.5 ? 1 : 0)], 3.8);
          }
          if (now >= person.fearUntil) { person.state = 'recovering'; person.timer = 3; actor.goTo(undefined); }
        } else if (person.state === 'recovering') {
          if (person.role === 'cashier') actor.action('handsUp');
          if (person.timer === 0) { person.state = 'routine'; person.memory = undefined; }
        } else if (armed && planarDistance(actor.position, player) < 10 && sees(person, player)) {
          person.state = 'nervous'; actor.goTo(undefined); actor.face(player, decisionDt); actor.action('handsUp'); person.timer = 2;
        } else if (person.state === 'nervous') {
          if (person.timer === 0) person.state = 'routine';
        } else if (person.role === 'cashier') {
          actor.goTo(shop.cashier, 1.3);
          if (planarDistance(actor.position, player) < 5) actor.face(player, decisionDt);
        } else if (person.state === 'browsing') {
          if (person.timer === 0) { person.stop = (person.stop + 1) % person.route.length; person.state = 'routine'; }
        } else {
          actor.goTo(person.route[person.stop], 1.3 + (index % 4) * 0.12);
          if (actor.arrived || actor.stuck > 3) { person.state = 'browsing'; person.timer = person.role === 'customer' ? 3.5 : 1.2; actor.goTo(undefined); }
        }
      }
    },
    reset() { decisionCursor = 0; stats.decisions = stats.deferred = 0; for (const person of people) { person.actor.reset(); person.state = 'routine'; person.timer = person.cursor = person.stop = person.fearUntil = person.nextDecision = person.lastDecision = 0; person.memory = undefined; } },
    dispose() { for (const person of people) person.actor.dispose(); },
  };
  return api;
}
