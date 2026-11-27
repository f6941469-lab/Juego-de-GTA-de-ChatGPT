import { PerspectiveCamera, Scene } from 'three';
import { describe, expect, it } from 'vitest';
import { createPhysics } from '../src/physics/physics';
import { createPlayer } from '../src/player/player';
import { createSession } from '../src/simulation/session';
import { buildDistrict } from '../src/world/district';
import { districtNameAt, functionalVenues, venueById } from '../src/world/generation/expansion';
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

describe('world expansion: multi-district map, bridges, ramps, mountains & 5 functional venues', () => {
  it('builds expanded districts, sloped bridges/mountain ramps, Isla Fortuna, and elevated overlooks with solid physics', async () => {
    const scene = new Scene();
    const district = buildDistrict(scene, 61865);

    expect(district.map.bounds).toEqual(worldBounds);
    expect(district.map.islands?.length).toBeGreaterThanOrEqual(1);
    expect(district.map.bridges?.length).toBeGreaterThanOrEqual(2);
    expect(district.map.mountains?.length).toBeGreaterThanOrEqual(3);

    const landmarkNames = district.map.landmarks.map((l) => l.name);
    for (const venue of functionalVenues) {
      expect(landmarkNames).toContain(venue.name);
    }

    // Verify sloped ramp colliders exist along both X (bridges & Sierra entry) and Z (Alto Mirador & descent)
    expect(district.colliders.some((c) => Boolean(c.rotZ))).toBe(true);
    expect(district.colliders.some((c) => Boolean(c.rotX))).toBe(true);

    const physics = await createPhysics(district.colliders);
    try {
      const probeY = (x: number, z: number, startY = 18) => {
        const hit = physics.raycast({ x, y: startY, z }, { x: 0, y: -1, z: 0 }, startY + 5);
        expect(hit).not.toBeNull();
        return { y: startY - hit!.timeOfImpact, ny: hit!.normal.y };
      };

      // Puente Fortuna ascending ramp midpoint (x=61, z=7) -> ~1.9m with tilted normal
      const rampHit = probeY(61, 7, 10);
      expect(rampHit.y).toBeGreaterThan(1.4);
      expect(rampHit.y).toBeLessThan(2.4);
      expect(rampHit.ny).toBeGreaterThan(0.9);
      expect(rampHit.ny).toBeLessThan(0.995);

      // Puente Fortuna elevated horizontal span (x=79, z=7) -> ~3.8m
      const bridgeDeck = probeY(79, 7, 10);
      expect(bridgeDeck.y).toBeCloseTo(3.8, 1);

      // Isla Fortuna ground (x=134, z=0) -> ~0m
      const islandGround = probeY(134, 0, 5);
      expect(islandGround.y).toBeCloseTo(0, 1);

      // Mirador Sierra open plateau road (x=-95, z=7) and interior floor of Restaurante El Mirador (x=-104, z=7) -> ~4.2m
      const plateauRoad = probeY(-95, 7, 12);
      expect(plateauRoad.y).toBeCloseTo(4.2, 1);
      const miradorFloor = probeY(-104, 7, 6.5);
      expect(miradorFloor.y).toBeCloseTo(4.2, 1);

      // Alto Mirador high mountain plateau (x=-104, z=-55) -> ~7.8m
      const highOverlook = probeY(-104, -55, 16);
      expect(highOverlook.y).toBeCloseTo(7.8, 1);

      // District zone resolver
      expect(districtNameAt(15, 41.5)).toBe('Costa Palmera Centro');
      expect(districtNameAt(136, 34)).toBe('Isla Fortuna');
      expect(districtNameAt(24, -132)).toBe('Distrito Cívico y Penal');
      expect(districtNameAt(-108, 7)).toBe('Sierra Palmera');
      expect(districtNameAt(0, 126)).toBe('Colinas del Sur');
    } finally {
      physics.dispose();
    }
  });

  it('supports full gameplay at Restaurant, Casino, Buyable House, Police HQ, and Prison (arrest, escape & sentence)', async () => {
    const scene = new Scene();
    const camera = new PerspectiveCamera(58, 1.6, 0.08, 650);
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
      // 1. Restaurante El Mirador (Sierra Palmera, y=4.28)
      session.economy.money = 600;
      player.teleport(venueById.restaurant.interactPoint);
      expect(session.currentDistrict).toBe('Sierra Palmera');
      session.command('interact');
      expect(session.overlay).toBe('venue');
      expect(session.venuePanel?.venue.id).toBe('restaurant');
      const moneyBeforeMeal = session.economy.money;
      session.select(1); // Mariscada Especial ($35, 100% health + 45 armor)
      expect(session.economy.money).toBe(moneyBeforeMeal - 35);
      expect(session.health).toBe(100);
      expect(session.armor).toBeGreaterThanOrEqual(45);
      session.command('back');
      expect(session.overlay).toBe('world');

      // 2. Casino Royale Palma (Isla Fortuna)
      player.teleport(venueById.casino.interactPoint);
      expect(session.currentDistrict).toBe('Isla Fortuna');
      session.command('interact');
      expect(session.overlay).toBe('venue');
      expect(session.venuePanel?.venue.id).toBe('casino');
      const moneyBeforeBet = session.economy.money;
      session.select(0); // Ruleta Rojo/Negro ($20 wager)
      expect(session.economy.money).not.toBe(moneyBeforeBet);
      expect(session.casinoNet).not.toBe(0);
      session.command('back');

      // 3. Casa del Mirador (Buyable Safehouse on Isla Fortuna)
      session.economy.money = 500;
      player.teleport(venueById.house.interactPoint);
      session.command('interact');
      expect(session.overlay).toBe('venue');
      expect(session.houseOwned).toBe(false);
      session.select(0); // Comprar Casa del Mirador ($350)
      expect(session.houseOwned).toBe(true);
      expect(session.economy.money).toBe(150);
      // Rest 6 hours inside owned house
      const hoursBefore = advancedHours;
      session.select(0); // Dormir y descansar (+6 h)
      expect(advancedHours).toBe(hoursBefore + 6);
      expect(session.health).toBe(100);
      session.command('back');

      // 4. Comisaría Central (Pay fine to clear wanted stars & voluntary surrender)
      session.economy.money = 300;
      session.police.reportEscalation(player.position, 60, true, 2);
      expect(session.police.stars).toBeGreaterThanOrEqual(2);
      player.teleport(venueById.police_hq.interactPoint);
      expect(session.currentDistrict).toBe('Distrito Cívico y Penal');
      session.command('interact');
      expect(session.venuePanel?.venue.id).toBe('police_hq');
      const moneyBeforeFine = session.economy.money;
      session.select(0); // Pagar multa y limpiar estrellas
      expect(session.police.stars).toBe(0);
      expect(session.economy.money).toBeLessThan(moneyBeforeFine);

      // 5. Cárcel de Palma: surrender -> cell -> escape (3★) -> surrender -> serve sentence
      session.select(1); // Entregarse voluntariamente desde Comisaría Central
      expect(session.inPrison).toBe(true);
      expect(session.overlay).toBe('venue');
      expect(session.venuePanel?.venue.id).toBe('prison');
      expect(Math.hypot(
        player.position.x - venueById.prison.cellPoint!.x,
        player.position.z - venueById.prison.cellPoint!.z,
      )).toBeLessThan(1.5);

      // Attempt prison escape -> immediate 3★ police pursuit & teleport outside cell bars
      session.select(2); // Intentar fuga de la celda
      expect(session.inPrison).toBe(false);
      expect(session.overlay).toBe('world');
      expect(session.police.stars).toBeGreaterThanOrEqual(3);

      // Surrender again and legally serve sentence
      player.teleport(venueById.police_hq.interactPoint);
      session.command('interact');
      session.select(1); // Entregarse voluntariamente
      expect(session.inPrison).toBe(true);
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
