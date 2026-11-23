import { BoxGeometry, Group, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene, Vector3 } from 'three';
import type { Physics, Point3 } from '../physics/physics';
import { allShops } from '../world/generation/shop';
import { eyes, Journal, planarDistance, type RecordingFrame, type WitnessClip, type WorldEvent } from './model';
import type { Civilian } from './population';

interface ActiveCapture {
  clip: WitnessClip;
  event: WorldEvent;
  witness?: Civilian;
  fixedPoint?: Point3;
  sampleAcc: number;
  duration: number;
  droppedSamples: number;
  finished: boolean;
}

export interface ReplayActorSnapshot {
  id: string;
  position: Point3;
  heading: number;
  health: number;
  armed: boolean;
  color: number;
}

export interface ReplayVehicleSnapshot {
  id: string;
  position: Point3;
  heading: number;
  color: number;
  kind: 'car' | 'bus' | 'police' | 'metro';
}

export function createWitnessRecorder(scene: Scene, physics: Physics, journal: Journal) {
  const captures = new Map<string, ActiveCapture>();
  const streetCams: Array<{ id: string; name: string; pos: Point3 }> = [
    { id: 'cam:palma-av', name: 'Cámara Av. Palma', pos: { x: 4.8, y: 3.4, z: 43.2 } },
    { id: 'cam:centro', name: 'Cámara Centro', pos: { x: -19.5, y: 3.4, z: 4.5 } },
    { id: 'cam:norte', name: 'Cámara Norte', pos: { x: -42.0, y: 3.4, z: -61.0 } },
  ];

  // Isolated Three.js stage for non-destructive replay rendering
  const replayGroup = new Group();
  replayGroup.name = 'Replay isolated stage';
  replayGroup.visible = false;
  scene.add(replayGroup);
  const boxGeo = new BoxGeometry();
  const actorPool: Array<{ body: Mesh; head: Mesh; mat: MeshStandardMaterial }> = [];
  const vehiclePool: Array<{ body: Mesh; mat: MeshStandardMaterial }> = [];
  const headMat = new MeshStandardMaterial({ color: 0xbd7855, roughness: 0.85 });

  function nearestLocationName(point: Point3) {
    let best = 'Costa Palmera';
    let bestD = 26;
    for (const store of allShops) {
      const d = planarDistance(point, { x: store.centerX, z: store.centerZ });
      if (d < bestD) { bestD = d; best = store.name; }
    }
    return best;
  }

  function sampleFrame(
    now: number,
    camPos: Point3,
    lookTarget: Point3,
    dropped: boolean,
    actors: readonly ReplayActorSnapshot[],
    vehicles: readonly ReplayVehicleSnapshot[],
  ): RecordingFrame {
    const visibleActors = actors
      .filter((a) => planarDistance(camPos, a.position) < 42)
      .map((a) => ({
        id: a.id,
        x: a.position.x,
        y: a.position.y,
        z: a.position.z,
        heading: a.heading,
        health: a.health,
        action: a.armed ? 'aim' : 'relaxed',
        armed: a.armed,
        color: a.color,
      }));
    const visibleVehicles = vehicles
      .filter((v) => planarDistance(camPos, v.position) < 48 && v.position.y > -2)
      .map((v) => ({
        id: v.id,
        x: v.position.x,
        y: v.position.y,
        z: v.position.z,
        heading: v.heading,
        color: v.color,
        kind: v.kind,
      }));
    return {
      time: now,
      camX: camPos.x,
      camY: camPos.y,
      camZ: camPos.z,
      lookX: lookTarget.x,
      lookY: lookTarget.y,
      lookZ: lookTarget.z,
      dropped,
      actors: visibleActors,
      vehicles: visibleVehicles,
    };
  }

  function ensureActorMesh(index: number) {
    while (actorPool.length <= index) {
      const mat = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
      const body = new Mesh(boxGeo, mat);
      body.scale.set(0.5, 1.35, 0.3);
      const head = new Mesh(boxGeo, headMat);
      head.scale.set(0.32, 0.32, 0.32);
      replayGroup.add(body, head);
      actorPool.push({ body, head, mat });
    }
    return actorPool[index];
  }

  function ensureVehicleMesh(index: number) {
    while (vehiclePool.length <= index) {
      const mat = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.65 });
      const body = new Mesh(boxGeo, mat);
      replayGroup.add(body);
      vehiclePool.push({ body, mat });
    }
    return vehiclePool[index];
  }

  let lastEventId = 0;
  const lookVec = new Vector3();

  return {
    step(
      dt: number,
      now: number,
      people: readonly Civilian[],
      playerPos: Point3,
      getSnapshots: () => { actors: readonly ReplayActorSnapshot[]; vehicles: readonly ReplayVehicleSnapshot[] },
    ) {
      // 1. Start witness captures for civilians currently holding up phone in 'recording'
      for (const person of people) {
        if (person.state === 'recording' && person.recordingEvent) {
          const key = `${person.id}:${person.recordingEvent.id}`;
          if (!captures.has(key)) {
            const clip: WitnessClip = {
              clipId: key,
              authorId: person.id,
              author: `${person.name} (Móvil)`,
              incidentId: person.recordingEvent.id,
              locationName: nearestLocationName(person.recordingEvent.position),
              status: 'live',
              frames: [],
            };
            captures.set(key, {
              clip,
              event: person.recordingEvent,
              witness: person,
              sampleAcc: 0.2,
              duration: 0,
              droppedSamples: 0,
              finished: false,
            });
          }
        }
      }

      // 2. Trigger nearby street CCTV cameras only on newly published major incidents
      for (const evt of journal.since(lastEventId)) {
        lastEventId = evt.id;
        if (now - evt.time > 0.5) continue;
        if (!['shot', 'robbery', 'theft', 'collision'].includes(evt.kind)) continue;
        for (const cam of streetCams) {
          if (planarDistance(cam.pos, evt.position) > 34) continue;
          const key = `${cam.id}:${evt.id}`;
          if (!captures.has(key) && physics.canSee(cam.pos, eyes(evt.position), [])) {
            captures.set(key, {
              clip: {
                clipId: key,
                authorId: cam.id,
                author: cam.name,
                incidentId: evt.id,
                locationName: nearestLocationName(evt.position),
                status: 'live',
                frames: [],
              },
              event: evt,
              fixedPoint: cam.pos,
              sampleAcc: 0.2,
              duration: 0,
              droppedSamples: 0,
              finished: false,
            });
          }
        }
      }

      if (captures.size === 0) return;

      // 3. Advance all active captures & commit progressive segments (lazy snapshot construction)
      let cachedSnaps: { actors: readonly ReplayActorSnapshot[]; vehicles: readonly ReplayVehicleSnapshot[] } | undefined;
      for (const cap of captures.values()) {
        if (cap.finished) continue;
        cap.duration += dt;
        cap.sampleAcc += dt;

        const witnessDown = cap.witness ? cap.witness.actor.health <= 0 : false;
        const witnessFled = cap.witness ? (cap.witness.state !== 'recording' && !witnessDown) : false;

        if (cap.sampleAcc >= 0.18 && cap.clip.frames.length < 45) {
          cap.sampleAcc = 0;
          cachedSnaps ??= getSnapshots();
          const { actors, vehicles } = cachedSnaps;
          if (cap.witness) {
            const pos = cap.witness.actor.position;
            const camPos: Point3 = witnessDown
              ? { x: pos.x, y: 0.18, z: pos.z }
              : { x: pos.x, y: pos.y + 1.48, z: pos.z };
            const lookTarget: Point3 = witnessDown
              ? { x: pos.x + Math.sin(cap.witness.actor.heading) * 3, y: 0.12, z: pos.z - Math.cos(cap.witness.actor.heading) * 3 }
              : planarDistance(pos, playerPos) < 28 && physics.canSee(camPos, eyes(playerPos), [cap.witness.actor.collider.handle])
                ? { x: playerPos.x, y: playerPos.y + 1.2, z: playerPos.z }
                : { x: cap.event.position.x, y: cap.event.position.y + 1.2, z: cap.event.position.z };
            cap.clip.frames.push(sampleFrame(now, camPos, lookTarget, witnessDown, actors, vehicles));
            if (witnessDown) cap.droppedSamples++;
          } else if (cap.fixedPoint) {
            const lookTarget = planarDistance(cap.fixedPoint, playerPos) < 38
              ? { x: playerPos.x, y: playerPos.y + 1.1, z: playerPos.z }
              : { x: cap.event.position.x, y: cap.event.position.y + 1.1, z: cap.event.position.z };
            cap.clip.frames.push(sampleFrame(now, cap.fixedPoint, lookTarget, false, actors, vehicles));
          }

          if (cap.clip.frames.length % 4 === 1) {
            journal.upsertClip(cap.event, { ...cap.clip, frames: [...cap.clip.frames] }, cap.clip.locationName);
          }
        }

        if (witnessDown && cap.droppedSamples >= 2) {
          cap.finished = true;
          cap.clip.status = 'partial';
          cap.clip.interruptedReason = 'Señal cortada: testigo abatido durante la grabación';
          journal.upsertClip(cap.event, { ...cap.clip, frames: [...cap.clip.frames] }, cap.clip.locationName);
        } else if (witnessFled || cap.duration >= 6.5 || cap.clip.frames.length >= 45) {
          cap.finished = true;
          cap.clip.status = witnessFled ? 'partial' : 'complete';
          if (witnessFled) cap.clip.interruptedReason = 'El testigo huyó de la escena';
          journal.upsertClip(cap.event, { ...cap.clip, frames: [...cap.clip.frames] }, cap.clip.locationName);
        }
      }
    },
    renderReplayFrame(camera: PerspectiveCamera, clip: WitnessClip, frameIndex: number, liveActors?: { setVisible(v: boolean): void }) {
      void liveActors;
      const frame = clip.frames[Math.max(0, Math.min(clip.frames.length - 1, frameIndex))];
      if (!frame) return;
      replayGroup.visible = true;
      camera.position.set(frame.camX, frame.camY, frame.camZ);
      camera.lookAt(lookVec.set(frame.lookX, frame.lookY, frame.lookZ));

      frame.actors.forEach((a, i) => {
        const entry = ensureActorMesh(i);
        entry.mat.color.setHex(a.color);
        entry.body.visible = true;
        entry.head.visible = true;
        entry.body.position.set(a.x, a.health <= 0 ? 0.22 : a.y + 0.72, a.z);
        entry.body.rotation.set(0, -a.heading, a.health <= 0 ? -Math.PI / 2 : 0);
        entry.head.position.set(a.x, a.health <= 0 ? 0.22 : a.y + 1.56, a.z);
      });
      for (let i = frame.actors.length; i < actorPool.length; i++) {
        actorPool[i].body.visible = false;
        actorPool[i].head.visible = false;
      }

      frame.vehicles.forEach((v, i) => {
        const entry = ensureVehicleMesh(i);
        entry.mat.color.setHex(v.color);
        entry.body.visible = true;
        entry.body.position.set(v.x, v.y + 0.4, v.z);
        entry.body.rotation.set(0, -v.heading, 0);
        entry.body.scale.set(v.kind === 'bus' ? 2.05 : v.kind === 'metro' ? 6.2 : 1.7, v.kind === 'bus' || v.kind === 'metro' ? 1.4 : 0.95, v.kind === 'bus' ? 5.4 : v.kind === 'metro' ? 1.85 : 3.6);
      });
      for (let i = frame.vehicles.length; i < vehiclePool.length; i++) {
        vehiclePool[i].body.visible = false;
      }
    },
    hideReplay() {
      replayGroup.visible = false;
    },
    reset() {
      captures.clear();
      lastEventId = 0;
      replayGroup.visible = false;
    },
    dispose() {
      captures.clear();
      replayGroup.removeFromParent();
      for (const a of actorPool) a.mat.dispose();
      for (const v of vehiclePool) v.mat.dispose();
      headMat.dispose();
      boxGeo.dispose();
    },
  };
}
