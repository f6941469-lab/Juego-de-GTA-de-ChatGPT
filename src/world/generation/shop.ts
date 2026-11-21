import type { StaticBox } from '../../physics/physics';
import type { DistrictGeometry } from './geometry';

export const shop = {
  id: 'shop:mercado-palma',
  entrance: { x: 15, y: 0.08, z: 40.5 },
  cashier: { x: 17.6, y: 0.08, z: 30.6 },
  counter: { x: 17.4, y: 0.08, z: 33.4 },
  products: { x: 12.8, y: 0.08, z: 35.4 },
};
export const shopWindows: StaticBox[] = [11.8, 18.2].map((x) => ({ x, y: 1.66, z: 39.35, halfX: 1.35, halfY: 1.05, halfZ: 0.055 }));

export function addShop(geometry: DistrictGeometry, colliders: StaticBox[]) {
  function solid(color: string, x: number, y: number, z: number, w: number, h: number, d: number) {
    geometry.box('wall', color, x, y, z, w, h, d, true);
    colliders.push({ x, y, z, halfX: w / 2, halfY: h / 2, halfZ: d / 2 });
  }
  solid('#e8c5a2', 10, 1.7, 34.2, 0.24, 3.4, 10.6);
  solid('#e8c5a2', 20, 1.7, 34.2, 0.24, 3.4, 10.6);
  solid('#72aaa1', 15, 1.7, 29, 10, 3.4, 0.24);
  solid('#f3dec0', 15, 3.45, 34.2, 10.4, 0.24, 10.8);
  solid('#d8ceb1', 15, 0.04, 34.2, 9.8, 0.08, 10.2);
  for (const x of [10.15, 13.35, 16.65, 19.85]) solid('#32938b', x, 1.7, 39.35, 0.25, 3.4, 0.24);
  for (const x of [11.8, 18.2]) solid('#72aaa1', x, 0.3, 39.35, 3.2, 0.6, 0.25);
  solid('#32938b', 15, 3.05, 39.35, 10, 0.7, 0.3);
  geometry.box('trim', '#f3dec0', 15, 3.1, 40, 10.4, 0.16, 1.6);
  geometry.box('aquaLight', '#80f3c7', 15, 2.99, 40.5, 9.8, 0.035, 0.06);
  solid('#916652', 17.5, 0.56, 32, 3.4, 1.12, 0.8);
  geometry.box('trim', '#eee0bd', 17.5, 1.17, 32, 3.6, 0.12, 1);
  geometry.box('trim', '#273a40', 17.8, 1.32, 32, 0.5, 0.25, 0.3);
  for (const x of [10.8, 19.2]) {
    solid('#567871', x, 0.9, 35, 0.8, 1.8, 4.3);
    for (const y of [0.5, 1.05, 1.6]) {
      geometry.box('trim', '#e9d4ad', x, y, 35, 0.92, 0.08, 4.5);
      for (let i = 0; i < 7; i++) geometry.box('wall', ['#cf775e', '#edc06e', '#77b8b0'][i % 3], x, y + 0.18, 33.2 + i * 0.55, 0.5, 0.28, 0.3);
    }
  }
  geometry.box('goldLight', '#ffe5a9', 15, 3.29, 34, 3, 0.05, 0.3);
  geometry.box('paint', '#db9a74', 15, 0.092, 38.6, 2.2, 0.02, 1.2);
}
