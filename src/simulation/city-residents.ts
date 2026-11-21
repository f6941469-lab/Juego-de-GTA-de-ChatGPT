import type { Point3 } from '../physics/physics';
import type { Navigation } from './navigation';

/** Authored sidewalk destinations remain stable when a zone changes simulation tier. */
export function cityResidents(navigation: Navigation) {
  const definitions = [
    { id: 'ines', name: 'Inés', color: 0x7eac8e, personality: 'call' as const, corners: [[-50.6, -80], [-50.6, -70], [-39.4, -70], [-39.4, -80]] },
    { id: 'nico', name: 'Nico', color: 0xbd8969, personality: 'flee' as const, corners: [[-50.6, -17], [-50.6, -35], [-39.4, -35], [-39.4, -17]] },
    { id: 'alma', name: 'Alma', color: 0xa280b1, personality: 'record' as const, corners: [[-27.6, 64], [-27.6, 82], [-16.4, 82], [-16.4, 64]] },
    { id: 'vera', name: 'Vera', color: 0x689fbd, personality: 'call' as const, corners: [[34.4, -82], [34.4, -70], [21.6, -70], [21.6, -82]] },
    { id: 'leo', name: 'Leo', color: 0xd7a250, personality: 'record' as const, corners: [[53.2, -52], [53.2, -35], [56.2, -35], [56.2, -52]] },
    { id: 'iris', name: 'Iris', color: 0xb66f7f, personality: 'call' as const, corners: [[-50.6, 65], [-50.6, 83], [-39.4, 83], [-39.4, 65]] },
  ];
  return definitions.flatMap(definition => {
    const route = definition.corners.map(([x, z]) => navigation.closest({ x, y: 0.08, z }, 3.6))
      .filter((point): point is Point3 => point !== undefined);
    if (route.length < 2) return [];
    return [{ id: `person:${definition.id}`, name: definition.name, color: definition.color,
      personality: definition.personality, role: 'walker' as const, spawn: route[0], route }];
  });
}
