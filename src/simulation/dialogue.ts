import type { WorldEvent } from './model';
import { recentSalientMemory, type NpcMemoryEntry, type NpcMind } from './npc-mind';

export type NpcJob = 'cashier' | 'oficinista' | 'repartidor' | 'estudiante' | 'barista' | 'tecnico' | 'turista' | 'vecino';

export interface DialogueTopic {
  id: 'greet' | 'activity' | 'neighborhood' | 'leave';
  label: string;
}

export const dialogueTopics: readonly DialogueTopic[] = [
  { id: 'greet', label: 'Saludar' },
  { id: 'activity', label: '¿Adónde vas ahora?' },
  { id: 'neighborhood', label: '¿Cómo está el barrio?' },
  { id: 'leave', label: 'Seguir tu camino' },
];

const jobLabels: Record<NpcJob, string> = {
  cashier: 'atender la tienda',
  oficinista: 'la oficina en Torre Alba',
  repartidor: 'repartir pedidos por la avenida',
  estudiante: 'clases cerca del centro',
  barista: 'la cafetería del paseo',
  tecnico: 'revisar los semáforos del cruce',
  turista: 'conocer Costa Palmera',
  vecino: 'hacer unos recados',
};

export function npcPairLine(
  speakerName: string,
  speakerJob: NpcJob,
  activity: string,
  recentEvent?: WorldEvent,
  hour = 17,
  gossip?: NpcMemoryEntry,
  listenerName?: string,
  familiarity = 0,
): string {
  if (gossip) {
    return `${speakerName}: Oye ${listenerName ?? ''}, ¿te enteraste? ${gossip.summary}.`.replace(' ,', ',');
  }
  if (recentEvent) {
    if (recentEvent.kind === 'shot' || recentEvent.kind === 'robbery') {
      return `${speakerName}: ¿Escuchaste eso? Mejor no acercarse a esa manzana.`;
    }
    if (recentEvent.kind === 'collision') {
      return `${speakerName}: Hubo un choque ahí atrás, el tráfico viene retrasado.`;
    }
  }
  if (familiarity >= 35 && listenerName) {
    return `${speakerName}: ¡Hey ${listenerName}! Qué gusto verte otra vez por aquí.`;
  }
  if (activity === 'wait_bus') {
    return `${speakerName}: ¿Sabes si el bus ya pasó? Llevo unos minutos esperando.`;
  }
  if (activity === 'wait_metro') {
    return `${speakerName}: Perdí el autobús de arriba, menos mal que el metro sigue pasando.`;
  }
  if (activity === 'shop') {
    return `${speakerName}: Vine a comprar algo rápido antes de seguir con ${jobLabels[speakerJob]}.`;
  }
  if (hour >= 20 || hour < 6) {
    return `${speakerName}: Qué buena pinta tienen los neones esta noche por el bulevar.`;
  }
  if (hour < 11) {
    return `${speakerName}: Primero un café bien cargado antes de ir a ${jobLabels[speakerJob]}.`;
  }
  return `${speakerName}: Voy camino a ${jobLabels[speakerJob]}, hoy la avenida está movida.`;
}

export function dodgeCarLine(name: string, index: number): string {
  const lines = [
    `${name}: ¡Eh, cuidado! ¡Casi me atropellas!`,
    `${name}: ¡Frena, loco! ¡Esto es un paso de peatones!`,
    `${name}: ¡Mira por dónde conduces!`,
  ];
  return lines[index % lines.length];
}

export function chaseReactionLine(name: string, stars: number, personality: 'flee' | 'call' | 'record'): string {
  if (personality === 'record') {
    return stars >= 4
      ? `${name}: ¡Hasta hay un helicóptero! ¡Esto va directo a Palma Social!`
      : `${name}: ¡Miren esa persecución! Lo estoy grabando todo.`;
  }
  if (stars >= 4) {
    return `${name}: ¡Vienen los SWAT y un helicóptero, salgan de la calle!`;
  }
  return `${name}: ¡Apartaos, la policía persigue a alguien por la avenida!`;
}

export function armedWarningLine(name: string): string {
  return `${name}: ¡Baja esa pistola, por favor! ¡No quiero problemas!`;
}

