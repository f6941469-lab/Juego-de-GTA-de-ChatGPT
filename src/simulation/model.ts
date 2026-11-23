import type { Point3 } from '../physics/physics';
import { allShops, type StoreCatalogItem } from '../world/generation/shop';
import { zoneIdAt } from './world-state';

export type EventKind = 'shot' | 'threat' | 'robbery' | 'glass' | 'collision' | 'report' | 'theft' | 'altercation';
export interface WorldEvent {
  id: number; zoneId: string | undefined; kind: EventKind; position: Point3; time: number;
  source: string; identified: boolean; incident?: number;
}

export interface RecordedActorPose {
  id: string;
  x: number;
  y: number;
  z: number;
  heading: number;
  health: number;
  action: string;
  armed: boolean;
  color: number;
}

export interface RecordedVehiclePose {
  id: string;
  x: number;
  y: number;
  z: number;
  heading: number;
  color: number;
  kind: 'car' | 'bus' | 'police' | 'metro';
}

export interface RecordingFrame {
  time: number;
  camX: number;
  camY: number;
  camZ: number;
  lookX: number;
  lookY: number;
  lookZ: number;
  dropped: boolean;
  actors: RecordedActorPose[];
  vehicles: RecordedVehiclePose[];
}

export interface WitnessClip {
  clipId: string;
  authorId: string;
  author: string;
  incidentId: number;
  locationName: string;
  status: 'live' | 'partial' | 'complete';
  interruptedReason?: string;
  frames: RecordingFrame[];
}

export interface Post {
  id: number;
  author: string;
  event: WorldEvent;
  recording: 'unavailable' | 'live' | 'partial' | 'complete';
  caption?: string;
  views: number;
  likes: number;
  comments: string[];
  clips: WitnessClip[];
}

const socialCaptions: Record<EventKind, string[]> = {
  shot: ['¡Se acaban de escuchar disparos aquí mismo!', 'Alguien disparó en plena calle, todo el mundo corriendo.'],
  threat: ['Están apuntando con un arma en el local.', 'Momento de tensión ahora mismo en el barrio.'],
  robbery: ['¡Acaban de atracar la tienda! La gente salió corriendo.', 'Asalto en directo, la policía viene en camino.'],
  glass: ['Cristales rotos por todo el suelo.', 'Estalló el escaparate del comercio.'],
  collision: ['Fuerte golpe en el cruce, tráfico detenido.', 'Accidente justo frente a la acera.'],
  report: ['Vecinos avisando a emergencias.', 'Llamada al 911 desde la zona.'],
  theft: ['¡Le acaban de robar el coche delante de todos!', 'Robo de vehículo a plena luz.'],
  altercation: ['Pelea en la calle entre dos personas.', 'Discusión fuerte que acabó en carrera.'],
};

const commentPool = [
  '¿Están todos bien por allí?',
  'Acabo de pasar por esa esquina, qué locura.',
  'La policía ya debería estar llegando.',
  'Increíble que lo grabaran tan de cerca.',
  'Hoy el barrio está imposible...',
  'Ojalá pongan más patrullas por Costa Palmera.',
];

export class Journal {
  private nextId = 1;
  readonly events: WorldEvent[] = [];
  readonly posts: Post[] = [];
  readonly allClips: WitnessClip[] = [];

  publish(kind: EventKind, position: Point3, time: number, source = 'player', identified = true, incident?: number) {
    const event: WorldEvent = { id: this.nextId++, zoneId: zoneIdAt(position), kind, position: { ...position }, time, source, identified, incident };
    this.events.push(event);
    if (this.events.length > 96) this.events.shift();
    return event;
  }

  since(id: number) { return this.events.filter((event) => event.id > id); }

  post(author: string, event: WorldEvent, caption?: string) {
    const existing = this.posts.find((post) => post.event.id === event.id);
    if (existing) return existing;
    const pool = socialCaptions[event.kind];
    const autoCaption = caption ?? pool[event.id % pool.length];
    const entry: Post = {
      id: event.id,
      author,
      event,
      recording: 'unavailable',
      caption: autoCaption,
      views: 12 + (event.id % 19),
      likes: 2 + (event.id % 5),
      comments: [commentPool[event.id % commentPool.length]],
      clips: [],
    };
    this.posts.unshift(entry);
    if (this.posts.length > 16) this.posts.pop();
    return entry;
  }

