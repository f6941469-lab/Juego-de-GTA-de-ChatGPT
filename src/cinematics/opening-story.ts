import type {
  ActorSample,
  CameraSample,
  CinematicActorId,
  CinematicFrameState,
  CinematicSequence,
  CinematicShotMeta,
  CinematicVehicleId,
  DialogueCue,
  TimedAudioCue,
  TimedParticleCue,
  TitleCardCue,
  Vec3Tuple,
  VehicleSample,
} from './types';

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(t: number): number {
  const c = clamp01(t);
  return c * c * (3 - 2 * c);
}

function easeOutCubic(t: number): number {
  const c = clamp01(t);
  return 1 - Math.pow(1 - c, 3);
}

function easeInOutCubic(t: number): number {
  const c = clamp01(t);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec(a: Vec3Tuple, b: Vec3Tuple, t: number): Vec3Tuple {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
  };
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

function headingToward(from: Vec3Tuple, to: Vec3Tuple): number {
  return Math.atan2(to.x - from.x, -(to.z - from.z));
}

function seg(time: number, start: number, end: number): number {
  return clamp01((time - start) / Math.max(0.0001, end - start));
}

const SHOTS: readonly CinematicShotMeta[] = [
  { id: 'shot_01_establish', label: 'Bulevar al atardecer', start: 0.0, end: 3.5, mood: 'golden_boulevard', hour: 17.35 },
  { id: 'shot_02_lockpick', label: 'Forzando la cerradura', start: 3.5, end: 8.2, mood: 'golden_boulevard', hour: 17.35 },
  { id: 'shot_03_valeria_enters', label: 'Aparece Valeria', start: 8.2, end: 11.8, mood: 'golden_boulevard', hour: 17.4 },
  { id: 'shot_04_argue_leo', label: 'Discusión — Leo', start: 11.8, end: 15.2, mood: 'golden_boulevard', hour: 17.4 },
  { id: 'shot_05_argue_valeria', label: 'Discusión — Valeria', start: 15.2, end: 18.6, mood: 'golden_boulevard', hour: 17.45 },
  { id: 'shot_06_police_arrival', label: 'Llegada de la patrulla', start: 18.6, end: 22.8, mood: 'police_tension', hour: 17.55 },
  { id: 'shot_07_interrogation', label: 'Interrogatorio policial', start: 22.8, end: 27.6, mood: 'police_tension', hour: 17.6 },
  { id: 'shot_08_glance', label: 'Cruce de miradas', start: 27.6, end: 30.2, mood: 'police_tension', hour: 17.6 },
  { id: 'shot_09_fake_boyfriend', label: 'Farsa de novios — Leo', start: 30.2, end: 34.4, mood: 'police_tension', hour: 17.65 },
  { id: 'shot_10_fake_girlfriend', label: 'Farsa de novios — Valeria', start: 34.4, end: 38.6, mood: 'police_tension', hour: 17.65 },
  { id: 'shot_11_officer_approaches', label: 'El agente se acerca cauteloso', start: 38.6, end: 42.6, mood: 'police_tension', hour: 17.7 },
  { id: 'shot_12_knockout', label: 'El golpe de Valeria', start: 42.6, end: 46.0, mood: 'impact_flash', hour: 17.75 },
  { id: 'shot_13_getaway', label: 'Huida del bulevar', start: 46.0, end: 50.8, mood: 'police_tension', hour: 17.85 },
  { id: 'shot_14_montage_chase', label: 'Montaje — Paseo del Mar', start: 50.8, end: 56.8, mood: 'sunset_chase', hour: 18.45 },
  { id: 'shot_15_montage_neon', label: 'Montaje — Club Neón', start: 56.8, end: 62.8, mood: 'neon_night', hour: 22.35 },
  { id: 'shot_16_montage_palma', label: 'Montaje — Mercado Palma', start: 62.8, end: 68.5, mood: 'palma_handoff', hour: 17.25 },
  { id: 'shot_17_open_world_glide', label: 'Transición al mundo abierto', start: 68.5, end: 71.0, mood: 'palma_handoff', hour: 17.25 },
];

const DIALOGUES: readonly DialogueCue[] = [
  {
    id: 'dlg_01',
    start: 3.7,
    end: 7.7,
    speaker: 'LEO',
    speakerColor: '#56d8d4',
    text: 'Un deportivo clásico sin dueño a la vista… Dos segundos más con la ganzúa y nos vamos de aquí.',
  },
  {
    id: 'dlg_02',
    start: 8.4,
    end: 11.6,
    speaker: 'VALERIA',
    speakerColor: '#ff6b8b',
    text: '¡Eh! ¿Qué demonios crees que haces con mi coche? ¡Suelta esa manija ahora mismo!',
  },
  {
    id: 'dlg_03',
    start: 12.0,
    end: 15.0,
    speaker: 'LEO',
    speakerColor: '#56d8d4',
    text: '¿Tuyo? ¡Tiene el motor ardiendo y el seguro ya venía arañado! No me hagas reír.',
  },
  {
    id: 'dlg_04',
    start: 15.4,
    end: 18.4,
    speaker: 'VALERIA',
    speakerColor: '#ff6b8b',
    text: 'Porque lo acabo de sacar del hotel, genio. ¡Lárgate antes de que te rompa la nariz!',
  },
  {
    id: 'dlg_05',
    start: 23.5,
    end: 27.4,
    speaker: 'AGENTE MORALES',
    speakerColor: '#7cb7ff',
    text: 'Buenas tardes. Quietos los dos. Acaban de reportar este deportivo coral como robado en la costa.',
  },
  {
    id: 'dlg_06',
    start: 27.8,
    end: 30.0,
    speaker: 'VALERIA',
    speakerColor: '#ff6b8b',
    text: '(En voz baja) Como nos detengan con este coche, no salimos en cinco años…',
  },
  {
    id: 'dlg_07',
    start: 30.4,
    end: 34.2,
    speaker: 'LEO',
    speakerColor: '#56d8d4',
    text: '¿Robado? ¡Agente, por favor! Solo intento sacar mi chaqueta del coche de mi novia… ¡tuvimos una pelea!',
  },
  {
    id: 'dlg_08',
    start: 34.6,
    end: 38.4,
    speaker: 'VALERIA',
    speakerColor: '#ff6b8b',
    text: '¡Exnovio desde hace diez minutos, Leo! ¡Te dije que no volvieras a tocar mi coche después de lo de anoche!',
  },
  {
    id: 'dlg_09',
    start: 38.8,
    end: 42.5,
    speaker: 'AGENTE MORALES',
    speakerColor: '#7cb7ff',
    text: 'Cálmense los dos… Un momento, esta cerradura está forzada. Señorita, apártese y muéstreme los papeles.',
  },
  {
    id: 'dlg_10',
    start: 44.2,
    end: 46.0,
    speaker: 'VALERIA',
    speakerColor: '#ff6b8b',
    text: '¡Sube al coche, idiota, antes de que pida refuerzos!',
  },
  {
    id: 'dlg_11',
    start: 46.2,
    end: 48.5,
    speaker: 'LEO',
    speakerColor: '#56d8d4',
    text: '¡Menudo derechazo! ¡Vamos, pisa a fondo!',
  },
  {
    id: 'dlg_12',
    start: 51.4,
    end: 54.3,
    speaker: 'LEO',
    speakerColor: '#56d8d4',
    text: '¡Sigue por el malecón! ¡Con este motor no nos alcanzan ni en broma!',
  },
  {
    id: 'dlg_13',
    start: 54.5,
    end: 56.6,
    speaker: 'VALERIA',
    speakerColor: '#ff6b8b',
    text: '¡Agárrate, que todavía no he metido cuarta!',
  },
  {
    id: 'dlg_14',
    start: 57.5,
    end: 60.2,
    speaker: 'VALERIA',
    speakerColor: '#ff6b8b',
    text: 'Para ser un ladrón improvisado, tienes buen instinto. Bienvenido a Costa Palmera.',
  },
  {
    id: 'dlg_15',
    start: 60.4,
    end: 62.6,
    speaker: 'LEO',
    speakerColor: '#56d8d4',
    text: 'Y tú tienes un gancho que vale oro. ¿Cuál es el próximo plan?',
  },
  {
    id: 'dlg_16',
    start: 64.2,
    end: 67.3,
    speaker: 'VALERIA',
    speakerColor: '#ff6b8b',
    text: 'Mantén perfil bajo y consigue algo de efectivo por el mercado. Te escribiré cuando tengamos el golpe grande.',
  },
  {
    id: 'dlg_17',
    start: 67.5,
    end: 69.2,
    speaker: 'LEO',
    speakerColor: '#56d8d4',
    text: 'Trato hecho. Costa Palmera es nuestra.',
  },
];

const TITLE_CARDS: readonly TitleCardCue[] = [
  {
    id: 'card_prologue',
    start: 0.1,
    end: 3.3,
    eyebrow: 'PRÓLOGO · COSTA PALMERA',
    title: 'UN COCHE, DOS LADRONES',
    subtitle: 'Avenida Central · 17:20',
  },
  {
    id: 'card_montage_1',
    start: 51.0,
    end: 53.6,
    eyebrow: 'NOCHE 1 · PASEO DEL MAR',
    title: 'A TODA VELOCIDAD',
  },
  {
    id: 'card_montage_2',
    start: 57.0,
    end: 59.6,
    eyebrow: 'DÍA 2 · CLUB NEÓN',
    title: 'SOCIOS EN LA SOMBRA',
  },
  {
    id: 'card_montage_3',
    start: 63.0,
    end: 65.6,
    eyebrow: 'DÍA 4 · MERCADO PALMA',
    title: 'EL COMIENZO',
  },
];

const AUDIO_CUES: readonly TimedAudioCue[] = [
  { id: 'sfx_lock_1', time: 4.3, kind: 'lockpick', point: { x: -2.6, y: 0.9, z: 23.0 } },
  { id: 'sfx_lock_2', time: 5.9, kind: 'lockpick', point: { x: -2.6, y: 0.9, z: 23.0 } },
  { id: 'sfx_lock_3', time: 7.2, kind: 'lockpick', point: { x: -2.6, y: 0.9, z: 23.0 } },
  { id: 'sfx_valeria_sting', time: 8.3, kind: 'sting' },
  { id: 'sfx_siren_arrive', time: 18.6, kind: 'siren_burst', point: { x: 1.5, y: 1.5, z: 16.0 } },
  { id: 'sfx_police_brake', time: 20.8, kind: 'tire_screech', point: { x: 1.4, y: 0.3, z: 19.8 } },
  { id: 'sfx_police_door', time: 22.9, kind: 'door', point: { x: 2.3, y: 0.9, z: 20.0 } },
  { id: 'sfx_tension_sting', time: 27.6, kind: 'sting' },
  { id: 'sfx_punch_whoosh', time: 43.65, kind: 'whoosh' },
  { id: 'sfx_punch_hit', time: 43.82, kind: 'punch', point: { x: -0.45, y: 1.5, z: 23.6 } },
  { id: 'sfx_officer_fall', time: 44.65, kind: 'body_fall', point: { x: 1.1, y: 0.2, z: 23.1 } },
  { id: 'sfx_getaway_doors', time: 47.9, kind: 'door', point: { x: -3.6, y: 0.8, z: 23.0 } },
  { id: 'sfx_getaway_rev', time: 48.1, kind: 'engine_rev', point: { x: -3.6, y: 0.5, z: 23.0 } },
  { id: 'sfx_getaway_screech', time: 48.4, kind: 'tire_screech', point: { x: -3.6, y: 0.3, z: 24.5 } },
  { id: 'sfx_montage_1', time: 50.9, kind: 'montage_beat' },
  { id: 'sfx_montage_1_rev', time: 52.2, kind: 'engine_rev', point: { x: 47.0, y: 0.6, z: 32.0 } },
  { id: 'sfx_montage_2', time: 56.9, kind: 'montage_beat' },
  { id: 'sfx_montage_2_chime', time: 59.0, kind: 'chime' },
  { id: 'sfx_montage_3', time: 62.9, kind: 'montage_beat' },
  { id: 'sfx_palma_door', time: 65.2, kind: 'door', point: { x: 14.5, y: 0.8, z: 46.4 } },
  { id: 'sfx_handoff_chime', time: 68.5, kind: 'chime' },
];

const PARTICLE_CUES: readonly TimedParticleCue[] = [
  { id: 'fx_spark_1', time: 4.35, kind: 'sparks', point: { x: -2.85, y: 0.86, z: 22.95 } },
  { id: 'fx_spark_2', time: 5.95, kind: 'sparks', point: { x: -2.85, y: 0.86, z: 22.95 } },
  { id: 'fx_spark_3', time: 7.25, kind: 'sparks', point: { x: -2.85, y: 0.86, z: 22.95 } },
  { id: 'fx_punch_impact', time: 43.82, kind: 'impact', point: { x: -0.52, y: 1.52, z: 23.62 } },
  { id: 'fx_getaway_smoke_1', time: 48.25, kind: 'exhaust', point: { x: -3.8, y: 0.3, z: 21.0 } },
  { id: 'fx_getaway_smoke_2', time: 48.65, kind: 'exhaust', point: { x: -3.8, y: 0.3, z: 23.0 } },
  { id: 'fx_chase_smoke', time: 53.0, kind: 'exhaust', point: { x: 47.0, y: 0.3, z: 27.5 } },
];

function findShot(time: number): CinematicShotMeta {
  for (const shot of SHOTS) {
    if (time < shot.end) return shot;
  }
  return SHOTS[SHOTS.length - 1];
}

function activeSpeaker(time: number): DialogueCue['speaker'] | null {
  for (const d of DIALOGUES) {
    if (time >= d.start && time <= d.end) return d.speaker;
  }
  return null;
}

function evaluateActBoulevard(time: number, speaker: DialogueCue['speaker'] | null): {
  actors: Record<CinematicActorId, ActorSample>;
  vehicles: Record<CinematicVehicleId, VehicleSample>;
  camera: CameraSample;
  focus: Vec3Tuple;
  sirenAudio: boolean;
  engineIntensity: number;
} {
  // Base parked Palma GT at Avenida Central west curb (driver door faces East toward +X)
  const carBase = { x: -3.8, y: 0, z: 23.0 };
  const sportsCar: VehicleSample = {
    visible: true,
    x: carBase.x,
    y: 0,
    z: carBase.z,
    heading: Math.PI, // Facing South; driver door (-X local) faces East (+X world)
    driverDoor: 0,
    passengerDoor: 0,
    wheelSpeed: 0,
    steer: 0,
    headlights: false,
    roll: 0,
    pitch: 0,
  };

  // Patrol cruiser arrives from North along Avenida Central
  const patrolCar: VehicleSample = {
    visible: time >= 18.3,
    x: 1.4,
    y: 0,
    z: 19.6,
    heading: Math.PI - 0.38,
    driverDoor: 0,
    passengerDoor: 0,
    wheelSpeed: 0,
    steer: 0,
    headlights: true,
    sirens: time >= 18.6,
    roll: 0,
    pitch: 0,
  };

  if (time >= 18.3 && time < 22.0) {
    const p = easeOutCubic(seg(time, 18.3, 21.3));
    patrolCar.x = lerp(2.6, 1.4, p);
    patrolCar.z = lerp(4.0, 19.6, p);
    patrolCar.heading = lerp(Math.PI, Math.PI - 0.38, smoothstep(seg(time, 19.6, 21.3)));
    patrolCar.wheelSpeed = (1 - p) * 20;
    patrolCar.steer = p < 0.92 ? 0.28 : 0;
    patrolCar.pitch = p > 0.72 && p < 0.98 ? -0.055 * Math.sin(((p - 0.72) / 0.26) * Math.PI) : 0;
  } else if (time >= 22.8 && time < 25.2) {
    const openT = smoothstep(seg(time, 22.85, 23.5));
    const closeT = smoothstep(seg(time, 24.4, 25.0));
    patrolCar.driverDoor = (openT - closeT) * 1.05;
  }

  // Getaway acceleration from 48.0s to 50.8s
  let engineIntensity = 0;
  if (time >= 46.8 && time < 48.15) {
    const openD = smoothstep(seg(time, 46.8, 47.35));
    const closeD = smoothstep(seg(time, 47.65, 48.1));
    sportsCar.driverDoor = (openD - closeD) * 1.08;
    sportsCar.passengerDoor = (openD - closeD) * 1.08;
    sportsCar.headlights = time >= 47.8;
    engineIntensity = 0.5;
  } else if (time >= 48.15) {
    const g = seg(time, 48.15, 50.8);
    const accel = g * g;
    sportsCar.x = lerp(-3.8, -1.8, smoothstep(seg(time, 48.15, 49.4)));
    sportsCar.z = lerp(23.0, 56.0, accel);
    sportsCar.heading = lerp(Math.PI, Math.PI - 0.14, Math.sin(g * Math.PI));
    sportsCar.wheelSpeed = 30 * (0.4 + g);
    sportsCar.headlights = true;
    sportsCar.pitch = 0.055 * (1 - g * 0.4);
    engineIntensity = 1.0;
  }

  // Default actor positions on the boulevard
  const leoPos: Vec3Tuple = { x: -2.42, y: 0, z: 23.0 };
  const valeriaPos: Vec3Tuple = { x: -1.25, y: 0, z: 24.1 };
  const officerPos: Vec3Tuple = { x: 0.75, y: 0, z: 22.7 };

  const leo: ActorSample = {
    visible: true,
    x: leoPos.x,
    y: 0,
    z: leoPos.z,
    heading: -Math.PI / 2,
    pose: 'sneak_lockpick',
    prop: 'lockpick',
    talking: speaker === 'LEO' ? 0.9 : 0,
  };

  const valeria: ActorSample = {
    visible: time >= 8.0,
    x: valeriaPos.x,
    y: 0,
    z: valeriaPos.z,
    heading: headingToward(valeriaPos, leoPos),
    pose: 'idle',
    prop: 'none',
    talking: speaker === 'VALERIA' ? 0.95 : 0,
  };

  const officer: ActorSample = {
    visible: time >= 23.1,
    x: officerPos.x,
    y: 0,
    z: officerPos.z,
    heading: headingToward(officerPos, leoPos),
    pose: 'inspect',
    prop: 'flashlight',
    talking: speaker === 'AGENTE MORALES' ? 0.85 : 0,
  };

  // --- ACT 1: Lockpicking (0.0 – 8.2s) ---
  if (time < 8.2) {
    leo.pose = 'sneak_lockpick';
    leo.prop = 'lockpick';
    leo.heading = -Math.PI / 2;
    if (time > 6.8) {
      // Slight door tug
      sportsCar.driverDoor = Math.sin(seg(time, 6.8, 7.8) * Math.PI) * 0.14;
    }
  }
  // --- ACT 2: Valeria confronts Leo & heated argument (8.2 – 18.6s) ---
  else if (time < 18.6) {
    const marchT = easeOutCubic(seg(time, 8.2, 10.2));
    valeria.x = lerp(0.5, -1.22, marchT);
    valeria.z = lerp(28.6, 24.05, marchT);
    valeria.heading = headingToward(valeria, leo);
    valeria.pose = marchT < 0.96 ? 'walk' : (speaker === 'VALERIA' ? 'argue_point' : 'arms_crossed');
    valeria.lookAt = { x: leo.x, y: 1.55, z: leo.z };

    const standT = smoothstep(seg(time, 8.6, 9.4));
    leo.x = lerp(-2.42, -2.15, standT);
    leo.z = lerp(23.0, 22.75, standT);
    leo.heading = lerpAngle(-Math.PI / 2, headingToward(leo, valeria), standT);
    leo.prop = standT < 0.4 ? 'lockpick' : 'none';
    leo.pose = standT < 0.5 ? 'sneak_lockpick' : (speaker === 'LEO' ? 'argue_hands' : 'idle');
    leo.lookAt = { x: valeria.x, y: 1.55, z: valeria.z };
  }
  // --- ACT 3: Police arrive & interrogation (18.6 – 30.2s) ---
  else if (time < 30.2) {
    leo.x = -2.15;
    leo.z = 22.75;
    valeria.x = -1.22;
    valeria.z = 24.05;
    leo.prop = 'none';

    const lookAtPatrol = smoothstep(seg(time, 18.8, 19.6));
    const patrolLookPoint = { x: patrolCar.x, y: 1.35, z: patrolCar.z };

    if (time < 23.1) {
      leo.heading = lerpAngle(headingToward(leo, valeria), headingToward(leo, patrolLookPoint), lookAtPatrol);
      valeria.heading = lerpAngle(headingToward(valeria, leo), headingToward(valeria, patrolLookPoint), lookAtPatrol);
      leo.pose = 'idle';
      valeria.pose = 'idle';
      leo.lookAt = patrolLookPoint;
      valeria.lookAt = patrolLookPoint;
    } else {
      const walkOff = easeOutCubic(seg(time, 23.1, 25.4));
      officer.x = lerp(2.4, 0.72, walkOff);
      officer.z = lerp(20.1, 22.65, walkOff);
      officer.heading = headingToward(officer, { x: -1.7, y: 0, z: 23.4 });
      officer.pose = walkOff < 0.96 ? 'cautious_step' : 'inspect';
      officer.prop = walkOff < 0.96 ? 'flashlight' : 'badge';
      officer.lookAt = { x: -1.7, y: 1.55, z: 23.4 };

      leo.heading = headingToward(leo, officer);
      valeria.heading = headingToward(valeria, officer);
      leo.pose = 'idle';
      valeria.pose = 'arms_crossed';

      if (time >= 27.6) {
        // Nervous side-glance between Leo & Valeria
        leo.lookAt = { x: valeria.x, y: 1.55, z: valeria.z };
        valeria.lookAt = { x: leo.x, y: 1.55, z: leo.z };
      } else {
        leo.lookAt = { x: officer.x, y: 1.55, z: officer.z };
        valeria.lookAt = { x: officer.x, y: 1.55, z: officer.z };
      }
    }
  }
  // --- ACT 4: Fake boyfriend/girlfriend fight farce (30.2 – 42.6s) ---
  else if (time < 42.6) {
    leo.x = lerp(-2.15, -1.95, smoothstep(seg(time, 30.2, 31.2)));
    leo.z = lerp(22.75, 23.05, smoothstep(seg(time, 30.2, 31.2)));
    valeria.x = -1.22;
    valeria.z = 24.05;
    leo.prop = 'none';

    if (time < 34.4) {
      // Leo dramatically pleads to both officer and Valeria
      leo.heading = lerpAngle(headingToward(leo, officer), headingToward(leo, valeria), smoothstep(seg(time, 31.8, 33.2)));
      leo.pose = 'plead';
      leo.lookAt = time < 32.0 ? { x: officer.x, y: 1.55, z: officer.z } : { x: valeria.x, y: 1.55, z: valeria.z };
      valeria.heading = headingToward(valeria, leo);
      valeria.pose = 'arms_crossed';
      valeria.lookAt = { x: leo.x, y: 1.55, z: leo.z };
      officer.x = 0.72;
      officer.z = 22.65;
      officer.heading = headingToward(officer, leo);
      officer.pose = 'inspect';
      officer.prop = 'flashlight';
      officer.lookAt = { x: leo.x, y: 1.55, z: leo.z };
    } else if (time < 38.6) {
      // Valeria goes full furious ex-girlfriend
      valeria.heading = headingToward(valeria, leo);
      valeria.pose = 'argue_point';
      valeria.lookAt = { x: leo.x, y: 1.55, z: leo.z };
      leo.heading = headingToward(leo, valeria);
      leo.pose = 'plead';
      leo.lookAt = { x: valeria.x, y: 1.55, z: valeria.z };
      officer.x = 0.72;
      officer.z = 22.65;
      officer.heading = headingToward(officer, valeria);
      officer.pose = 'inspect';
      officer.prop = 'flashlight';
      officer.lookAt = { x: valeria.x, y: 1.55, z: valeria.z };
    } else {
      // Officer suspects the scratched lock and approaches Valeria cautiously!
      const creep = smoothstep(seg(time, 39.2, 42.5));
      officer.x = lerp(0.72, -0.42, creep);
      officer.z = lerp(22.65, 23.62, creep);
      officer.heading = headingToward(officer, valeria);
      officer.pose = creep < 0.96 ? 'cautious_step' : 'inspect';
      officer.prop = 'flashlight';
      officer.lookAt = { x: valeria.x, y: 1.55, z: valeria.z };

      valeria.heading = lerpAngle(headingToward(valeria, leo), headingToward(valeria, officer), smoothstep(seg(time, 39.6, 41.2)));
      valeria.pose = 'idle';
      valeria.lookAt = { x: officer.x, y: 1.55, z: officer.z };

      leo.heading = headingToward(leo, officer);
      leo.pose = 'idle';
      leo.lookAt = { x: officer.x, y: 1.55, z: officer.z };
    }
  }
  // --- ACT 5: Valeria knocks out the officer & both flee (42.6 – 50.8s) ---
  else {
    if (time < 46.0) {
      leo.x = -1.95;
      leo.z = 23.05;
      leo.heading = headingToward(leo, officer);
      leo.pose = time > 43.9 ? 'argue_hands' : 'idle';
      leo.lookAt = { x: officer.x, y: 1.2, z: officer.z };
      leo.prop = 'none';

      valeria.x = -1.22;
      valeria.z = 24.05;
      valeria.heading = headingToward(valeria, { x: -0.42, y: 0, z: 23.62 });
      valeria.lookAt = { x: officer.x, y: 1.5, z: officer.z };

      if (time < 43.3) {
        // Morales steps right up to Valeria
        const finalStep = seg(time, 42.6, 43.3);
        officer.x = lerp(-0.42, -0.56, finalStep);
        officer.z = lerp(23.62, 23.74, finalStep);
        officer.heading = headingToward(officer, valeria);
        officer.pose = 'cautious_step';
        officer.prop = 'flashlight';
        valeria.pose = 'idle';
      } else if (time < 43.75) {
        // Valeria coils up her right cross
        officer.x = -0.56;
        officer.z = 23.74;
        officer.heading = headingToward(officer, valeria);
        officer.pose = 'inspect';
        officer.prop = 'flashlight';
        valeria.pose = 'punch_windup';
        valeria.actionT = seg(time, 43.3, 43.75);
      } else if (time < 44.65) {
        // EXPLOSIVE KNOCKOUT PUNCH + Officer flying back
        const hitT = seg(time, 43.75, 44.65);
        valeria.pose = 'punch_strike';
        valeria.actionT = clamp01(hitT * 1.4);
        officer.x = lerp(-0.56, 1.12, easeOutCubic(hitT));
        officer.z = lerp(23.74, 23.15, easeOutCubic(hitT));
        officer.heading = headingToward({ x: -0.56, y: 0, z: 23.74 }, valeria);
        officer.pose = 'knockback_fall';
        officer.actionT = hitT;
        officer.prop = 'none';
      } else {
        // Officer sprawled out, Valeria yells at Leo to get in!
        officer.x = 1.12;
        officer.z = 23.15;
        officer.heading = headingToward({ x: -0.56, y: 0, z: 23.74 }, valeria);
        officer.pose = 'knocked_out';
        officer.prop = 'none';
        valeria.heading = headingToward(valeria, leo);
        valeria.pose = 'argue_point';
        valeria.lookAt = { x: leo.x, y: 1.55, z: leo.z };
      }
    } else {
      // Sprint to car doors (46.0 – 47.8s) and drive away!
      officer.x = 1.12;
      officer.z = 23.15;
      officer.heading = -2.2;
      officer.pose = 'knocked_out';
      officer.prop = 'none';

      const boardT = seg(time, 46.0, 47.65);
      if (boardT < 1) {
        // Valeria takes driver seat (-X local = East side, x = -2.75), Leo runs around front to passenger side or hops in right behind her
        valeria.x = lerp(-1.22, -2.75, easeInOutCubic(boardT));
        valeria.z = lerp(24.05, 23.15, easeInOutCubic(boardT));
        valeria.heading = headingToward({ x: -1.22, y: 0, z: 24.05 }, { x: -2.75, y: 0, z: 23.15 });
        valeria.pose = 'run';

        // Leo sprints to the passenger door (around rear/front into car)
        const leoRun = easeInOutCubic(boardT);
        leo.x = lerp(-1.95, -4.85, leoRun);
        leo.z = lerp(23.05, 25.4, Math.sin(leoRun * Math.PI)) * 0.15 + lerp(22.7, 23.1, leoRun) * 0.85;
        leo.heading = headingToward({ x: -1.95, y: 0, z: 23.05 }, { x: -4.85, y: 0, z: 23.1 });
        leo.pose = 'run';
      } else {
        // Seated inside the speeding sports car!
        valeria.visible = true;
        valeria.x = sportsCar.x + 0.42;
        valeria.y = 0.28;
        valeria.z = sportsCar.z - 0.1;
        valeria.heading = sportsCar.heading;
        valeria.pose = 'drive_seated';

        leo.visible = true;
        leo.x = sportsCar.x - 0.42;
        leo.y = 0.28;
        leo.z = sportsCar.z - 0.1;
        leo.heading = sportsCar.heading;
        leo.pose = 'passenger_seated';
      }
    }
  }

  // --- CAMERA CHOREOGRAPHY FOR ACTS 1–5 (13 distinct dynamic film shots) ---
  let camera: CameraSample;
  let focus: Vec3Tuple = { x: -2.2, y: 1.2, z: 23.2 };

  if (time < 3.5) {
    // Shot 1: Sweeping establishing boulevard crane shot descending onto Leo & coral sports car
    const p = easeInOutCubic(seg(time, 0, 3.5));
    camera = {
      pos: lerpVec({ x: 4.8, y: 6.2, z: 33.5 }, { x: 1.8, y: 2.35, z: 26.8 }, p),
      lookAt: lerpVec({ x: -3.2, y: 1.4, z: 22.8 }, { x: -2.8, y: 1.05, z: 23.0 }, p),
      fov: lerp(54, 48, p),
    };
    focus = { x: -3.0, y: 1.0, z: 23.0 };
  } else if (time < 8.2) {
    // Shot 2: Intimate low-angle close-up on Leo lockpicking the door
    const p = smoothstep(seg(time, 3.5, 8.2));
    camera = {
      pos: lerpVec({ x: -0.65, y: 1.28, z: 24.9 }, { x: -0.95, y: 1.15, z: 21.4 }, p),
      lookAt: { x: -2.75, y: 0.98, z: 23.0 },
      fov: 42,
    };
    focus = { x: -2.6, y: 1.0, z: 23.0 };
  } else if (time < 11.8) {
    // Shot 3: Dramatic hero low-angle shot of Valeria marching in!
    const p = easeOutCubic(seg(time, 8.2, 11.8));
    camera = {
      pos: lerpVec({ x: -2.9, y: 1.25, z: 22.1 }, { x: -3.1, y: 1.48, z: 22.4 }, p),
      lookAt: { x: valeria.x, y: 1.42, z: valeria.z },
      fov: 44,
    };
    focus = { x: valeria.x, y: 1.4, z: valeria.z };
  } else if (time < 15.2) {
    // Shot 4: Over-the-shoulder reverse shot on Leo defending himself
    const p = smoothstep(seg(time, 11.8, 15.2));
    camera = {
      pos: lerpVec({ x: -0.1, y: 1.62, z: 24.85 }, { x: -0.35, y: 1.56, z: 24.55 }, p),
      lookAt: { x: leo.x, y: 1.42, z: leo.z },
      fov: 43,
    };
    focus = { x: leo.x, y: 1.4, z: leo.z };
  } else if (time < 18.6) {
    // Shot 5: Over-the-shoulder shot on Valeria firing back
    const p = smoothstep(seg(time, 15.2, 18.6));
    camera = {
      pos: lerpVec({ x: -2.95, y: 1.58, z: 22.05 }, { x: -2.75, y: 1.52, z: 22.3 }, p),
      lookAt: { x: valeria.x, y: 1.44, z: valeria.z },
      fov: 42,
    };
    focus = { x: valeria.x, y: 1.45, z: valeria.z };
  } else if (time < 22.8) {
    // Shot 6: Low wide dramatic shot of police cruiser rushing down Avenida Central with flashing strobes
    const p = easeOutCubic(seg(time, 18.6, 22.8));
    camera = {
      pos: lerpVec({ x: -0.9, y: 1.05, z: 25.8 }, { x: -2.4, y: 1.65, z: 26.4 }, p),
      lookAt: lerpVec({ x: patrolCar.x, y: 1.0, z: patrolCar.z }, { x: 0.6, y: 1.15, z: 20.6 }, p),
      fov: 50,
      shake: time > 20.4 && time < 21.4 ? 0.04 : 0,
    };
    focus = { x: patrolCar.x, y: 1.2, z: patrolCar.z };
  } else if (time < 27.6) {
    // Shot 7: Tracking shot following Officer Morales stepping out & interrogating
    const p = smoothstep(seg(time, 22.8, 27.6));
    camera = {
      pos: lerpVec({ x: -1.8, y: 1.55, z: 25.2 }, { x: -1.6, y: 1.58, z: 25.6 }, p),
      lookAt: { x: officer.x, y: 1.42, z: officer.z },
      fov: 45,
    };
    focus = { x: officer.x, y: 1.4, z: officer.z };
  } else if (time < 30.2) {
    // Shot 8: Tight tense two-shot of Leo & Valeria exchanging glances
    const p = smoothstep(seg(time, 27.6, 30.2));
    camera = {
      pos: lerpVec({ x: 0.85, y: 1.54, z: 23.1 }, { x: 0.55, y: 1.52, z: 23.25 }, p),
      lookAt: { x: -1.7, y: 1.46, z: 23.38 },
      fov: 40,
    };
    focus = { x: -1.7, y: 1.45, z: 23.4 };
  } else if (time < 34.4) {
    // Shot 9: Dynamic arc around Leo putting on the desperate boyfriend act
    const p = smoothstep(seg(time, 30.2, 34.4));
    camera = {
      pos: lerpVec({ x: 0.65, y: 1.56, z: 24.9 }, { x: 0.25, y: 1.62, z: 21.6 }, p),
      lookAt: { x: leo.x + 0.15, y: 1.45, z: leo.z + 0.2 },
      fov: 44,
    };
    focus = { x: leo.x, y: 1.45, z: leo.z };
  } else if (time < 38.6) {
    // Shot 10: Punchy medium close-up on Valeria playing the furious ex
    const p = smoothstep(seg(time, 34.4, 38.6));
    camera = {
      pos: lerpVec({ x: -2.4, y: 1.52, z: 21.7 }, { x: -2.1, y: 1.55, z: 21.95 }, p),
      lookAt: { x: valeria.x, y: 1.46, z: valeria.z },
      fov: 42,
    };
    focus = { x: valeria.x, y: 1.46, z: valeria.z };
  } else if (time < 42.6) {
    // Shot 11: Tense dolly-in as Officer Morales approaches Valeria cautiously
    const p = smoothstep(seg(time, 38.6, 42.6));
    camera = {
      pos: lerpVec({ x: -2.8, y: 1.68, z: 25.9 }, { x: -1.9, y: 1.42, z: 25.45 }, p),
      lookAt: { x: lerp(0.1, -0.75, p), y: 1.42, z: lerp(23.1, 23.8, p) },
      fov: lerp(46, 40, p),
      roll: lerp(0, 0.045, p), // subtle Dutch angle tension!
    };
    focus = { x: officer.x, y: 1.42, z: officer.z };
  } else if (time < 46.0) {
    // Shot 12: LOW-ANGLE ACTION SHOT OF VALERIA'S KNOCKOUT PUNCH + SHAKE!
    const impactShake = time >= 43.78 && time <= 44.55 ? (1 - seg(time, 43.78, 44.55)) * 0.22 : 0;
    const p = easeOutCubic(seg(time, 42.6, 46.0));
    camera = {
      pos: lerpVec({ x: -0.35, y: 1.05, z: 26.2 }, { x: 0.45, y: 1.25, z: 26.6 }, p),
      lookAt: lerpVec({ x: -0.82, y: 1.42, z: 23.85 }, { x: 0.35, y: 0.85, z: 23.4 }, smoothstep(seg(time, 43.8, 45.2))),
      fov: lerp(40, 48, p),
      shake: impactShake,
      roll: time >= 43.75 && time <= 44.8 ? -0.07 : 0,
    };
    focus = { x: -0.6, y: 1.35, z: 23.7 };
  } else {
    // Shot 13: Getaway wide action shot — doors slam, tires smoke, Palma GT blasts past camera!
    const p = smoothstep(seg(time, 46.0, 50.8));
    camera = {
      pos: lerpVec({ x: 1.9, y: 1.85, z: 26.5 }, { x: 2.8, y: 1.35, z: 29.8 }, p),
      lookAt: { x: sportsCar.x, y: 0.95, z: sportsCar.z },
      fov: lerp(50, 58, p),
      shake: time >= 48.1 ? 0.06 : 0,
    };
    focus = { x: sportsCar.x, y: 1.0, z: sportsCar.z };
  }

  return {
    actors: { leo, valeria, officer },
    vehicles: { sportsCar, patrolCar },
    camera,
    focus,
    sirenAudio: time >= 18.6,
    engineIntensity,
  };
}

function evaluateMontageChase(time: number, speaker: DialogueCue['speaker'] | null) {
  const p = seg(time, 50.8, 56.8);
  const carZ = lerp(52, -14, p);
  const carX = 47.0 + Math.sin(p * Math.PI * 2.5) * 0.85;
  const patrolZ = carZ + 12.5 + Math.sin(p * 6) * 0.8;

  const sportsCar: VehicleSample = {
    visible: true,
    x: carX,
    y: 0,
    z: carZ,
    heading: Math.cos(p * Math.PI * 2.5) * 0.08,
    wheelSpeed: 32,
    headlights: true,
    roll: -Math.cos(p * Math.PI * 2.5) * 0.045,
    pitch: 0.03,
  };
  const patrolCar: VehicleSample = {
    visible: true,
    x: 47.0 - Math.sin(p * Math.PI * 2) * 0.5,
    y: 0,
    z: patrolZ,
    heading: 0,
    wheelSpeed: 30,
    headlights: true,
    sirens: true,
    roll: 0.02,
  };

  const leo: ActorSample = {
    visible: true,
    x: carX + 0.42,
    y: 0.28,
    z: carZ + 0.1,
    heading: sportsCar.heading,
    pose: 'passenger_seated',
    talking: speaker === 'LEO' ? 0.9 : 0,
  };
  const valeria: ActorSample = {
    visible: true,
    x: carX - 0.42,
    y: 0.28,
    z: carZ + 0.1,
    heading: sportsCar.heading,
    pose: 'drive_seated',
    talking: speaker === 'VALERIA' ? 0.9 : 0,
  };
  const officer: ActorSample = {
    visible: false,
    x: patrolCar.x,
    y: 0,
    z: patrolCar.z,
    heading: 0,
    pose: 'drive_seated',
  };

  // Dramatic oceanfront tracking camera flying alongside Paseo del Mar!
  const camSide = lerp(52.4, 53.8, smoothstep(p));
  const camY = lerp(1.35, 3.4, smoothstep(seg(time, 53.6, 56.8)));
  const camera: CameraSample = {
    pos: { x: camSide, y: camY, z: carZ - lerp(5.2, -3.5, smoothstep(p)) },
    lookAt: { x: carX, y: 0.95, z: carZ + 1.2 },
    fov: lerp(54, 60, p),
    shake: 0.045,
    roll: -0.035,
  };

  return {
    actors: { leo, valeria, officer },
    vehicles: { sportsCar, patrolCar },
    camera,
    focus: { x: carX, y: 1.0, z: carZ },
    sirenAudio: true,
    engineIntensity: 1.0,
  };
}

function evaluateMontageNeon(time: number, speaker: DialogueCue['speaker'] | null) {
  const p = seg(time, 56.8, 62.8);
  const sportsCar: VehicleSample = {
    visible: true,
    x: 2.2,
    y: 0,
    z: 21.8,
    heading: -0.45,
    wheelSpeed: 0,
    headlights: true,
  };
  const patrolCar: VehicleSample = {
    visible: false,
    x: 0,
    y: -10,
    z: 0,
    heading: 0,
  };

  const leoPos = { x: 4.55, y: 0, z: 20.6 };
  const valPos = { x: 4.9, y: 0, z: 22.15 };

  const leo: ActorSample = {
    visible: true,
    x: leoPos.x,
    y: 0,
    z: leoPos.z,
    heading: headingToward(leoPos, valPos),
    pose: time > 58.6 && time < 60.4 ? 'celebrate' : 'lean_cool',
    prop: 'coffee',
    lookAt: { x: valPos.x, y: 1.55, z: valPos.z },
    talking: speaker === 'LEO' ? 0.9 : 0,
  };
  const valeria: ActorSample = {
    visible: true,
    x: valPos.x,
    y: 0,
    z: valPos.z,
    heading: headingToward(valPos, leoPos),
    pose: time > 58.6 && time < 60.4 ? 'celebrate' : 'idle',
    prop: 'bag',
    lookAt: { x: leoPos.x, y: 1.55, z: leoPos.z },
    talking: speaker === 'VALERIA' ? 0.9 : 0,
  };
  const officer: ActorSample = {
    visible: false,
    x: 0,
    y: -10,
    z: 0,
    heading: 0,
    pose: 'idle',
  };

  // Smooth orbital hero camera sweeping in front of Club Neón at night!
  const angle = lerp(-0.85, 0.55, smoothstep(p));
  const center = { x: 4.4, y: 1.35, z: 21.4 };
  const radius = 4.6;
  const camera: CameraSample = {
    pos: {
      x: center.x - Math.cos(angle) * radius,
      y: lerp(1.55, 2.25, smoothstep(p)),
      z: center.z + Math.sin(angle) * radius,
    },
    lookAt: center,
    fov: 46,
  };

  return {
    actors: { leo, valeria, officer },
    vehicles: { sportsCar, patrolCar },
    camera,
    focus: center,
    sirenAudio: false,
    engineIntensity: 0.15,
  };
}

function evaluateMontagePalmaAndHandoff(time: number, speaker: DialogueCue['speaker'] | null) {
  // Exact gameplay spawn & camera from district.ts & follow-camera.ts:
  // spawn = { x: 15, y: 0, z: 41.5 }, follow camera = (15.42, 2.343, 46.547) -> (15.29, 1.19, 41.3), fov = 58
  const arriveT = easeOutCubic(seg(time, 62.8, 65.0));
  const carX = lerp(2.5, 14.4, arriveT);
  const sportsCar: VehicleSample = {
    visible: true,
    x: carX,
    y: 0,
    z: 46.3,
    heading: Math.PI / 2, // Facing East along cross-street z = 45
    wheelSpeed: (1 - arriveT) * 18,
    headlights: false,
    driverDoor: smoothstep(seg(time, 65.0, 65.5)) * (1 - smoothstep(seg(time, 66.2, 66.8))) * 1.0,
    passengerDoor: smoothstep(seg(time, 65.0, 65.5)) * (1 - smoothstep(seg(time, 66.2, 66.8))) * 1.0,
  };
  const patrolCar: VehicleSample = {
    visible: false,
    x: 0,
    y: -10,
    z: 0,
    heading: 0,
  };

  const leoSpawn = { x: 15.0, y: 0, z: 41.5 };
  const valStop = { x: 13.15, y: 0, z: 42.35 };

  let leo: ActorSample;
  let valeria: ActorSample;

  if (time < 65.1) {
    leo = {
      visible: true,
      x: carX,
      y: 0.28,
      z: 46.7,
      heading: Math.PI / 2,
      pose: 'passenger_seated',
    };
    valeria = {
      visible: true,
      x: carX,
      y: 0.28,
      z: 45.9,
      heading: Math.PI / 2,
      pose: 'drive_seated',
    };
  } else {
    const stepOutT = easeOutCubic(seg(time, 65.1, 66.4));
    const walkAwayT = smoothstep(seg(time, 67.6, 70.6));
    const leoTurnNorth = smoothstep(seg(time, 68.3, 69.6));

    const lx = lerp(14.9, leoSpawn.x, stepOutT);
    const lz = lerp(44.4, leoSpawn.z, stepOutT);
    const leoToVal = headingToward({ x: lx, y: 0, z: lz }, valStop);

    const vx = walkAwayT > 0 ? lerp(valStop.x, 7.2, walkAwayT) : lerp(13.6, valStop.x, stepOutT);
    const vz = walkAwayT > 0 ? lerp(valStop.z, 42.2, walkAwayT) : lerp(44.5, valStop.z, stepOutT);

    leo = {
      visible: true,
      x: lx,
      y: 0,
      z: lz,
      heading: lerpAngle(leoToVal, 0, leoTurnNorth),
      pose: stepOutT < 0.95 ? 'walk' : (time > 67.5 && time < 68.4 ? 'wave_bye' : 'idle'),
      prop: 'none',
      lookAt: leoTurnNorth < 0.5 ? { x: vx, y: 1.55, z: vz } : { x: 15.0, y: 1.6, z: 30.0 },
      talking: speaker === 'LEO' ? 0.85 : 0,
    };

    valeria = {
      visible: true,
      x: vx,
      y: 0,
      z: vz,
      heading: walkAwayT > 0.05 ? -Math.PI / 2 : headingToward({ x: vx, y: 0, z: vz }, leoSpawn),
      pose: stepOutT < 0.95 || walkAwayT > 0.05 ? 'walk' : (time > 66.8 ? 'wave_bye' : 'idle'),
      prop: walkAwayT > 0.05 ? 'bag' : 'keys',
      lookAt: walkAwayT > 0.2 ? undefined : { x: leoSpawn.x, y: 1.55, z: leoSpawn.z },
      talking: speaker === 'VALERIA' ? 0.9 : 0,
    };
  }

  const officer: ActorSample = {
    visible: false,
    x: 0,
    y: -10,
    z: 0,
    heading: 0,
    pose: 'idle',
  };

  // Shot 16 (62.8 – 68.5s): Car arrives & Valeria briefs Leo outside Mercado Palma
  // Shot 17 (68.5 – 71.0s): Smooth seamless glide straight into the player's follow-camera!
  let camera: CameraSample;
  if (time < 68.5) {
    const p = smoothstep(seg(time, 62.8, 68.5));
    camera = {
      pos: lerpVec({ x: 18.2, y: 2.35, z: 43.2 }, { x: 16.4, y: 1.78, z: 44.3 }, p),
      lookAt: lerpVec({ x: carX, y: 1.1, z: 45.2 }, { x: 14.4, y: 1.38, z: 41.9 }, smoothstep(seg(time, 64.5, 67.2))),
      fov: lerp(50, 48, p),
    };
  } else {
    const g = easeInOutCubic(seg(time, 68.5, 71.0));
    // Exact third-person followCamera pose for spawn (15, 0, 41.5)
    camera = {
      pos: lerpVec({ x: 16.4, y: 1.78, z: 44.3 }, { x: 15.42, y: 2.343, z: 46.547 }, g),
      lookAt: lerpVec({ x: 14.4, y: 1.38, z: 41.9 }, { x: 15.29, y: 1.19, z: 41.3 }, g),
      fov: lerp(48, 58, g),
    };
  }

  return {
    actors: { leo, valeria, officer },
    vehicles: { sportsCar, patrolCar },
    camera,
    focus: { x: 14.8, y: 1.2, z: 42.5 },
    sirenAudio: false,
    engineIntensity: arriveT < 0.95 ? 0.45 : 0,
  };
}

export const OPENING_SEQUENCE: CinematicSequence = {
  id: 'prologue_stolen_car',
  title: 'Prólogo — Un Coche, Dos Ladrones',
  duration: 71.0,
  completionFlags: ['prologue_completed', 'met_valeria', 'escaped_police_boulevard', 'valeria_contact_active'],
  completionNotice: 'Valeria: Mantén perfil bajo en Mercado Palma, Leo. Te avisaré al teléfono para el próximo golpe.',
  shots: SHOTS,
  dialogues: DIALOGUES,
  titleCards: TITLE_CARDS,
  audioCues: AUDIO_CUES,
  particleCues: PARTICLE_CUES,

  evaluate(rawTime: number): CinematicFrameState {
    const time = Math.max(0, Math.min(71.0, rawTime));
    const shot = findShot(time);
    const speaker = activeSpeaker(time);

    let actState: {
      actors: Record<CinematicActorId, ActorSample>;
      vehicles: Record<CinematicVehicleId, VehicleSample>;
      camera: CameraSample;
      focus: Vec3Tuple;
      sirenAudio: boolean;
      engineIntensity: number;
    };

    if (time < 50.8) {
      actState = evaluateActBoulevard(time, speaker);
    } else if (time < 56.8) {
      actState = evaluateMontageChase(time, speaker);
    } else if (time < 62.8) {
      actState = evaluateMontageNeon(time, speaker);
    } else {
      actState = evaluateMontagePalmaAndHandoff(time, speaker);
    }

    // Fade transitions (opening fade-in + brisk montage dark wipes)
    let fadeBlack = 0;
    if (time < 0.9) fadeBlack = 1 - smoothstep(seg(time, 0, 0.9));
    else if (time >= 50.45 && time <= 51.15) fadeBlack = Math.sin(seg(time, 50.45, 51.15) * Math.PI);
    else if (time >= 56.5 && time <= 57.1) fadeBlack = Math.sin(seg(time, 56.5, 57.1) * Math.PI);
    else if (time >= 62.5 && time <= 63.1) fadeBlack = Math.sin(seg(time, 62.5, 63.1) * Math.PI);

    // Punch impact flash!
    let flashWhite = 0;
    if (time >= 43.78 && time <= 44.18) {
      flashWhite = Math.sin(seg(time, 43.78, 44.18) * Math.PI) * 0.72;
    }

    // Smooth letterbox bars (slide in immediately, retract cleanly during the final handoff glide)
    let letterbox = 1;
    if (time < 0.5) letterbox = smoothstep(seg(time, 0, 0.5));
    else if (time > 68.8) letterbox = 1 - smoothstep(seg(time, 68.8, 70.9));

    return {
      shotId: shot.id,
      hour: shot.hour,
      mood: shot.mood,
      fadeBlack,
      flashWhite,
      letterbox,
      camera: actState.camera,
      focus: actState.focus,
      actors: actState.actors,
      vehicles: actState.vehicles,
      sirenAudio: actState.sirenAudio,
      engineIntensity: actState.engineIntensity,
    };
  },
};
