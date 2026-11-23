import type { Point3, StaticBox } from '../../physics/physics';
import type { DistrictGeometry } from './geometry';

export interface StoreCatalogItem {
  id: string;
  name: string;
  detail: string;
  price: number;
  effect: 'heal' | 'ammo' | 'armor' | 'energy';
  amount: number;
  initialStock: number;
}

export interface ShopDefinition {
  id: string;
  lotKey: string;
  name: string;
  tagline: string;
  merchantId: string;
  merchantName: string;
  merchantColor: number;
  centerX: number;
  centerZ: number;
  width: number;
  wallColor: string;
  accentColor: string;
  trimColor: string;
  glowFinish: 'aquaLight' | 'coralLight' | 'goldLight';
  entrance: Point3;
  cashier: Point3;
  counter: Point3;
  products: Point3;
  windows: StaticBox[];
  initialTill: number;
  catalog: readonly StoreCatalogItem[];
}

export const shop = {
  id: 'shop:mercado-palma',
  entrance: { x: 15, y: 0.08, z: 40.5 },
  cashier: { x: 17.6, y: 0.08, z: 30.6 },
  counter: { x: 17.4, y: 0.08, z: 33.4 },
  products: { x: 12.8, y: 0.08, z: 35.4 },
};
export const shopWindows: StaticBox[] = [11.8, 18.2].map((x) => ({ x, y: 1.66, z: 39.35, halfX: 1.35, halfY: 1.05, halfZ: 0.055 }));

function makeStore(config: {
  id: string;
  lotKey: string;
  name: string;
  tagline: string;
  merchantId: string;
  merchantName: string;
  merchantColor: number;
  x: number;
  z: number;
  width?: number;
  wallColor: string;
  accentColor: string;
  trimColor: string;
  glowFinish: 'aquaLight' | 'coralLight' | 'goldLight';
  initialTill: number;
  catalog: readonly StoreCatalogItem[];
}): ShopDefinition {
  const width = config.width ?? 10;
  const half = width / 2;
  const wx = half * 0.64;
  return {
    id: config.id,
    lotKey: config.lotKey,
    name: config.name,
    tagline: config.tagline,
    merchantId: config.merchantId,
    merchantName: config.merchantName,
    merchantColor: config.merchantColor,
    centerX: config.x,
    centerZ: config.z,
    width,
    wallColor: config.wallColor,
    accentColor: config.accentColor,
    trimColor: config.trimColor,
    glowFinish: config.glowFinish,
    entrance: { x: config.x, y: 0.08, z: config.z + 6.3 },
    cashier: { x: config.x + half * 0.52, y: 0.08, z: config.z - 3.6 },
    counter: { x: config.x + half * 0.48, y: 0.08, z: config.z - 0.8 },
    products: { x: config.x - half * 0.44, y: 0.08, z: config.z + 1.2 },
    windows: [config.x - wx, config.x + wx].map((xPos) => ({
      x: xPos, y: 1.66, z: config.z + 5.15, halfX: Math.min(1.35, width * 0.135), halfY: 1.05, halfZ: 0.055,
    })),
    initialTill: config.initialTill,
    catalog: config.catalog,
  };
}

