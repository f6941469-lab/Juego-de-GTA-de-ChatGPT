import { PerspectiveCamera, Scene } from 'three';
import { expect, it } from 'vitest';
import { Economy } from '../src/simulation/economy';
import { createPhysics } from '../src/physics/physics';
import { createPlayer } from '../src/player/player';
import { createSimulationEngine } from '../src/simulation/engine';
import { buildDistrict } from '../src/world/district';
import { getStoreInteriorLayout } from '../src/world/stores';

it('validates catalog, funds and separate store stock atomically; register payouts cannot duplicate money', () => {
  const economy = new Economy([{ id: 'palma', loot: 90 }, { id: 'other', loot: 50 }]);
  expect(economy.buy('palma', 'water')).toBeNull(); expect(economy.money).toBe(112);
  expect(economy.inventory.water).toBe(1); expect(economy.stock('other')?.water).toBe(12);
  economy.money = 0;
  expect(economy.buy('palma', 'snack')).toBe('Saldo insuficiente'); expect(economy.inventory.snack).toBe(0);
  expect(economy.buy('palma', '__proto__')).toBe('Producto o tienda desconocidos');
  expect(economy.rob('palma')).toBe(98); expect(economy.rob('palma')).toBe(0);
  expect(economy.use('water')).toBe(true); expect(economy.use('water')).toBe(false);
});

it('integrates Mercado Palma shopping with the existing engine, blocks combat/movement in panels and uses inventory through the phone', async () => {
  const scene = new Scene(); const district = buildDistrict(scene, 240817); const physics = await createPhysics(district.colliders);
  const player = createPlayer(scene, new PerspectiveCamera(58, 1.6, 0.08, 650), physics, district.spawn);
  const engine = createSimulationEngine(scene, physics, player, district, 240817, 17.25);
  const idle = { x: 0, z: 0, run: false, jump: false, handbrake: false, interact: false, horn: false, challenge: false, aim: false, fire: false, reload: false, cycleWeapon: false };
  const advance = (frames: number, input = idle) => { for (let i = 0; i < frames; i++) engine.step(1 / 60, input); };
  try {
    const market = district.map.stores!.find((store) => store.id === 'mercado-palma')!;
    expect(market).toBeDefined(); expect(district.map.stores).toHaveLength(10);
    advance(100, { ...idle, z: 1 }); advance(30);
    const layout = getStoreInteriorLayout(market);
    expect(Math.hypot(player.position.x - layout.counterFrontX, player.position.z - layout.counterFrontZ)).toBeLessThan(2);
    expect(player.position.y).toBeCloseTo(0.06, 1);
    engine.step(1 / 60, { ...idle, interact: true }); expect(engine.getTradeSnapshot()?.name).toBe('Mercado Palma');
    engine.sendPhoneCommand('select'); expect(engine.cash).toBe(112); expect(engine.economy.inventory.water).toBe(1);
    engine.buyProduct(2); expect(engine.economy.inventory.ammo).toBe(1);
    advance(30); const position = player.position.clone();
    advance(60, { ...idle, x: 1, z: 1, aim: true, fire: true });
    expect(player.position.distanceTo(position)).toBeLessThan(0.05); expect(engine.armed).toBe(false);
    engine.sendPhoneCommand('back'); engine.sendPhoneCommand('openBag');
    expect(engine.getPhoneSnapshot().screen).toBe('bag');
    engine.sendPhoneCommand('down'); engine.sendPhoneCommand('down'); engine.sendPhoneCommand('select');
    expect(engine.economy.inventory.ammo).toBe(0);
    engine.sendPhoneCommand('back'); engine.sendPhoneCommand('back');
    expect(engine.phone.isOpen).toBe(false);
    engine.weapons.selectSlot(1); expect(engine.weapons.ammo.reserve).toBe(60);
    engine.reset(); expect(engine.cash).toBe(120); expect(engine.economy.inventory.water).toBe(0);
  } finally { engine.dispose(); player.dispose(); district.dispose(); physics.dispose(); }
});
