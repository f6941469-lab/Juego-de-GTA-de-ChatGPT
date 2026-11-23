import type { WorldEvent } from './model';

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
): string {
  if (recentEvent) {
    if (recentEvent.kind === 'shot' || recentEvent.kind === 'robbery') {
      return `${speakerName}: ¿Escuchaste eso? Mejor no acercarse a esa manzana.`;
    }
    if (recentEvent.kind === 'collision') {
      return `${speakerName}: Hubo un choque ahí atrás, el tráfico viene retrasado.`;
    }
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
  return `${speakerName}: Voy camino a ${jobLabels[speakerJob]}, hoy la avenida está movida.`;
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
  },
  topic: DialogueTopic['id'],
  recentEvent?: WorldEvent,
): string {
  if (npc.stalkScore >= 18) {
    return 'No quiero hablar contigo, llevas siguiéndome demasiado rato. Aléjate.';
  }
  if (topic === 'greet') {
    return `Hola. Soy ${npc.name}. Ahora mismo estoy en ${npc.activityLabel}.`;
  }
  if (topic === 'activity') {
    if (npc.activityLabel.includes('bus')) {
      return 'Estoy esperando el autobús para cruzar al otro lado del distrito. Si se retrasa, bajaré al metro.';
    }
    if (npc.activityLabel.includes('metro')) {
      return 'Tuve que venir al metro para moverme más rápido entre barrios.';
    }
    return `Voy hacia ${jobLabels[npc.job]}. Intento no llegar tarde.`;
  }
  if (topic === 'neighborhood') {
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
  return 'Nos vemos por el barrio.';
}
