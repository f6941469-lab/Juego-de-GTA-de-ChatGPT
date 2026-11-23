import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { ACTOR_SPECS, createCinematicActorRig } from '../src/cinematics/actor-rig';
import { createCinematicDirector } from '../src/cinematics/director';
import { OPENING_SEQUENCE } from '../src/cinematics/opening-story';
import type { CinematicPosePreset } from '../src/cinematics/types';
import type { GameAudio } from '../src/audio/audio';

function createMockAudio(): GameAudio & { cinematicCalls: string[] } {
  const cinematicCalls: string[] = [];
  return {
    cinematicCalls,
    unlock: vi.fn(),
    play: vi.fn(),
    playCinematic: vi.fn((kind) => { cinematicCalls.push(kind); }),
    update: vi.fn(),
    setMuted: vi.fn(),
    pause: vi.fn(),
    dispose: vi.fn(),
  };
}

describe('Motor de cinemáticas y prólogo de apertura', () => {
  it('mantiene planos contiguos, diálogos coherentes sin solapamientos y transición exacta al mundo abierto', () => {
    expect(OPENING_SEQUENCE.shots.length).toBeGreaterThanOrEqual(16);
    expect(OPENING_SEQUENCE.shots[0].start).toBe(0);
    expect(OPENING_SEQUENCE.shots[OPENING_SEQUENCE.shots.length - 1].end).toBeCloseTo(OPENING_SEQUENCE.duration, 5);

    for (let i = 1; i < OPENING_SEQUENCE.shots.length; i++) {
      expect(OPENING_SEQUENCE.shots[i].start).toBeCloseTo(OPENING_SEQUENCE.shots[i - 1].end, 5);
    }

    expect(OPENING_SEQUENCE.dialogues.length).toBeGreaterThanOrEqual(15);
    for (let i = 0; i < OPENING_SEQUENCE.dialogues.length; i++) {
      const dlg = OPENING_SEQUENCE.dialogues[i];
      expect(dlg.text.trim().length).toBeGreaterThan(8);
      expect(dlg.end).toBeGreaterThan(dlg.start);
      if (i > 0) {
        expect(dlg.start).toBeGreaterThanOrEqual(OPENING_SEQUENCE.dialogues[i - 1].end);
      }
    }

    // Evaluate across 150 timestamps for finite coordinates & valid FOV
    for (let i = 0; i <= 150; i++) {
      const t = (i / 150) * OPENING_SEQUENCE.duration;
      const frame = OPENING_SEQUENCE.evaluate(t);
      expect(Number.isFinite(frame.camera.pos.x)).toBe(true);
      expect(Number.isFinite(frame.camera.pos.y)).toBe(true);
      expect(Number.isFinite(frame.camera.pos.z)).toBe(true);
      expect(Number.isFinite(frame.camera.lookAt.x)).toBe(true);
      expect(frame.camera.fov).toBeGreaterThanOrEqual(38);
      expect(frame.camera.fov).toBeLessThanOrEqual(64);
      expect(frame.letterbox).toBeGreaterThanOrEqual(0);
      expect(frame.letterbox).toBeLessThanOrEqual(1);
    }

    // Verify exact punch impact flash & knockback choreography
    const punchFrame = OPENING_SEQUENCE.evaluate(43.95);
    expect(punchFrame.flashWhite).toBeGreaterThan(0.1);
    expect(punchFrame.actors.valeria.pose).toBe('punch_strike');
    expect(punchFrame.actors.officer.pose).toBe('knockback_fall');
    expect(punchFrame.camera.shake).toBeGreaterThan(0.05);

    // Verify night montage uses nighttime hour & neon lighting mood
    const neonFrame = OPENING_SEQUENCE.evaluate(59.5);
    expect(neonFrame.mood).toBe('neon_night');
    expect(neonFrame.hour).toBeGreaterThan(21);

    // Verify seamless handoff at end matches gameplay follow-camera at spawn (15, 0, 41.5)
    const endFrame = OPENING_SEQUENCE.evaluate(OPENING_SEQUENCE.duration);
    expect(endFrame.camera.pos.x).toBeCloseTo(15.42, 2);
    expect(endFrame.camera.pos.y).toBeCloseTo(2.343, 2);
    expect(endFrame.camera.pos.z).toBeCloseTo(46.547, 2);
    expect(endFrame.camera.fov).toBeCloseTo(58, 2);
    expect(endFrame.letterbox).toBeCloseTo(0, 2);
    expect(endFrame.actors.leo.x).toBeCloseTo(15.0, 2);
    expect(endFrame.actors.leo.z).toBeCloseTo(41.5, 2);
  });

  it('articula todos los presets de pose en 1 único InstancedMesh por actor', () => {
    const scene = new THREE.Scene();
    const poses: CinematicPosePreset[] = [
      'idle', 'sneak_lockpick', 'walk', 'run', 'argue_point', 'argue_hands',
      'plead', 'arms_crossed', 'inspect', 'cautious_step', 'punch_windup',
      'punch_strike', 'knockback_fall', 'knocked_out', 'celebrate',
      'lean_cool', 'wave_bye', 'drive_seated', 'passenger_seated',
    ];

    for (const id of ['leo', 'valeria', 'officer'] as const) {
      const rig = createCinematicActorRig(scene, ACTOR_SPECS[id]);
      let instancedCount = 0;
      rig.root.traverse((obj) => {
        if (obj instanceof THREE.InstancedMesh) instancedCount++;
      });
      expect(instancedCount).toBe(1);

      for (const [idx, pose] of poses.entries()) {
        rig.applySample({
          visible: true,
          x: 1,
          y: 0,
          z: 2,
          heading: idx * 0.2,
          pose,
          actionT: 0.5,
          lookAt: { x: 3, y: 1.5, z: 4 },
          talking: 0.8,
        }, idx * 0.35);
      }
      rig.dispose();
    }
  });

  it('ejecuta el ciclo completo del director, dispara señales de audio una sola vez y registra banderas narrativas', () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.08, 650);
    const audio = createMockAudio();
    const onFinish = vi.fn();

    const director = createCinematicDirector({ scene, camera, audio, onFinish });
    expect(director.active).toBe(false);

    director.start(OPENING_SEQUENCE);
    expect(director.active).toBe(true);

    // Step through entire duration in 0.05s increments
    for (let i = 0; i < 1500 && director.active; i++) {
      director.update(0.05);
    }

    expect(director.active).toBe(false);
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith(OPENING_SEQUENCE, false);
    expect(audio.cinematicCalls.length).toBe(OPENING_SEQUENCE.audioCues.length);
    expect(director.narrative.flags.prologue_completed).toBe(true);
    expect(director.narrative.flags.met_valeria).toBe(true);
    expect(director.narrative.flags.escaped_police_boulevard).toBe(true);
    expect(director.narrative.completedChapters).toContain('prologue_stolen_car');

    // Replay and verify skip works cleanly
    director.start(OPENING_SEQUENCE);
    expect(director.active).toBe(true);
    director.update(1.0);
    director.skip();
    expect(director.active).toBe(false);
    expect(onFinish).toHaveBeenCalledTimes(2);
    expect(onFinish).toHaveBeenLastCalledWith(OPENING_SEQUENCE, true);

    director.dispose();
  });
});