export const allShops: readonly ShopDefinition[] = [
  {
    id: 'shop:mercado-palma',
    lotKey: '3:3:1',
    name: 'Mercado Palma',
    tagline: 'Algo fresco para el camino.',
    merchantId: 'person:mara',
    merchantName: 'Mara',
    merchantColor: 0xd69751,
    centerX: 15,
    centerZ: 34.2,
    width: 10,
    wallColor: '#e8c5a2',
    accentColor: '#32938b',
    trimColor: '#72aaa1',
    glowFinish: 'aquaLight',
    entrance: shop.entrance,
    cashier: shop.cashier,
    counter: shop.counter,
    products: shop.products,
    windows: shopWindows,
    initialTill: 90,
    catalog: [
      { id: 'water', name: 'Agua mineral', detail: 'Botella · recupera 15 de salud', price: 8, effect: 'heal', amount: 15, initialStock: 12 },
      { id: 'snack', name: 'Bocadillo tropical', detail: 'Una porción · recupera 30 de salud', price: 12, effect: 'heal', amount: 30, initialStock: 8 },
      { id: 'ammo', name: 'Munición de práctica', detail: 'Caja de 12 · para tu pistola', price: 30, effect: 'ammo', amount: 12, initialStock: 5 },
    ],
  },
  makeStore({
    id: 'shop:dulceria-sol',
    lotKey: '2:3:1',
    name: 'Dulcería Sol',
    tagline: 'Caramelos y bebidas frías.',
    merchantId: 'person:celia',
    merchantName: 'Celia',
    merchantColor: 0xe38b9c,
    x: -12,
    z: 34.2,
    width: 9.2,
    wallColor: '#f5d2d8',
    accentColor: '#b94f70',
    trimColor: '#df8ba3',
    glowFinish: 'coralLight',
    initialTill: 75,
    catalog: [
      { id: 'candy', name: 'Gominolas de mango', detail: 'Bolsa dulce · recupera 12 de salud', price: 6, effect: 'heal', amount: 12, initialStock: 14 },
      { id: 'soda', name: 'Refresco de guayaba', detail: 'Lata fría · recupera 20 de salud', price: 9, effect: 'energy', amount: 20, initialStock: 10 },
      { id: 'icecream', name: 'Helado artesanal', detail: 'Tarrina · recupera 28 de salud', price: 14, effect: 'heal', amount: 28, initialStock: 8 },
    ],
  }),
  makeStore({
    id: 'shop:panaderia-brisa',
    lotKey: '1:3:1',
    name: 'Panadería Brisa',
    tagline: 'Horneado cada mañana.',
    merchantId: 'person:mateo',
    merchantName: 'Mateo',
    merchantColor: 0xcf9b63,
    x: -33.2,
    z: 34.2,
    width: 10,
    wallColor: '#f2dec2',
    accentColor: '#9e623f',
    trimColor: '#c98e5e',
    glowFinish: 'goldLight',
    initialTill: 85,
    catalog: [
      { id: 'croissant', name: 'Medialuna tibia', detail: 'Pieza recién hecha · +18 salud', price: 7, effect: 'heal', amount: 18, initialStock: 12 },
      { id: 'bread', name: 'Bocata de jamón', detail: 'Almuerzo completo · +35 salud', price: 14, effect: 'heal', amount: 35, initialStock: 8 },
      { id: 'water', name: 'Agua mineral', detail: 'Botella · recupera 15 de salud', price: 8, effect: 'heal', amount: 15, initialStock: 10 },
    ],
  }),
  makeStore({
    id: 'shop:cafeteria-mar',
    lotKey: '4:2:1',
    name: 'Cafetería Mar',
    tagline: 'Café junto al Paseo del Mar.',
    merchantId: 'person:elena',
    merchantName: 'Elena',
    merchantColor: 0x6ba79e,
    x: 38,
    z: -3.9,
    width: 8.6,
    wallColor: '#e7e2d1',
    accentColor: '#2f6d73',
    trimColor: '#679e9a',
    glowFinish: 'aquaLight',
    initialTill: 95,
    catalog: [
      { id: 'coffee', name: 'Café expreso', detail: 'Taza caliente · +15 energía/salud', price: 6, effect: 'energy', amount: 15, initialStock: 16 },
      { id: 'toast', name: 'Tostada costera', detail: 'Desayuno · recupera 25 de salud', price: 11, effect: 'heal', amount: 25, initialStock: 10 },
      { id: 'juice', name: 'Zumo natural', detail: 'Vaso grande · recupera 22 de salud', price: 10, effect: 'heal', amount: 22, initialStock: 10 },
    ],
  }),
  makeStore({
    id: 'shop:restaurante-bahia',
    lotKey: '4:4:1',
    name: 'Restaurante Bahía',
    tagline: 'Cocina caliente de la costa.',
    merchantId: 'person:bruno',
    merchantName: 'Bruno',
    merchantColor: 0xb5594c,
    x: 38,
    z: 67.2,
    width: 8.6,
    wallColor: '#edd0b8',
    accentColor: '#98433d',
    trimColor: '#c97866',
    glowFinish: 'coralLight',
    initialTill: 130,
    catalog: [
      { id: 'menu', name: 'Plato del día', detail: 'Comida completa · +55 salud', price: 22, effect: 'heal', amount: 55, initialStock: 8 },
      { id: 'taco', name: 'Tacos de pescado', detail: 'Ración caliente · +35 salud', price: 15, effect: 'heal', amount: 35, initialStock: 10 },
      { id: 'soda', name: 'Refresco frío', detail: 'Lata · recupera 16 de salud', price: 8, effect: 'energy', amount: 16, initialStock: 12 },
    ],
  }),
  makeStore({
    id: 'shop:farmacia-verde',
    lotKey: '1:1:1',
    name: 'Farmacia Verde',
    tagline: 'Primeros auxilios y cuidado.',
    merchantId: 'person:nora',
    merchantName: 'Nora',
    merchantColor: 0x5ea380,
    x: -33.2,
    z: -38.4,
    width: 10,
    wallColor: '#e1efe7',
    accentColor: '#2a7d5c',
    trimColor: '#66b191',
    glowFinish: 'aquaLight',
    initialTill: 110,
    catalog: [
      { id: 'bandage', name: 'Venda rápida', detail: 'Cura heridas · +35 salud', price: 18, effect: 'heal', amount: 35, initialStock: 10 },
      { id: 'medkit', name: 'Botiquín completo', detail: 'Recuperación total · +80 salud', price: 42, effect: 'heal', amount: 80, initialStock: 5 },
      { id: 'water', name: 'Suero hidratante', detail: 'Botella · recupera 20 de salud', price: 10, effect: 'heal', amount: 20, initialStock: 12 },
    ],
  }),
  makeStore({
    id: 'shop:ropa-palmera',
    lotKey: '2:1:1',
    name: 'Ropa Palmera',
    tagline: 'Estilo urbano tropical.',
    merchantId: 'person:gael',
    merchantName: 'Gael',
    merchantColor: 0x8674b5,
    x: -12,
    z: -38.4,
    width: 9.2,
    wallColor: '#e7e0ee',
    accentColor: '#604b8c',
    trimColor: '#9783bd',
    glowFinish: 'coralLight',
    initialTill: 105,
    catalog: [
      { id: 'cap', name: 'Gorra costera', detail: 'Discreta · +10 protección', price: 18, effect: 'armor', amount: 10, initialStock: 8 },
      { id: 'jacket', name: 'Chaqueta acolchada', detail: 'Resistencia ligera · +25 protección', price: 40, effect: 'armor', amount: 25, initialStock: 6 },
      { id: 'water', name: 'Botella de cortesía', detail: 'Agua fría · +15 salud', price: 8, effect: 'heal', amount: 15, initialStock: 10 },
    ],
  }),
  makeStore({
    id: 'shop:armeria-norte',
    lotKey: '0:0:1',
    name: 'Armería Norte',
    tagline: 'Munición y protección autorizada.',
    merchantId: 'person:rocco',
    merchantName: 'Rocco',
    merchantColor: 0x5c6878,
    x: -58.5,
    z: -73.4,
    width: 10,
    wallColor: '#d9dde0',
    accentColor: '#36434f',
    trimColor: '#617282',
    glowFinish: 'goldLight',
    initialTill: 160,
    catalog: [
      { id: 'ammo', name: 'Caja de 12 cartuchos', detail: 'Munición 9mm de reserva', price: 28, effect: 'ammo', amount: 12, initialStock: 10 },
      { id: 'ammo_pack', name: 'Lote de 24 cartuchos', detail: 'Doble carga para pistola', price: 50, effect: 'ammo', amount: 24, initialStock: 6 },
      { id: 'vest', name: 'Chaleco protector', detail: 'Absorbe impactos · +50 salud', price: 65, effect: 'armor', amount: 50, initialStock: 4 },
    ],
  }),
  makeStore({
    id: 'shop:minimercado-sur',
    lotKey: '1:4:1',
    name: 'Minimercado Sur',
    tagline: 'Abierto día y noche en el sur.',
    merchantId: 'person:lola',
    merchantName: 'Lola',
    merchantColor: 0xd9875b,
    x: -33.2,
    z: 67.2,
    width: 10,
    wallColor: '#efe1c9',
    accentColor: '#2d827a',
    trimColor: '#68a69d',
    glowFinish: 'aquaLight',
    initialTill: 95,
    catalog: [
      { id: 'water', name: 'Agua mineral', detail: 'Botella · recupera 15 de salud', price: 8, effect: 'heal', amount: 15, initialStock: 12 },
      { id: 'snack', name: 'Bocadillo tropical', detail: 'Una porción · recupera 30 de salud', price: 12, effect: 'heal', amount: 30, initialStock: 8 },
      { id: 'ammo', name: 'Munición de práctica', detail: 'Caja de 12 · para tu pistola', price: 30, effect: 'ammo', amount: 12, initialStock: 5 },
    ],
  }),
];