  upsertClip(event: WorldEvent, clip: WitnessClip, locationName?: string) {
    const incidentKey = event.incident ?? event.id;
    let targetPost = this.posts.find((p) => (p.event.incident ?? p.event.id) === incidentKey || Math.abs(p.event.time - event.time) < 8 && Math.hypot(p.event.position.x - event.position.x, p.event.position.z - event.position.z) < 28);
    if (!targetPost) {
      targetPost = this.post(clip.author, event, locationName ? `${socialCaptions[event.kind][0]} (${locationName})` : undefined);
    }
    const idx = targetPost.clips.findIndex((c) => c.clipId === clip.clipId);
    if (idx >= 0) targetPost.clips[idx] = clip;
    else targetPost.clips.push(clip);

    const gIdx = this.allClips.findIndex((c) => c.clipId === clip.clipId);
    if (gIdx >= 0) this.allClips[gIdx] = clip;
    else {
      this.allClips.unshift(clip);
      if (this.allClips.length > 24) this.allClips.pop();
    }

    if (clip.frames.length > 0) {
      targetPost.recording = clip.status;
      targetPost.views += clip.status === 'complete' ? 45 : 18;
      targetPost.likes += clip.status === 'complete' ? 9 : 3;
      if (clip.status === 'partial' && !targetPost.comments.some((c) => c.includes('cortó'))) {
        targetPost.comments.unshift('¡Se cortó la transmisión en directo!');
      }
    }
    return targetPost;
  }

  tickSocial(dt: number) {
    for (const post of this.posts) {
      if (post.recording !== 'unavailable') {
        post.views += Math.floor(dt * 8);
      }
    }
  }

  reset() {
    this.events.length = this.posts.length = this.allClips.length = 0;
    this.nextId = 1;
  }
}

export const products = [
  { id: 'water', name: 'Agua mineral', detail: 'Botella · recupera 15 de salud', price: 8 },
  { id: 'snack', name: 'Bocadillo tropical', detail: 'Una porción · recupera 30 de salud', price: 12 },
  { id: 'ammo', name: 'Munición de práctica', detail: 'Caja de 12 · para tu pistola', price: 30 },
] as const;
export type Item = typeof products[number]['id'];

export interface StoreLedger {
  till: number;
  stock: Record<string, number>;
  catalog: readonly StoreCatalogItem[];
}

export class Economy {
  money = 120;
  armor = 0;
  readonly inventory: Record<string, number> = { water: 0, snack: 0, ammo: 0 };
  readonly stores = new Map<string, StoreLedger>();
  private readonly defaultStoreId = allShops[0].id;

  constructor() {
    this.initStores();
  }

  private initStores() {
    this.stores.clear();
    for (const def of allShops) {
      const stock: Record<string, number> = {};
      for (const item of def.catalog) {
        stock[item.id] = item.initialStock;
        if (!(item.id in this.inventory)) this.inventory[item.id] = 0;
      }
      this.stores.set(def.id, { till: def.initialTill, stock, catalog: def.catalog });
    }
  }

  private defaultStore() { return this.stores.get(this.defaultStoreId)!; }

  get till() { return this.defaultStore().till; }
  set till(value: number) { this.defaultStore().till = value; }
  get stock() { return this.defaultStore().stock; }

  store(id: string) { return this.stores.get(id); }

  buy(id: string) {
    return this.buyFrom(this.defaultStoreId, id);
  }

  buyFrom(storeId: string, itemId: string) {
    const ledger = this.stores.get(storeId);
    if (!ledger) return 'Tienda desconocida';
    const item = ledger.catalog.find((entry) => entry.id === itemId);
    if (!item) return 'Producto desconocido';
    if ((ledger.stock[item.id] ?? 0) <= 0) return 'Producto agotado';
    if (this.money < item.price) return 'Saldo insuficiente';
    this.money -= item.price;
    ledger.till += item.price;
    ledger.stock[item.id]--;
    this.inventory[item.id] = (this.inventory[item.id] ?? 0) + 1;
    return null;
  }

  npcBuyFrom(storeId: string, itemId: string, budget: number): StoreCatalogItem | undefined {
    const ledger = this.stores.get(storeId);
    if (!ledger) return undefined;
    const item = ledger.catalog.find((entry) => entry.id === itemId);
    if (!item || (ledger.stock[item.id] ?? 0) <= 0 || budget < item.price) return undefined;
    ledger.stock[item.id]--;
    ledger.till += item.price;
    return item;
  }

  use(id: string) {
    if ((this.inventory[id] ?? 0) <= 0) return false;
    this.inventory[id]--;
    return true;
  }

  findItemSpec(id: string): StoreCatalogItem | undefined {
    for (const def of allShops) {
      const found = def.catalog.find((item) => item.id === id);
      if (found) return found;
    }
    return undefined;
  }

  ownedItems(): Array<{ item: StoreCatalogItem; count: number }> {
    const seen = new Set<string>();
    const result: Array<{ item: StoreCatalogItem; count: number }> = [];
    for (const def of allShops) {
      for (const item of def.catalog) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        const count = this.inventory[item.id] ?? 0;
        if (count > 0 || item.id === 'water' || item.id === 'snack' || item.id === 'ammo') {
          result.push({ item, count });
        }
      }
    }
    return result;
  }

  rob() {
    return this.robStore(this.defaultStoreId);
  }

  robStore(storeId: string) {
    const ledger = this.stores.get(storeId);
    if (!ledger) return 0;
    const cash = ledger.till;
    ledger.till = 0;
    this.money += cash;
    return cash;
  }

  reset() {
    this.money = 120;
    this.armor = 0;
    for (const key of Object.keys(this.inventory)) this.inventory[key] = 0;
    this.initStores();
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