export function stalkWarningLine(name: string, level: 1 | 2): string {
  if (level === 1) {
    return `${name}: Oye… ¿vas para el mismo sitio o me estás siguiendo?`;
  }
  return `${name}: Llevas rato detrás de mí desde hace varias calles. ¡Déjame en paz!`;
}

export function playerDialogueReply(
  npc: {
    name: string;
    job: NpcJob;
    activityLabel: string;
    stalkScore: number;
    memory?: { event: WorldEvent; identified: boolean };
    mind?: NpcMind;
  },
  topic: DialogueTopic['id'],
  recentEvent?: WorldEvent,
  policeStars = 0,
  now = 0,
): string {
  if (npc.stalkScore >= 18) {
    return 'No quiero hablar contigo, llevas siguiéndome demasiado rato. Aléjate.';
  }
  if (policeStars >= 2) {
    return '¡No te acerques a mí con la policía detrás! Sigue corriendo.';
  }
  const mind = npc.mind;
  const crimeMemory = mind?.memories.find((m) => m.aboutPlayer && m.intensity >= 25);
  if (mind && (mind.playerTrust <= -25 || mind.playerWitnessedCrimes > 0) && topic !== 'leave') {
    if (crimeMemory) {
      return `No me olvido de lo de antes: ${crimeMemory.summary}. Mantente lejos de mí.`;
    }
    return 'Te recuerdo de antes y no me inspiras confianza. Sigue tu camino.';
  }

  if (topic === 'greet') {
    if (mind && mind.playerTrust >= 12 && mind.playerChats >= 2) {
      return `¡Ey, qué tal otra vez! Soy ${npc.name}. Ahora mismo estoy en ${npc.activityLabel}.`;
    }
    return `Hola. Soy ${npc.name}. Ahora mismo estoy en ${npc.activityLabel}.`;
  }
  if (topic === 'activity') {
    if (npc.activityLabel.includes('bus')) {
      return 'Estoy esperando el autobús para cruzar al otro lado del distrito. Si se retrasa, bajaré al metro.';
    }
    if (npc.activityLabel.includes('metro')) {
      return 'Tuve que venir al metro para moverme más rápido entre barrios.';
    }
    if (mind && mind.drives.hunger > 65) {
      return 'Tengo bastante hambre, voy a buscar un café o algo de comer antes de seguir.';
    }
    return `Voy hacia ${jobLabels[npc.job]}. Intento no llegar tarde.`;
  }
  if (topic === 'neighborhood') {
    const salient = mind ? recentSalientMemory(mind, now) : undefined;
    if (salient) {
      if (salient.kind === 'gossip') {
        return `Me acaban de contar algo fuerte: ${salient.summary}. La gente anda atenta.`;
      }
      if (salient.kind === 'shot') return 'Hace poco se oyeron disparos por aquí. Todavía tengo el susto en el cuerpo.';
      if (salient.kind === 'robbery') return 'Asaltaron un comercio hace un rato, todos andan comentándolo.';
      if (salient.kind === 'theft') return 'Vi a alguien llevarse un coche por la fuerza hace poco.';
      if (salient.kind === 'altercation') return 'Hubo una pelea fuerte entre vecinos hace poco.';
      return `Todavía recuerdo que ${salient.summary}. Ten cuidado por esa zona.`;
    }
    const known = npc.memory?.event ?? recentEvent;
    if (known) {
      if (known.kind === 'shot') return 'Hace nada se oyeron disparos cerca. La gente anda muy nerviosa.';
      if (known.kind === 'robbery') return 'Acaban de asaltar un comercio del barrio, oí a los testigos avisar a la policía.';
      if (known.kind === 'theft') return 'Vi a alguien llevarse un coche por la fuerza hace un momento.';
      if (known.kind === 'altercation') return 'Hubo una pelea fuerte entre dos vecinos hace poco.';
      return 'Hoy hubo bastante alboroto por esta zona, ten cuidado.';
    }
    return 'Por ahora todo tranquilo en Costa Palmera, buen día para caminar o pasar por las tiendas.';
  }
  return mind && mind.playerTrust >= 15 ? '¡Cuídate mucho! Nos vemos luego por Costa Palmera.' : 'Nos vemos por el barrio.';
}
