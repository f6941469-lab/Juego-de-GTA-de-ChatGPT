import type { Scene } from 'three';
import type { Physics, Point3 } from '../physics/physics';
import { createActor } from './actor';
import { eyes, Journal, planarDistance } from './model';
import type { Navigation } from './navigation';

export function createPolice(scene: Scene, physics: Physics, navigation: Navigation, journal: Journal, playerHandle: number, detained: () => void) {
  const patrol = [{ x: 34.3, y: 0.08, z: 41 }, { x: 34.3, y: 0.08, z: 51 }];
  const units = patrol.map((point, index) => ({ id: `person:police:${index}`, actor: createActor(scene, physics, navigation, point, 0x304f7c), stop: 0, arrestTime: 0 }));
  let state: 'patrol' | 'respond' | 'pursue' | 'search' = 'patrol';
  let cursor = 0;
  let lastKnown: Point3 | undefined;
  let identified = false;
  let searchTime = 0;
  let lostTime = 0;
  let incidents = new Set<number>();
  function sees(index: number, point: Point3) {
    const actor = units[index].actor;
    if (actor.health <= 0 || planarDistance(actor.position, point) > 19) return false;
    const dx = point.x - actor.position.x; const dz = point.z - actor.position.z;
    if (Math.hypot(dx, dz) > 3 && (dx * Math.sin(actor.heading) - dz * Math.cos(actor.heading)) / Math.hypot(dx, dz) < 0) return false;
    return physics.canSee(eyes(actor.position), eyes(point), [actor.collider.handle, playerHandle]);
  }
  function receive(point: Point3, known: boolean, incident: number) {
    if (incidents.has(incident)) return;
    incidents.add(incident);
    if (incidents.size > 96) incidents.delete(incidents.values().next().value!);
    lastKnown = { ...point }; identified ||= known;
    const approach = Math.min(...units.map(unit => planarDistance(unit.actor.position, point)));
    searchTime = Math.min(70, 22 + Math.max(0, approach - 35) / 2.8);
    if (state !== 'pursue') state = 'respond';
  }
  return {
    units,
    get state() { return state; },
    get lastKnown() { return lastKnown; },
    get identified() { return identified; },
    step(dt: number, now: number, player: Point3, armed: boolean) {
      for (const event of journal.since(cursor)) {
        cursor = event.id;
        if (event.kind === 'report') receive(event.position, event.identified, event.incident ?? event.id);
        else if (event.source === 'player' && now - event.time < 1 && units.some((_, index) => sees(index, event.position))) receive(event.position, true, event.id);
      }
      const observed = state !== 'patrol' && units.some((_, index) => sees(index, player));
      if (observed && (identified || armed)) {
        identified = true; state = 'pursue'; lastKnown = { ...player }; lostTime = 0; searchTime = 22;
      } else if (state === 'pursue') {
        lostTime += dt;
        if (lostTime > 1.1) state = 'search';
      }
      if (state === 'search' || state === 'respond') {
        searchTime = Math.max(0, searchTime - dt);
        if (searchTime === 0) { state = 'patrol'; identified = false; lastKnown = undefined; }
      }
      for (const [index, unit] of units.entries()) {
        const { actor } = unit;
        actor.action('relaxed');
        if (actor.health <= 0) continue;
        if (state === 'patrol') {
          unit.arrestTime = 0;
          const goal = patrol[(unit.stop + index) % patrol.length];
          actor.goTo(goal, 1.45);
          if (actor.arrived || actor.stuck > 3) unit.stop++;
        } else if (lastKnown) {
          const goal = { ...lastKnown };
          // Units approach from separate sides when space permits.
          const offset = { ...goal, x: goal.x + (index === 0 ? -0.85 : 0.85) };
          actor.goTo(navigation.walkable(offset) ? offset : goal, state === 'pursue' ? 4.2 : 2.8);
          if (state === 'respond' && actor.arrived) state = 'search';
          if (observed && sees(index, player)) {
            actor.face(player, dt); actor.action('aim');
            if (planarDistance(actor.position, player) < 1.7) unit.arrestTime += dt;
            else unit.arrestTime = 0;
          } else unit.arrestTime = 0;
          if (unit.arrestTime >= 1.4) { detained(); break; }
        }
      }
    },
    reset() {
      state = 'patrol'; cursor = 0; identified = false; lastKnown = undefined; searchTime = lostTime = 0; incidents.clear();
      for (const unit of units) { unit.actor.reset(); unit.stop = unit.arrestTime = 0; }
    },
    dispose() { for (const unit of units) unit.actor.dispose(); },
  };
}
