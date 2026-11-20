import type { ColorRepresentation, Scene } from 'three';
import type { Physics, Point3 } from '../physics/physics';
import type { createPlayer, MovementInput } from '../player/player';
import { createVehicle, type VehicleSpawn } from './vehicle';

type Player = ReturnType<typeof createPlayer>;
export type DrivableVehicle = ReturnType<typeof createVehicle>;

interface ManagedVehicle {
  id: string;
  isPrimary: boolean;
  car: DrivableVehicle;
}

export function createVehicleManager(
  scene: Scene,
  physics: Physics,
  primarySpawn: VehicleSpawn,
  maxPool = 4,
) {
  const pool: ManagedVehicle[] = [
    {
      id: 'rayo-gt',
      isPrimary: true,
      car: createVehicle(scene, physics, { ...primarySpawn, label: 'Rayo GT' }),
    },
  ];
  let serial = 0;

  function activeEntry(): ManagedVehicle | undefined {
    return pool.find((entry) => entry.car.active);
  }

  function findInteractable(player: Player): ManagedVehicle | undefined {
    const active = activeEntry();
    if (active) return active.car.canInteract(player) ? active : undefined;

    let best: ManagedVehicle | undefined;
    let bestDist = Infinity;
    for (const entry of pool) {
      if (!entry.car.canInteract(player)) continue;
      const dist = Math.hypot(
        entry.car.position.x - player.position.x,
        entry.car.position.z - player.position.z,
      );
      if (dist < bestDist) {
        bestDist = dist;
        best = entry;
      }
    }
    return best;
  }

  function canInteract(player: Player): boolean {
    return findInteractable(player) !== undefined;
  }

  function interact(player: Player): { changed: boolean; entered: boolean; id?: string } {
    const target = findInteractable(player);
    if (!target) return { changed: false, entered: false };
    const wasActive = target.car.active;
    if (!target.car.interact(player)) return { changed: false, entered: false };
    return {
      changed: true,
      entered: !wasActive && target.car.active,
      id: target.id,
    };
  }

  function boardSpawned(
    player: Player,
    spawn: Point3 & { heading: number; paint?: ColorRepresentation; label?: string; initialSpeed?: number },
  ): ManagedVehicle {
    if (pool.length >= maxPool) {
      const victimIndex = pool.findIndex((entry) => !entry.isPrimary && !entry.car.active);
      const fallbackIndex = victimIndex >= 0 ? victimIndex : pool.findIndex((entry) => !entry.car.active);
      if (fallbackIndex >= 0) {
        const [removed] = pool.splice(fallbackIndex, 1);
        removed.car.dispose();
      }
    }
    const id = `stolen-car-${++serial}`;
    const car = createVehicle(scene, physics, {
      ...spawn,
      label: spawn.label ?? 'Vehículo',
    });
    const entry: ManagedVehicle = { id, isPrimary: false, car };
    pool.push(entry);
    car.boardImmediate(player, spawn.initialSpeed ?? 0);
    return entry;
  }

  function prepareStep(dt: number, input: MovementInput): void {
    const active = activeEntry();
    active?.car.prepareStep(dt, input);
  }

  function finishStep(dt: number): void {
    const active = activeEntry();
    active?.car.finishStep(dt);
  }

  function render(alpha: number, dt: number): void {
    for (const entry of pool) entry.car.render(alpha, dt);
  }

  function setLights(enabled: boolean): void {
    for (const entry of pool) entry.car.setLights(enabled);
  }

  function reset(player: Player): void {
    for (let i = pool.length - 1; i >= 0; i--) {
      const entry = pool[i];
      if (!entry.isPrimary) {
        entry.car.reset(player);
        entry.car.dispose();
        pool.splice(i, 1);
      } else {
        entry.car.reset(player);
      }
    }
  }

  function dispose(): void {
    for (const entry of pool) entry.car.dispose();
    pool.length = 0;
  }

  return {
    get primary() { return pool[0].car; },
    get active() { return activeEntry(); },
    get all(): readonly ManagedVehicle[] { return pool; },
    canInteract,
    interact,
    boardSpawned,
    prepareStep,
    finishStep,
    render,
    setLights,
    reset,
    dispose,
  };
}
