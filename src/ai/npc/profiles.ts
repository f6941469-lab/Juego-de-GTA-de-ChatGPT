import { makeRandom } from '../../world/generation/layout';

export type NpcRole =
  | 'calm_civilian'
  | 'nervous_civilian'
  | 'curious_civilian'
  | 'brave_civilian'
  | 'aggressive_civilian'
  | 'merchant'
  | 'customer'
  | 'driver'
  | 'worker'
  | 'police';

export interface NpcTraits {
  courage: number;
  aggression: number;
  curiosity: number;
  fearfulness: number;
}

export interface NpcAppearance {
  skin: number;
  hair: number;
  shirt: number;
  pants: number;
  shoe: number;
}

export interface NpcIdentity {
  id: string;
  name: string;
  role: NpcRole;
  traits: NpcTraits;
  appearance: NpcAppearance;
}

interface RoleBaseline {
  courage: [number, number];
  aggression: [number, number];
  curiosity: [number, number];
  fearfulness: [number, number];
  shirts: readonly number[];
}

const roleBaselines: Record<NpcRole, RoleBaseline> = {
  calm_civilian: {
    courage: [0.35, 0.55], aggression: [0.05, 0.2], curiosity: [0.25, 0.45], fearfulness: [0.3, 0.5],
    shirts: [0x247c81, 0x4f8a73, 0xd8b272, 0x6b7f9e],
  },
  nervous_civilian: {
    courage: [0.08, 0.25], aggression: [0.02, 0.12], curiosity: [0.1, 0.3], fearfulness: [0.72, 0.95],
    shirts: [0xc68a7b, 0x9c88a6, 0x869e9c, 0xd4be92],
  },
  curious_civilian: {
    courage: [0.3, 0.52], aggression: [0.05, 0.18], curiosity: [0.75, 0.96], fearfulness: [0.25, 0.48],
    shirts: [0xe07a5f, 0x3d8b89, 0xe2b857, 0x736c9e],
  },
  brave_civilian: {
    courage: [0.72, 0.92], aggression: [0.25, 0.48], curiosity: [0.35, 0.6], fearfulness: [0.1, 0.28],
    shirts: [0x2c5c75, 0x8a4f4b, 0x3a6f59, 0x474f63],
  },
  aggressive_civilian: {
    courage: [0.65, 0.88], aggression: [0.72, 0.95], curiosity: [0.2, 0.45], fearfulness: [0.08, 0.25],
    shirts: [0x9e343a, 0x30323d, 0xb85b35, 0x5c374c],
  },
  merchant: {
    courage: [0.25, 0.68], aggression: [0.08, 0.35], curiosity: [0.2, 0.4], fearfulness: [0.35, 0.78],
    shirts: [0x268f90, 0xd98a52, 0x4e7988, 0x91586b],
  },
  customer: {
    courage: [0.22, 0.58], aggression: [0.05, 0.25], curiosity: [0.35, 0.72], fearfulness: [0.35, 0.75],
    shirts: [0x7eb3a6, 0xe8a87c, 0x8d87b2, 0xc38d9e],
  },
  driver: {
    courage: [0.3, 0.62], aggression: [0.15, 0.45], curiosity: [0.2, 0.5], fearfulness: [0.3, 0.65],
    shirts: [0x4c6073, 0x7a6a58, 0x396e6b, 0x9a6d56],
  },
  worker: {
    courage: [0.45, 0.72], aggression: [0.2, 0.42], curiosity: [0.25, 0.48], fearfulness: [0.22, 0.45],
    shirts: [0xd98a2b, 0xc9b236, 0x516b7d, 0x6f7c68],
  },
  police: {
    courage: [0.8, 0.96], aggression: [0.45, 0.7], curiosity: [0.35, 0.55], fearfulness: [0.05, 0.18],
    shirts: [0x263554],
  },
};

const firstNames = [
  'Mateo', 'Lucía', 'Carlos', 'Sofía', 'Diego', 'Valentina', 'Andrés', 'Camila',
  'Javier', 'Elena', 'Marco', 'Paula', 'Hugo', 'Natalia', 'Sergio', 'Carmen',
];
const lastNames = [
  'Ríos', 'Vega', 'Mora', 'Silva', 'Navarro', 'Castro', 'Pardo', 'Cortés',
  'Méndez', 'Núñez', 'Soler', 'Fuentes', 'Blanco', 'Peña', 'Rojas', 'Acosta',
];
const skins = [0xbd7855, 0xd8a384, 0x9d5e42, 0xe4ba9c, 0x764532];
const hairs = [0x211927, 0x452d22, 0x8c633b, 0x17161c, 0x6e6a6e];
const pantsPalette = [0x2f3545, 0x464852, 0x26303d, 0x5e5548];
const shoesPalette = [0xeedfc9, 0x2a2b32, 0x5d493c];

function range(random: () => number, [min, max]: [number, number]): number {
  return min + (max - min) * random();
}

export function createNpcIdentity(seed: number, role: NpcRole, serial: number): NpcIdentity {
  const random = makeRandom(seed ^ Math.imul(serial + 17, 79193));
  const baseline = roleBaselines[role];
  const first = firstNames[Math.floor(random() * firstNames.length)];
  const last = lastNames[Math.floor(random() * lastNames.length)];
  return {
    id: `npc-${role}-${serial}`,
    name: `${first} ${last}`,
    role,
    traits: {
      courage: range(random, baseline.courage),
      aggression: range(random, baseline.aggression),
      curiosity: range(random, baseline.curiosity),
      fearfulness: range(random, baseline.fearfulness),
    },
    appearance: {
      skin: skins[Math.floor(random() * skins.length)],
      hair: hairs[Math.floor(random() * hairs.length)],
      shirt: baseline.shirts[Math.floor(random() * baseline.shirts.length)],
      pants: role === 'police' ? 0x1e263b : pantsPalette[Math.floor(random() * pantsPalette.length)],
      shoe: role === 'police' ? 0x16181f : shoesPalette[Math.floor(random() * shoesPalette.length)],
    },
  };
}
