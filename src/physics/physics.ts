import RAPIER from '@dimforge/rapier3d-compat';

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

export async function createPhysics(boxes: readonly StaticBox[]) {
  rapierReady ??= RAPIER.init();
  await rapierReady;

  const world = new RAPIER.World({ x: 0, y: -19.5, z: 0 });
  for (const { x, y, z, halfX, halfY, halfZ } of boxes) {
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(halfX, halfY, halfZ).setTranslation(x, y, z),
    );
  }
  // Populate the broad phase so character and camera queries work on the first frame.
  world.step();

  return {
    world,
    step(dt: number) {
      world.timestep = dt;
      world.step();
    },
    addBox(box: StaticBox) {
      return world.createCollider(RAPIER.ColliderDesc.cuboid(box.halfX, box.halfY, box.halfZ)
        .setTranslation(box.x, box.y, box.z));
    },
    raycast(origin: Point3, direction: Point3, distance: number, ignored: readonly number[] = []) {
      return world.castRayAndGetNormal(new RAPIER.Ray(origin, direction), distance, true,
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS, undefined, undefined, undefined,
        (collider) => !ignored.includes(collider.handle));
    },
    canSee(from: Point3, to: Point3, ignored: readonly number[] = []) {
      const distance = Math.hypot(to.x - from.x, to.y - from.y, to.z - from.z);
      if (distance < 0.01) return true;
      const hit = this.raycast(from, {
        x: (to.x - from.x) / distance, y: (to.y - from.y) / distance, z: (to.z - from.z) / distance,
      }, Math.max(0, distance - 0.05), ignored);
      return hit === null;
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
  const cameraProbe = new RAPIER.Ball(0.23);

  return {
    collider,
    move(dt: number, delta: Point3) {
      // Queue every actor before the owner advances the world exactly once.
      void dt;
      controller.computeColliderMovement(collider, delta, RAPIER.QueryFilterFlags.EXCLUDE_SENSORS);
      const movement = controller.computedMovement();
      const center = body.translation();
      body.setNextKinematicTranslation({
        x: center.x + movement.x,
        y: center.y + movement.y,
        z: center.z + movement.z,
      });
      return { movement, grounded: controller.computedGrounded() };
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

    cameraClearFraction(origin: Point3, offset: Point3) {
      // The offset is the entire displacement, so the time of impact is a fraction in [0, 1].
      const hit = world.castShape(
        origin,
        CAMERA_ORIENTATION,
        offset,
        cameraProbe,
        CHARACTER_SKIN,
        1,
        false,
        RAPIER.QueryFilterFlags.EXCLUDE_SENSORS,
        undefined,
        collider,
        undefined,
        // Pedestrians must not compress the boom as they walk behind the player.
        (candidate) => candidate.shapeType() !== RAPIER.ShapeType.Capsule,
      );
      return hit ? Math.max(0, hit.time_of_impact) : 1;
    },

    dispose() {
      world.removeCharacterController(controller);
      world.removeRigidBody(body);
    },
  };
}
