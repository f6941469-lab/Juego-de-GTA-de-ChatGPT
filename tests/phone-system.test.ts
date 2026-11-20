import { PerspectiveCamera, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { createPhysics } from '../src/physics/physics';
import { createPlayer } from '../src/player/player';
import { createSimulationEngine } from '../src/simulation/engine';
import { buildDistrict } from '../src/world/district';

const dt = 1 / 60;
const baseControls = {
  x: 0,
  z: 0,
  run: false,
  jump: false,
  handbrake: false,
  interact: false,
  horn: false,
  challenge: false,
  aim: false,
  fire: false,
  reload: false,
  cycleWeapon: false,
  weaponSlot: undefined as 0 | 1 | 2 | undefined,
  phoneCommand: undefined as 'toggle' | 'up' | 'down' | 'left' | 'right' | 'select' | 'back' | 'openCamera' | 'openFeed' | 'openEmergency' | 'openAlerts' | undefined,
};

describe('Phase 5 diegetic mobile phone, live recording, viral publishing, and 911 dispatch', () => {
  it('opens phone, records a live incident, emits recording_started and video_published, and grows feed views', async () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera(58, 1, 0.1, 200);
    const district = buildDistrict(scene, 240817);
    const physics = await createPhysics(district.colliders);
    const player = createPlayer(scene, camera, physics, district.spawn);
    const engine = createSimulationEngine(scene, physics, player, district, 240817, 15);

    try {
      expect(engine.phone.isOpen).toBe(false);
      const startPos = { x: player.position.x, z: player.position.z };

      // Open phone via toggle command without moving player
      engine.step(dt, { ...baseControls, phoneCommand: 'toggle' });
      expect(engine.phone.isOpen).toBe(true);
      expect(engine.phone.screen).toBe('home');
      expect(Math.hypot(player.position.x - startPos.x, player.position.z - startPos.z)).toBeLessThan(0.01);

      // Select camera app and begin recording
      engine.step(dt, { ...baseControls, phoneCommand: 'select' });
      expect(engine.phone.screen).toBe('camera');
      engine.step(dt, { ...baseControls, phoneCommand: 'select' });
      expect(engine.phone.recording).toBe(true);
      expect(engine.eventBus.recent().some((e) => e.type === 'recording_started')).toBe(true);

      // Simulate a broken glass incident nearby while recording
      engine.eventBus.emit({
        type: 'glass_broken',
        sourceId: 'player',
        position: { x: player.position.x + 2, y: 1.2, z: player.position.z },
        intensity: 0.9,
        radius: 40,
        severity: 2,
        visual: true,
        auditory: true,
      });

      for (let i = 0; i < 15; i++) engine.step(dt, baseControls);

      // Stop and publish clip -> transitions to feed and emits video_published
      engine.step(dt, { ...baseControls, phoneCommand: 'select' });
      expect(engine.phone.recording).toBe(false);
      expect(engine.phone.screen).toBe('feed');
      const publishedEvent = engine.eventBus.recent().find((e) => e.type === 'video_published');
      expect(publishedEvent).toBeDefined();

      const snapBefore = engine.getPhoneSnapshot();
      const topClip = snapBefore.clips[0];
      expect(topClip.category).toBe('Vandalismo');
      const initialViews = topClip.views;

      // Advance simulation so clip organically gains views
      for (let i = 0; i < 70; i++) engine.step(dt, baseControls);
      expect(engine.getPhoneSnapshot().clips[0].views).toBeGreaterThan(initialViews);
    } finally {
      engine.dispose();
      player.dispose();
      district.dispose();
      physics.dispose();
      expect(scene.children).toHaveLength(0);
    }
  });

  it('triggers nearby NPC reaction on recording_started and dispatches 911 / medical aid from Emergency app', async () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera(58, 1, 0.1, 200);
    const district = buildDistrict(scene, 240817);
    const physics = await createPhysics(district.colliders);
    const player = createPlayer(scene, camera, physics, district.spawn);
    const engine = createSimulationEngine(scene, physics, player, district, 240817, 15);

    try {
      // Find an ambient pedestrian near spawn with clear sidewalk ahead and stand inside their forward FOV
      for (let i = 0; i < 20; i++) engine.step(dt, baseControls);
      const ped = engine.npcPopulation.agents.find((a) =>
        a.kind === 'pedestrian' && Math.hypot(a.x - player.position.x, a.z - player.position.z) < 40,
      ) ?? engine.npcPopulation.agents.find((a) => a.kind === 'pedestrian')!;
      expect(ped).toBeDefined();

      const standX = ped.x + Math.sin(ped.heading) * 2.4;
      const standZ = ped.z - Math.cos(ped.heading) * 2.4;
      const headingTowardPed = Math.atan2(ped.x - standX, -(ped.z - standZ));
      player.exitVehicle({ x: standX, y: 0, z: standZ }, headingTowardPed);

      engine.step(dt, { ...baseControls, phoneCommand: 'openCamera' });
      engine.step(dt, { ...baseControls, phoneCommand: 'select' });

      for (let i = 0; i < 48; i++) engine.step(dt, baseControls);
      expect(ped.brain.memory.some((entry) => entry.type === 'recording_started')).toBe(true);
      expect(ped.brain.alertness).toBeGreaterThan(0);

      // Switch to emergency app and dispatch 911 patrol alert
      engine.step(dt, { ...baseControls, phoneCommand: 'openEmergency' });
      engine.step(dt, { ...baseControls, phoneCommand: 'select' });

      expect(engine.eventBus.recent().some((e) => e.type === 'crime_reported' && e.context?.caller === 'phone_911')).toBe(true);
      expect(engine.police.wanted.level).toBeGreaterThanOrEqual(1);

      engine.reset();
      expect(engine.phone.isOpen).toBe(false);
      expect(engine.phone.recording).toBe(false);
    } finally {
      engine.dispose();
      player.dispose();
      district.dispose();
      physics.dispose();
      expect(scene.children).toHaveLength(0);
    }
  });
});
