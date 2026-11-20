import RAPIER from '@dimforge/rapier3d-compat';
import { SpatialBoxGrid } from './spatial-index';

export interface StaticBox {
  x: number;
  y: number;
  z: number;
  halfX: number;
  halfY: number;
  halfZ: number;
}

export interface Point3 {
  x: number;
  y: number;
  z: number;
}

let rapierReady: Promise<void> | undefined;

export interface PhysicsOptions {
  streamingRadius?: number;
  initialFocus?: { x: number; z: number };
}

function boxDistance2D(box: StaticBox, x: number, z: number): number {
  const dx = Math.max(0, box.x - box.halfX - x, x - (box.x + box.halfX));
  const dz = Math.max(0, box.z - box.halfZ - z, z - (box.z + box.halfZ));
  return Math.hypot(dx, dz);
}

export async function createPhysics(boxes: readonly StaticBox[], options?: PhysicsOptions) {
  rapierReady ??= RAPIER.init();
  await rapierReady;

  const world = new RAPIER.World({ x: 0, y: -19.5, z: 0 });
  const streamingRadius = options?.streamingRadius;
  const hysteresis = 16;

  interface ManagedBox {
    box: StaticBox;
    collider?: RAPIER.Collider;
  }

  const managed: ManagedBox[] = [];
  let activeColliders = 0;
  let lastStreamX = Infinity;
  let lastStreamZ = Infinity;

  function mountBox(entry: ManagedBox): void {
    if (entry.collider) return;
    const { x, y, z, halfX, halfY, halfZ } = entry.box;
    entry.collider = world.createCollider(
      RAPIER.ColliderDesc.cuboid(halfX, halfY, halfZ).setTranslation(x, y, z),
    );
    activeColliders++;
  }

  function unmountBox(entry: ManagedBox): void {
    if (!entry.collider) return;
    world.removeCollider(entry.collider, false);
    entry.collider = undefined;
    activeColliders--;
  }

  for (const box of boxes) {
    managed.push({ box });
  }

  function streamFocus(x: number, z: number, force = false): void {
    if (streamingRadius === undefined) return;
    if (!force && Math.hypot(x - lastStreamX, z - lastStreamZ) < 8) return;
    lastStreamX = x;
    lastStreamZ = z;
    const unloadRadius = streamingRadius + hysteresis;
    for (const entry of managed) {
      const dist = boxDistance2D(entry.box, x, z);
      if (!entry.collider && dist <= streamingRadius) {
        mountBox(entry);
      } else if (entry.collider && dist > unloadRadius) {
        unmountBox(entry);
      }
    }
  }

  if (streamingRadius === undefined) {
    for (const entry of managed) mountBox(entry);
  } else {
    const start = options?.initialFocus ?? { x: 0, z: 0 };
    streamFocus(start.x, start.z, true);
  }

  const spatial = new SpatialBoxGrid(boxes);
  // Populate the broad phase so character and camera queries work on the first frame.
  world.step();

  return {
    world,
    spatial,
    streamFocus,
    get activeStaticColliders() {
      return activeColliders;
    },
    get totalStaticColliders() {
      return managed.length;
    },
    step(dt: number) {
      world.timestep = dt;
      world.step();
    },
    dispose() {
      world.free();
    },
  };
}

export type Physics = Awaited<ReturnType<typeof createPhysics>>;

const CAPSULE_RADIUS = 0.32;
const CAPSULE_SEGMENT_HALF_HEIGHT = 0.58;
const CHARACTER_SKIN = 0.025;
const CENTER_FROM_FEET = CAPSULE_RADIUS + CAPSULE_SEGMENT_HALF_HEIGHT + CHARACTER_SKIN;
const CAMERA_ORIENTATION = { x: 0, y: 0, z: 0, w: 1 };
const enabled = (collider: RAPIER.Collider) => collider.isEnabled();

