import { PerspectiveCamera, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { createPhysics } from '../src/physics/physics';
import { createPlayer } from '../src/player/player';
import { createSession } from '../src/simulation/session';
import { buildDistrict } from '../src/world/district';
import {
  districtNameAt,
  functionalVenues,
  npcResidentialHomes,
  venueById,
} from '../src/world/generation/expansion';
import { worldBounds } from '../src/world/generation/layout';

const silentAudio = {
  unlock() {},
  pause() {},
  setMuted() {},
  play() {},
  playCinematic() {},
  update() {},
  dispose() {},
};

describe('world expansion: 1.1km multi-district map, mountain mansion, bridges, ramps & distributed NPCs', () => {
  it('builds the 1100x1100m world, 162m suspension bridges, 3-stage Sierra highway up to 24m mansion, and distant districts with solid physics', async () => {
    const scene = new Scene();
    const district = buildDistrict(scene, 61865);

    expect(district.map.bounds).toEqual(worldBounds);
    expect(district.map.bounds.maxX - district.map.bounds.minX).toBe(1100);
    expect(district.map.bounds.maxZ - district.map.bounds.minZ).toBe(1100);
    expect(district.map.islands?.length).toBeGreaterThanOrEqual(1);
    expect(district.map.bridges?.length).toBeGreaterThanOrEqual(2);
    expect(district.map.mountains?.length).toBeGreaterThanOrEqual(3);
    expect(npcResidentialHomes.length).toBeGreaterThanOrEqual(12);

    const landmarkNames = district.map.landmarks.map((l) => l.name);
    for (const venue of functionalVenues) {
      expect(landmarkNames).toContain(venue.name);
    }

    // Verify sloped ramp colliders exist along both X and Z
    expect(district.colliders.some((c) => Boolean(c.rotZ))).toBe(true);
    expect(district.colliders.some((c) => Boolean(c.rotX))).toBe(true);

    const physics = await createPhysics(district.colliders);
    try {
      const probeY = (x: number, z: number, startY = 35) => {
        const hit = physics.raycast({ x, y: startY, z }, { x: 0, y: -1, z: 0 }, startY + 5);
        expect(hit).not.toBeNull();
        return { y: startY - hit!.timeOfImpact, ny: hit!.normal.y };
      };

      // Puente Fortuna ascending ramp midpoint (x=72, z=7) -> ~3.2m with tilted normal
      const rampHit = probeY(72, 7, 14);
      expect(rampHit.y).toBeGreaterThan(2.5);
      expect(rampHit.y).toBeLessThan(3.9);
      expect(rampHit.ny).toBeGreaterThan(0.95);
      expect(rampHit.ny).toBeLessThan(0.996);

      // Puente Fortuna elevated suspension deck (x=133, z=7) -> ~6.4m
      const bridgeDeck = probeY(133, 7, 16);
      expect(bridgeDeck.y).toBeCloseTo(6.4, 1);

      // Isla Fortuna ground (x=310, z=0) -> ~0m
      const islandGround = probeY(310, 0, 8);
      expect(islandGround.y).toBeCloseTo(0, 1);

      // Sierra Palmera 3-stage climb: Tier 1 (8m) -> Tier 2 (16m) -> Tier 3 Summit Mansion (24m)
      expect(probeY(-132, 0, 16).y).toBeCloseTo(8.0, 1);
      expect(probeY(-176, -120, 24).y).toBeCloseTo(16.0, 1);
      // Inside Casa del Mirador panoramic living room (below 27.7m ceiling) & cliffside terrace
      expect(probeY(-309.5, -17.0, 26.8).y).toBeCloseTo(24.0, 1);
      expect(probeY(-293.0, -21.0, 28.0).y).toBeCloseTo(24.0, 1);

      // Restaurante El Mirador elevated terrace in Colinas del Sur (y = 6.0m, probed below 10.6m pergola)
      expect(probeY(-156, 215, 9.0).y).toBeCloseTo(6.0, 1);

      // District zone resolver across the 1.1km map
      expect(districtNameAt(15, 41.5)).toBe('Costa Palmera Centro');
      expect(districtNameAt(318, 72)).toBe('Isla Fortuna');
      expect(districtNameAt(68, -215)).toBe('Distrito Cívico Norte');
      expect(districtNameAt(-210, -340)).toBe('Distrito Penal Norte');
      expect(districtNameAt(-170, 215)).toBe('Colinas del Sur');
      expect(districtNameAt(-315, -16)).toBe('Cumbre de Sierra Palmera');
    } finally {
      physics.dispose();
    }
  });

  it('supports all 5 functional venues and distributed outer-district NPCs with distant homes and workplaces', async () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera(58, 1.6, 0.08, 1450);
    const district = buildDistrict(scene, 61865);
    const physics = await createPhysics(district.colliders);
    let advancedHours = 0;
    const player = createPlayer(scene, camera, physics, district.spawn);
    const session = createSession(
      scene,
      camera,
      physics,
      district.colliders,
      player,
      silentAudio,
      () => {},
      (delta) => { advancedHours += delta; },
    );

    try {
      // Verify outer-district NPCs live across Isla Fortuna, Barrio del Sol, Colinas del Sur & Sierra Palmera
      const outerResidents = session.population.allPeople.filter((p) => p.districtResident);
      expect(outerResidents.length).toBeGreaterThanOrEqual(12);
      const districtsWithNpcs = new Set(outerResidents.map((p) => p.homeLocation.district));
      expect(districtsWithNpcs.has('Isla Fortuna')).toBe(true);
      expect(districtsWithNpcs.has('Barrio del Sol')).toBe(true);
      expect(districtsWithNpcs.has('Colinas del Sur')).toBe(true);
      expect(districtsWithNpcs.has('Sierra Palmera')).toBe(true);

      // Step simulation briefly and confirm outer-district NPCs walk cleanly without NaN or collapse
      const camila = outerResidents.find((p) => p.id === 'person:fortuna:camila')!;
      const startX = camila.actor.position.x;
      const startZ = camila.actor.position.z;
      for (let i = 0; i < 90; i++) {
        session.step(1 / 60, { x: 0, z: 0, run: false, jump: false, aim: false, fire: false }, 10);
      }
      expect(Math.hypot(camila.actor.position.x - startX, camila.actor.position.z - startZ)).toBeGreaterThan(0.5);

      // 1. Restaurante El Mirador (Colinas del Sur, y = 6.08m)
      session.economy.money = 600;
      player.teleport(venueById.restaurant.interactPoint);
      expect(session.currentDistrict).toBe('Colinas del Sur');
      session.command('interact');
      expect(session.overlay).toBe('venue');
      expect(session.venuePanel?.venue.id).toBe('restaurant');
      const moneyBeforeMeal = session.economy.money;
      session.select(1); // Mariscada Especial ($35)
      expect(session.economy.money).toBe(moneyBeforeMeal - 35);
      expect(session.health).toBe(100);
      expect(session.armor).toBeGreaterThanOrEqual(45);
      session.command('back');

      // 2. Casino Royale Palma (Isla Fortuna)
      player.teleport(venueById.casino.interactPoint);
      expect(session.currentDistrict).toBe('Isla Fortuna');
      session.command('interact');
      expect(session.venuePanel?.venue.id).toBe('casino');
      const moneyBeforeBet = session.economy.money;
      session.select(0);
      expect(session.economy.money).not.toBe(moneyBeforeBet);
      expect(session.casinoNet).not.toBe(0);
      session.command('back');

      // 3. Casa del Mirador (Modern Mountain Mansion at Cumbre de Sierra Palmera, y = 24.08m)
      session.economy.money = 500;
      player.teleport(venueById.house.interactPoint);
      expect(session.currentDistrict).toBe('Cumbre de Sierra Palmera');
      expect(player.position.y).toBeCloseTo(24.08, 1);
      session.command('interact');
      expect(session.houseOwned).toBe(false);
      session.select(0); // Comprar Casa del Mirador ($350)
      expect(session.houseOwned).toBe(true);
      expect(session.economy.money).toBe(150);
      const hoursBefore = advancedHours;
      session.select(0); // Dormir y descansar (+6 h)
      expect(advancedHours).toBe(hoursBefore + 6);
      expect(session.health).toBe(100);
      session.command('back');

      // 4. Comisaría Central (Distrito Cívico Norte)
      session.economy.money = 300;
      session.police.reportEscalation(player.position, 60, true, 2);
      expect(session.police.stars).toBeGreaterThanOrEqual(2);
      player.teleport(venueById.police_hq.interactPoint);
      expect(session.currentDistrict).toBe('Distrito Cívico Norte');
      session.command('interact');
      const moneyBeforeFine = session.economy.money;
      session.select(0); // Pagar multa
      expect(session.police.stars).toBe(0);
      expect(session.economy.money).toBeLessThan(moneyBeforeFine);

      // 5. Cárcel de Palma (Distrito Penal Norte): surrender -> cell -> escape (3★) -> serve sentence
      session.select(1); // Entregarse voluntariamente
      expect(session.inPrison).toBe(true);
      expect(session.currentDistrict).toBe('Distrito Penal Norte');
      expect(Math.hypot(
        player.position.x - venueById.prison.cellPoint!.x,
        player.position.z - venueById.prison.cellPoint!.z,
      )).toBeLessThan(1.5);

      session.select(2); // Intentar fuga -> 3★
      expect(session.inPrison).toBe(false);
      expect(session.police.stars).toBeGreaterThanOrEqual(3);

      player.teleport(venueById.police_hq.interactPoint);
      session.command('interact');
      session.select(1); // Entregarse de nuevo
      const hoursBeforeSentence = advancedHours;
      session.select(0); // Cumplir condena
      expect(session.inPrison).toBe(false);
      expect(session.police.stars).toBe(0);
      expect(advancedHours).toBeGreaterThan(hoursBeforeSentence);
      expect(Math.hypot(
        player.position.x - venueById.prison.releasePoint!.x,
        player.position.z - venueById.prison.releasePoint!.z,
      )).toBeLessThan(1.5);
    } finally {
      session.dispose();
      player.dispose();
      physics.dispose();
    }
  });
});