export function addShop(geometry: DistrictGeometry, colliders: StaticBox[]) {
  addStoreStructure(geometry, colliders, allShops[0]);
}

export function addStoreStructure(geometry: DistrictGeometry, colliders: StaticBox[], def: ShopDefinition) {
  const { centerX: cx, centerZ: cz, width: w, wallColor, accentColor, trimColor, glowFinish } = def;
  const half = w / 2;
  const sideSpan = w * 0.34;
  function solid(color: string, x: number, y: number, z: number, bw: number, bh: number, bd: number) {
    geometry.box('wall', color, x, y, z, bw, bh, bd, true);
    colliders.push({ x, y, z, halfX: bw / 2, halfY: bh / 2, halfZ: bd / 2 });
  }
  // Exact Mercado Palma layout generalized by (cx, cz, w)
  solid(wallColor, cx - half, 1.7, cz, 0.24, 3.4, 10.6);
  solid(wallColor, cx + half, 1.7, cz, 0.24, 3.4, 10.6);
  solid(trimColor, cx, 1.7, cz - 5.2, w, 3.4, 0.24);
  solid('#f3dec0', cx, 3.45, cz, w + 0.4, 0.24, 10.8);
  solid('#d8ceb1', cx, 0.04, cz, w - 0.2, 0.08, 10.2);

  // Front pillars leaving a central 3.3m entrance
  for (const offset of [-half + 0.15, -1.65, 1.65, half - 0.15]) {
    solid(accentColor, cx + offset, 1.7, cz + 5.15, 0.25, 3.4, 0.24);
  }
  // Window sills under both front storefronts
  for (const offset of [-half * 0.64, half * 0.64]) {
    solid(trimColor, cx + offset, 0.3, cz + 5.15, sideSpan - 0.2, 0.6, 0.25);
  }
  solid(accentColor, cx, 3.05, cz + 5.15, w, 0.7, 0.3);
  geometry.box('trim', '#f3dec0', cx, 3.1, cz + 5.8, w + 0.4, 0.16, 1.6);
  geometry.box(glowFinish, '#80f3c7', cx, 2.99, cz + 6.3, w - 0.2, 0.035, 0.06);

  // Counter & register
  const counterX = cx + half * 0.5;
  solid('#916652', counterX, 0.56, cz - 2.2, Math.min(3.4, w * 0.34), 1.12, 0.8);
  geometry.box('trim', '#eee0bd', counterX, 1.17, cz - 2.2, Math.min(3.6, w * 0.36), 0.12, 1);
  geometry.box('trim', '#273a40', counterX + 0.3, 1.32, cz - 2.2, 0.5, 0.25, 0.3);

  // Side display shelves
  for (const side of [-1, 1]) {
    const sx = cx + side * (half - 0.8);
    solid('#567871', sx, 0.9, cz + 0.8, 0.8, 1.8, 4.3);
    for (const y of [0.5, 1.05, 1.6]) {
      geometry.box('trim', '#e9d4ad', sx, y, cz + 0.8, 0.92, 0.08, 4.5);
      for (let i = 0; i < 6; i++) {
        geometry.box('wall', ['#cf775e', '#edc06e', '#77b8b0'][i % 3], sx, y + 0.18, cz - 0.9 + i * 0.58, 0.5, 0.28, 0.3);
      }
    }
  }
  geometry.box('goldLight', '#ffe5a9', cx, 3.29, cz - 0.2, Math.min(3, w * 0.3), 0.05, 0.3);
  geometry.box('paint', '#db9a74', cx, 0.092, cz + 4.4, 2.2, 0.02, 1.2);
  // Storefront header signboard (for non-Mercado Palma stores, rendered in crisp instanced trim + glow)
  if (def.id !== 'shop:mercado-palma') {
    geometry.box('trim', accentColor, cx, 3.9, cz + 5.45, w * 0.78, 0.86, 0.14);
    geometry.box(glowFinish, '#ffe7b1', cx, 3.9, cz + 5.53, w * 0.68, 0.22, 0.04);
  }
}
