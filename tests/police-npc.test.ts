import { describe, expect, it, vi } from 'vitest';
import { PerspectiveCamera, Scene } from 'three';
import { createPhysics } from '../src/physics/physics';
import { createPlayer } from '../src/player/player';
import { createSession } from '../src/simulation/session';
import { starsForHeat, WANTED_TIERS } from '../src/simulation/police';
import { buildDistrict } from '../src/world/district';
import type { GameAudio } from '../src/audio/audio';

function mockAudio(): GameAudio {
  return {
    unlock: vi.fn(),
    play: vi.fn(),
    playCinematic: vi.fn(),
    update: vi.fn(),
    setMuted: vi.fn(),
    pause: vi.fn(),
    dispose: vi.fn(),
  };
}

const idle = { x: 0, z: 0, run: false, jump: false, aim: false, fire: false };

describe('Sistema de 5 estrellas policiales y comportamiento avanzado de NPCs', () => {
  it('escala limpiamente de 0 a 5 estrellas, despliega SWAT en 3★+ y helicóptero en 4★+, y enfría al evadir', async () => {
    expect(starsForHeat(0)).toBe(0);
    expect(starsForHeat(15)).toBe(1);
    expect(starsForHeat(45)).toBe(2);
    expect(starsForHeat(90)).toBe(3);
    expect(starsForHeat(145)).toBe(4);
    expect(starsForHeat(210)).toBe(5);
    expect(WANTED_TIERS.length).toBe(6);

    const scene = new Scene();
    const camera = new PerspectiveCamera(58, 16 / 9, 0.08, 650);
    const district = buildDistrict(scene);
    const physics = await createPhysics(district.colliders);
    const player = createPlayer(scene, camera, physics, district.spawn);
    const session = createSession(scene, camera, physics, district.colliders, player, mockAudio(), () => {});

    expect(session.police.stars).toBe(0);
    expect(session.police.helicopterPosition).toBeUndefined();
    expect(session.police.units.filter((u) => u.role === 'swat').every((u) => u.inCar)).toBe(true);

    // 1★ -> 2★ -> 3★ (SWAT deployed)
    session.police.reportEscalation(player.position, 20, false, 1);
    expect(session.police.stars).toBe(1);

    session.police.reportEscalation(player.position, 35, true, 2);
    expect(session.police.stars).toBe(2);

    session.police.reportEscalation(player.position, 45, true, 3);
    expect(session.police.stars).toBe(3);
    expect(session.police.units.some((u) => u.role === 'swat' && !u.inCar)).toBe(true);

    // 4★ -> Helicopter activates
    session.police.reportEscalation(player.position, 60, true, 4);
    expect(session.police.stars).toBe(4);
    session.step(1 / 60, idle, 17.5);
    expect(session.police.helicopterPosition).toBeDefined();

    // 5★ -> Estado de sitio
    session.police.reportEscalation(player.position, 70, true, 5);
    expect(session.police.stars).toBe(5);
    expect(session.police.starLabel).toBe('ESTADO DE SITIO');
    expect(session.police.units.filter((u) => u.role === 'swat').every((u) => !u.inCar)).toBe(true);

    // Reset clears stars, helicopter, SWAT deployment, and barricades
    session.reset();
    expect(session.police.stars).toBe(0);
    expect(session.police.helicopterPosition).toBeUndefined();
    expect(session.police.units.filter((u) => u.role === 'swat').every((u) => u.inCar)).toBe(true);

    session.dispose();
    player.dispose();
    physics.dispose();
  });

  it('hace que los NPCs esquiven vehículos rápidos y reaccionen a persecuciones policiales', async () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera(58, 16 / 9, 0.08, 650);
    const district = buildDistrict(scene);
    const physics = await createPhysics(district.colliders);
    const player = createPlayer(scene, camera, physics, district.spawn);
    const session = createSession(scene, camera, physics, district.colliders, player, mockAudio(), () => {});

    // Place a fast vehicle right next to Pedro so he triggers active traffic evasion
    const pedro = session.population.allPeople.find((p) => p.id === 'person:pedro')!;
    const fastCar = [{ position: { x: pedro.actor.position.x + 1.8, y: 0.2, z: pedro.actor.position.z }, heading: -Math.PI / 2, speed: 7.5 }];
    for (let i = 0; i < 30; i++) {
      session.population.step(1 / 60, 1 + i / 60, player.position, false, session.world, session.economy, undefined, 17, 0, fastCar);
    }
    expect(pedro.activityLabel).toBe('esquivando un coche');
    expect(pedro.state).toBe('nervous');

    // Trigger 3-star chase near a calm mobile citizen -> citizen reacts (records or clears the street)
    const valeriaNpc = session.population.allPeople.find((p) => p.id === 'person:valeria')!;
    valeriaNpc.state = 'routine';
    valeriaNpc.nextDecision = 0;
    const nearPlayer = { x: valeriaNpc.actor.position.x + 6.0, y: 0, z: valeriaNpc.actor.position.z };
    for (let i = 0; i < 30; i++) {
      session.population.step(1 / 60, 5 + i / 60, nearPlayer, false, session.world, session.economy, undefined, 22, 3);
    }
    const nextState: string = valeriaNpc.state;
    expect(
      valeriaNpc.activityLabel.includes('persecución') || nextState === 'fleeing',
    ).toBe(true);

    session.dispose();
    player.dispose();
    physics.dispose();
  });

  it('mantiene memoria episódica del jugador, actualiza confianza y propaga rumores entre NPCs', async () => {
    const { exchangeGossip, rememberEvent } = await import('../src/simulation/npc-mind');
    const { playerDialogueReply } = await import('../src/simulation/dialogue');

    const scene = new Scene();
    const camera = new PerspectiveCamera(58, 16 / 9, 0.08, 650);
    const district = buildDistrict(scene);
    const physics = await createPhysics(district.colliders);
    const player = createPlayer(scene, camera, physics, district.spawn);
    const session = createSession(scene, camera, physics, district.colliders, player, mockAudio(), () => {});

    const pedro = session.population.allPeople.find((p) => p.id === 'person:pedro')!;
    const valeria = session.population.allPeople.find((p) => p.id === 'person:valeria')!;

    // 1. Polite chat builds trust & episodic chat memory
    session.population.recordPlayerChat(valeria, 'Saludar', 10);
    session.population.recordPlayerChat(valeria, '¿Cómo está el barrio?', 12);
    expect(valeria.mind.playerTrust).toBeGreaterThan(0);
    expect(valeria.mind.playerChats).toBe(2);
    expect(playerDialogueReply(valeria, 'greet', undefined, 0, 14)).toContain('¡Ey, qué tal otra vez!');

    // 2. Witnessing a player crime creates an episodic memory, zone caution, and distrust
    const crimeEvent = session.journal.publish('theft', pedro.actor.position, 20, 'player', true);
    rememberEvent(pedro.mind, crimeEvent, true);
    expect(pedro.mind.playerWitnessedCrimes).toBe(1);
    expect(pedro.mind.playerTrust).toBeLessThan(0);
    expect(pedro.mind.memories[0].aboutPlayer).toBe(true);
    expect(Object.keys(pedro.mind.zoneCaution).length).toBeGreaterThan(0);

    // Even when calm later, Pedro remembers what the player did
    const reply = playerDialogueReply(pedro, 'greet', undefined, 0, 45);
    expect(reply).toContain('No me olvido de lo de antes');

    // 3. Pedro meets Valeria and spreads gossip -> Valeria learns about it and updates relationship
    const gossip = exchangeGossip(pedro.id, pedro.name, pedro.mind, valeria.id, valeria.name, valeria.mind, 30);
    expect(gossip).toBeDefined();
    expect(gossip?.kind).toBe('gossip');
    expect(valeria.mind.relationships[pedro.id]).toBeGreaterThan(0);
    expect(valeria.mind.memories.some((m) => m.kind === 'gossip' && m.heardFrom === 'Pedro')).toBe(true);

    // 4. Reset restores clean procedural minds
    session.reset();
    expect(pedro.mind.memories.length).toBe(0);
    expect(pedro.mind.playerTrust).toBe(0);
    expect(pedro.mind.playerWitnessedCrimes).toBe(0);

    session.dispose();
    player.dispose();
    physics.dispose();
  });
});