export function createCameraClearance({ world }: Pick<Physics, 'world'>, excluded: RAPIER.Collider) {
  const cameraProbe = new RAPIER.Ball(0.23);
  return (origin: Point3, offset: Point3) => {
    // The offset is the entire displacement, so the time of impact is a fraction in [0, 1].
    const hit = world.castShape(
      origin, CAMERA_ORIENTATION, offset, cameraProbe, CHARACTER_SKIN, 1, false,
      RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, excluded, undefined,
      (candidate) => enabled(candidate) && candidate.shapeType() !== RAPIER.ShapeType.Capsule,
    );
    return hit ? Math.max(0, hit.time_of_impact) : 1;
  };
}

export function createExitClearance({ world }: Physics, excluded: RAPIER.Collider) {
  const occupant = new RAPIER.Capsule(CAPSULE_SEGMENT_HALF_HEIGHT, CAPSULE_RADIUS);
  const filters = RAPIER.QueryFilterFlags.EXCLUDE_SENSORS;
  return (origin: Point3, destination: Point3): Point3 | null => {
    const top = { ...destination, y: destination.y + 0.48 };
    const floor = world.castRayAndGetNormal(
      new RAPIER.Ray(top, { x: 0, y: -1, z: 0 }), 0.95, true, filters, undefined, excluded, undefined, enabled,
    );
    if (!floor || floor.normal.y < 0.65) return null;

    const feet = { ...destination, y: top.y - floor.timeOfImpact };
    const center = { ...feet, y: feet.y + CENTER_FROM_FEET };
    const blocked = world.intersectionWithShape(
      center, CAMERA_ORIENTATION, occupant, filters, undefined, excluded, undefined, enabled,
    );
    if (blocked) return null;

    // Check that the door and the confirmed standing space are connected.
    const door = { ...origin, y: center.y };
    const offset = { x: center.x - door.x, y: 0, z: center.z - door.z };
    const barrier = world.castRay(
      new RAPIER.Ray(door, offset), 1, true, filters, undefined, excluded, undefined, enabled,
    );
    return barrier ? null : feet;
  };
}

export function createCharacterCollider({ world }: Physics, spawn: Point3) {
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(spawn.x, spawn.y + CENTER_FROM_FEET, spawn.z),
  );
  const collider = world.createCollider(
    RAPIER.ColliderDesc.capsule(CAPSULE_SEGMENT_HALF_HEIGHT, CAPSULE_RADIUS),
    body,
  );
  const controller = world.createCharacterController(CHARACTER_SKIN);
  controller.enableAutostep(0.23, 0.24, false);
  controller.enableSnapToGround(0.19);
  function prepareMove(dt: number, delta: Point3) {
    world.timestep = dt;
    controller.computeColliderMovement(collider, delta, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS);
    const movement = controller.computedMovement();
    const center = body.translation();
    body.setNextKinematicTranslation({
      x: center.x + movement.x,
      y: center.y + movement.y,
      z: center.z + movement.z,
    });
    return { movement, grounded: controller.computedGrounded() };
  }

  return {
    prepareMove,
    move(dt: number, delta: Point3) {
      const result = prepareMove(dt, delta);
      world.step();
      return result;
    },

    readFeet() {
      const center = body.translation();
      return { x: center.x, y: center.y - CENTER_FROM_FEET, z: center.z };
    },

    warp(feet: Point3) {
      const center = { x: feet.x, y: feet.y + CENTER_FROM_FEET, z: feet.z };
      body.setTranslation(center, true);
      body.setNextKinematicTranslation(center);
      world.propagateModifiedBodyPositionsToColliders();
    },

    setEnabled(enabled: boolean) {
      collider.setEnabled(enabled);
      body.setEnabled(enabled);
    },

    canReach(target: Point3, handle: number) {
      const origin = body.translation();
      const offset = { x: target.x - origin.x, y: target.y - origin.y, z: target.z - origin.z };
      const hit = world.castRay(
        new RAPIER.Ray(origin, offset), 1, true, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, collider, undefined, enabled,
      );
      return !hit || hit.collider.handle === handle;
    },

    cameraClearFraction: createCameraClearance({ world }, collider),

    dispose() {
      world.removeCharacterController(controller);
      world.removeRigidBody(body);
    },
  };
}
