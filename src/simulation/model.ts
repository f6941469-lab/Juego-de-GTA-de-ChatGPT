import type { Point3 } from '../physics/physics';
import { zoneIdAt } from './world-state';

export type EventKind = 'shot' | 'threat' | 'robbery' | 'glass' | 'collision' | 'report';
export interface WorldEvent {
  id: number; zoneId: string | undefined; kind: EventKind; position: Point3; time: number;
  source: string; identified: boolean; incident?: number;
}
export interface Post { id: number; author: string; event: WorldEvent; recording: 'unavailable' }
export class Journal {
  private nextId = 1;
  readonly events: WorldEvent[] = [];
  readonly posts: Post[] = [];
  publish(kind: EventKind, position: Point3, time: number, source = 'player', identified = true, incident?: number) {
    const event: WorldEvent = { id: this.nextId++, zoneId: zoneIdAt(position), kind, position: { ...position }, time, source, identified, incident };
    this.events.push(event);
    if (this.events.length > 96) this.events.shift();
    return event;
  }
  since(id: number) { return this.events.filter((event) => event.id > id); }
  post(author: string, event: WorldEvent) {
    if (this.posts.some((post) => post.event.id === event.id)) return;
    this.posts.unshift({ id: event.id, author, event, recording: 'unavailable' });
    if (this.posts.length > 16) this.posts.pop();
  }
  reset() { this.events.length = this.posts.length = 0; this.nextId = 1; }
}
export const products = [
  { id: 'water', name: 'Agua mineral', detail: 'Botella · recupera 15 de salud', price: 8 },
  { id: 'snack', name: 'Bocadillo tropical', detail: 'Una porción · recupera 30 de salud', price: 12 },
  { id: 'ammo', name: 'Munición de práctica', detail: 'Caja de 12 · para tu pistola', price: 30 },
] as const;
export type Item = typeof products[number]['id'];
export class Economy {
  money = 120;
  till = 90;
  readonly inventory: Record<Item, number> = { water: 0, snack: 0, ammo: 0 };
  readonly stock: Record<Item, number> = { water: 12, snack: 8, ammo: 5 };
  buy(id: string) {
    const product = products.find((product) => product.id === id);
    if (!product) return 'Producto desconocido';
    if (this.stock[product.id] <= 0) return 'Producto agotado';
    if (this.money < product.price) return 'Saldo insuficiente';
    this.money -= product.price; this.till += product.price;
    this.stock[product.id]--; this.inventory[product.id]++;
    return null;
  }
  use(id: Item) { if (this.inventory[id] <= 0) return false; this.inventory[id]--; return true; }
  rob() { const cash = this.till; this.till = 0; this.money += cash; return cash; }
  reset() {
    this.money = 120; this.till = 90;
    Object.assign(this.inventory, { water: 0, snack: 0, ammo: 0 });
    Object.assign(this.stock, { water: 12, snack: 8, ammo: 5 });
  }
}
export class Weapon {
  equipped = false;
  rounds = 8;
  reserve = 24;
  cooldown = 0;
  reloadTime = 0;
  toggle() { this.equipped = !this.equipped; if (!this.equipped) this.reloadTime = 0; }
  reload() {
    if (!this.equipped || this.reloadTime > 0 || this.rounds === 8 || this.reserve <= 0) return false;
    this.reloadTime = 1.3; return true;
  }
  tick(dt: number) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.reloadTime <= 0) return;
    this.reloadTime = Math.max(0, this.reloadTime - dt);
    if (this.reloadTime === 0) {
      const amount = Math.min(8 - this.rounds, this.reserve);
      this.rounds += amount; this.reserve -= amount;
    }
  }
  fire() {
    if (!this.equipped || this.reloadTime > 0 || this.cooldown > 0 || this.rounds <= 0) return false;
    this.rounds--; this.cooldown = 0.26; return true;
  }
  reset() { this.equipped = false; this.rounds = 8; this.reserve = 24; this.cooldown = this.reloadTime = 0; }
}
export const planarDistance = (a: Pick<Point3, 'x' | 'z'>, b: Pick<Point3, 'x' | 'z'>) => Math.hypot(a.x - b.x, a.z - b.z);
export const eyes = (point: Point3): Point3 => ({ x: point.x, y: point.y + 1.5, z: point.z });
