import * as THREE from 'three';
import type { GameAudio } from '../audio/audio';
import { ACTOR_SPECS, createCinematicActorRig, type CinematicActorRig } from './actor-rig';
import { createCinematicLightingRig } from './lighting';
import { createCinematicOverlay } from './overlay';
import type {
  CinematicActorId,
  CinematicSequence,
  CinematicVehicleId,
  NarrativeState,
} from './types';
import { createCinematicVehicle, type CinematicVehicle } from './vehicles';

export interface CinematicDirectorOptions {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  audio: GameAudio;
  onFinish: (sequence: CinematicSequence, skipped: boolean) => void;
}

export function createCinematicDirector({ scene, camera, audio, onFinish }: CinematicDirectorOptions) {
  const stage = new THREE.Group();
  stage.name = 'CinematicStage';
  stage.visible = false;
  scene.add(stage);

  const actors: Record<CinematicActorId, CinematicActorRig> = {
    leo: createCinematicActorRig(stage, ACTOR_SPECS.leo),
    valeria: createCinematicActorRig(stage, ACTOR_SPECS.valeria),
    officer: createCinematicActorRig(stage, ACTOR_SPECS.officer),
  };

  const vehicles: Record<CinematicVehicleId, CinematicVehicle> = {
    sportsCar: createCinematicVehicle(stage, 'sportsCar'),
    patrolCar: createCinematicVehicle(stage, 'patrolCar'),
  };

  const lighting = createCinematicLightingRig(stage);

  const narrative: NarrativeState = {
    currentChapter: 'prologue_stolen_car',
    completedChapters: [],
    flags: {},
  };

  let activeSequence: CinematicSequence | null = null;
  let elapsed = 0;
  let active = false;
  let currentHour = 17.25;
  const focus = new THREE.Vector3(0, 1.2, 23);
  const lookTarget = new THREE.Vector3();
  const firedAudio = new Set<string>();
  const firedParticles = new Set<string>();
  const carSoundProxy = [{ position: { x: 0, y: 0, z: 0 }, speed: 0 }];

  const overlay = createCinematicOverlay(() => {
    if (active) finish(true);
  });

  function onKeyDown(event: KeyboardEvent) {
    if (!active) return;
    if (event.code === 'Space' || event.code === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      finish(true);
    }
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown, true);
  }

  function finish(skipped: boolean) {
    if (!active || !activeSequence) return;
    const finished = activeSequence;
    active = false;
    activeSequence = null;
    stage.visible = false;
    lighting.clearParticles();
    lighting.update(false, 'golden_boulevard', focus, camera.position, null, false, null, 0, elapsed);
    overlay.hide();

    // Record narrative completion flags for future chapters & world hooks
    if (!narrative.completedChapters.includes(finished.id)) {
      narrative.completedChapters.push(finished.id);
    }
    for (const flag of finished.completionFlags) {
      narrative.flags[flag] = true;
    }

    // Silence cinematic loop sounds cleanly
    audio.update(camera.position, [], false, elapsed);
    onFinish(finished, skipped);
  }

  function start(sequence: CinematicSequence) {
    activeSequence = sequence;
    elapsed = 0;
    active = true;
    firedAudio.clear();
    firedParticles.clear();
    lighting.clearParticles();
    stage.visible = true;
    narrative.currentChapter = sequence.id;
    overlay.show(sequence.title);
    update(0);
  }

  function update(dt: number) {
    if (!active || !activeSequence) return;
    const clampedDt = Math.min(Math.max(dt, 0), 0.08);
    elapsed += clampedDt;

    if (elapsed >= activeSequence.duration) {
      finish(false);
      return;
    }

    const frame = activeSequence.evaluate(elapsed);
    currentHour = frame.hour;
    focus.set(frame.focus.x, frame.focus.y, frame.focus.z);

    // Apply articulated character poses
    actors.leo.applySample(frame.actors.leo, elapsed);
    actors.valeria.applySample(frame.actors.valeria, elapsed);
    actors.officer.applySample(frame.actors.officer, elapsed);

    // Apply articulated vehicles
    vehicles.sportsCar.applySample(frame.vehicles.sportsCar, clampedDt, elapsed);
    vehicles.patrolCar.applySample(frame.vehicles.patrolCar, clampedDt, elapsed);

    // Trigger one-shot audio cues
    for (const cue of activeSequence.audioCues) {
      if (elapsed >= cue.time && !firedAudio.has(cue.id)) {
        firedAudio.add(cue.id);
        audio.playCinematic?.(cue.kind, cue.point);
      }
    }

    // Trigger one-shot particle bursts
    for (const fx of activeSequence.particleCues) {
      if (elapsed >= fx.time && !firedParticles.has(fx.id)) {
        firedParticles.add(fx.id);
        lighting.spawnBurst(fx.kind, fx.point);
      }
    }

    // Update camera with smooth shake and optional Dutch roll
    const shakeAmp = frame.camera.shake ?? 0;
    const sx = shakeAmp > 0 ? Math.sin(elapsed * 58) * shakeAmp : 0;
    const sy = shakeAmp > 0 ? Math.cos(elapsed * 73) * shakeAmp * 0.85 : 0;
    const sz = shakeAmp > 0 ? Math.sin(elapsed * 47 + 1.3) * shakeAmp * 0.5 : 0;

    camera.position.set(frame.camera.pos.x + sx, frame.camera.pos.y + sy, frame.camera.pos.z + sz);
    lookTarget.set(frame.camera.lookAt.x, frame.camera.lookAt.y, frame.camera.lookAt.z);
    camera.lookAt(lookTarget);
    if (frame.camera.roll) {
      camera.rotateZ(frame.camera.roll);
    }
    if (Math.abs(camera.fov - frame.camera.fov) > 0.01) {
      camera.fov = frame.camera.fov;
      camera.updateProjectionMatrix();
    }

    // Update studio 3-point lighting & police roof strobes
    const patrolPos = frame.vehicles.patrolCar.visible
      ? { x: frame.vehicles.patrolCar.x, y: frame.vehicles.patrolCar.y, z: frame.vehicles.patrolCar.z }
      : null;
    const carHeadlightPos = frame.vehicles.sportsCar.visible && frame.vehicles.sportsCar.headlights
      ? {
        x: frame.vehicles.sportsCar.x - Math.sin(frame.vehicles.sportsCar.heading) * 3.0,
        y: frame.vehicles.sportsCar.y,
        z: frame.vehicles.sportsCar.z - Math.cos(frame.vehicles.sportsCar.heading) * 3.0,
      }
      : null;

    lighting.update(
      true,
      frame.mood,
      frame.focus,
      frame.camera.pos,
      patrolPos,
      Boolean(frame.vehicles.patrolCar.sirens),
      carHeadlightPos,
      clampedDt,
      elapsed,
    );

    // Continuous background engine & police siren audio beds
    carSoundProxy[0].position.x = frame.vehicles.sportsCar.x;
    carSoundProxy[0].position.y = frame.vehicles.sportsCar.y;
    carSoundProxy[0].position.z = frame.vehicles.sportsCar.z;
    carSoundProxy[0].speed = frame.engineIntensity * 14;
    audio.update(camera.position, frame.engineIntensity > 0.05 ? carSoundProxy : [], frame.sirenAudio, elapsed);

    // Active subtitle & title card
    const dialogue = activeSequence.dialogues.find((d) => elapsed >= d.start && elapsed <= d.end);
    const titleCard = activeSequence.titleCards.find((c) => elapsed >= c.start && elapsed <= c.end);
    overlay.update({
      letterbox: frame.letterbox,
      fadeBlack: frame.fadeBlack,
      flashWhite: frame.flashWhite,
      progress: elapsed / activeSequence.duration,
      dialogue,
      titleCard,
    });
  }

  return {
    get active() { return active; },
    get elapsed() { return elapsed; },
    get hour() { return currentHour; },
    get focus() { return focus; },
    get narrative(): Readonly<NarrativeState> { return narrative; },
    start,
    update,
    skip() { finish(true); },
    dispose() {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', onKeyDown, true);
      }
      overlay.dispose();
      lighting.dispose();
      actors.leo.dispose();
      actors.valeria.dispose();
      actors.officer.dispose();
      vehicles.sportsCar.dispose();
      vehicles.patrolCar.dispose();
      stage.removeFromParent();
    },
  };
}

export type CinematicDirector = ReturnType<typeof createCinematicDirector>;
