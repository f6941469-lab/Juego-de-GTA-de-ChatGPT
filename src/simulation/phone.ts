import type { WorldEvent, WorldEventBus } from '../core/events';
import { makeRandom } from '../world/generation/layout';
import { products, type Inventory, type Item } from './economy';

export type PhoneCommand =
  | 'toggle'
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'select'
  | 'back'
  | 'openCamera'
  | 'openFeed'
  | 'openEmergency'
  | 'openAlerts'
  | 'openBag';

export type PhoneScreen = 'home' | 'camera' | 'feed' | 'emergency' | 'alerts' | 'bag';

export interface PhoneClip {
  id: string;
  title: string;
  district: string;
  category: string;
  views: number;
  viralScore: number;
  severity: number;
}

export interface PhoneAlert {
  id: string;
  timeText: string;
  message: string;
  severity: number;
}

export interface PhoneSnapshot {
  inventory: Readonly<Inventory>;
  open: boolean;
  screen: PhoneScreen;
  selectedIndex: number;
  recording: boolean;
  recordingSeconds: number;
  detectedSubject: string;
  canPublish: boolean;
  clips: readonly PhoneClip[];
  alerts: readonly PhoneAlert[];
  battery: number;
  district: string;
  timeText: string;
  cash: number;
  wanted: number;
  statusBanner: string;
}

export interface PhoneStepContext {
  onUseItem?: (item: Item) => void;
  hour: number;
  district: string;
  position: { x: number; y: number; z: number };
  cash: number;
  wanted: number;
  nearbyNpcs: number;
  eventBus: WorldEventBus;
  onNotice?: (text: string, duration?: number) => void;
  onAudioCue?: () => void;
  onEmergency911?: (service: 'police' | 'medical', location: { x: number; z: number }) => void;
}

const HOME_APPS: readonly { screen: Exclude<PhoneScreen, 'home'>; label: string }[] = [
  { screen: 'camera', label: 'Cámara' },
  { screen: 'feed', label: 'Social' },
  { screen: 'emergency', label: '911' },
  { screen: 'alerts', label: 'Ciudad' },
  { screen: 'bag', label: 'Mochila' },
];

function formatClock(hour: number): string {
  const norm = ((hour % 24) + 24) % 24;
  const mins = Math.floor(norm * 60) % 1440;
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;
}

function describeEvent(event: WorldEvent, district: string): { title: string; category: string; score: number } {
  switch (event.type) {
    case 'gunshot_fired':
      return { title: `Tiroteo captado en ${district}`, category: 'Seguridad', score: 42 };
    case 'robbery_started':
    case 'robbery_finished':
      return { title: `Asalto en directo (${district})`, category: 'Sucesos', score: 48 };
    case 'glass_broken':
      return { title: `Escaparate destrozado en ${district}`, category: 'Vandalismo', score: 30 };
    case 'traffic_accident':
      return { title: `Accidente grave en ${district}`, category: 'Tráfico', score: 38 };
    case 'object_destroyed':
      return { title: `Destrozos urbanos en ${district}`, category: 'Ciudad', score: 22 };
    case 'pursuit_started':
      return { title: `Persecución policial en ${district}`, category: 'Tráfico', score: 44 };
    case 'npc_injured':
      return { title: `Altercado en ${district}`, category: 'Sucesos', score: 34 };
    case 'vehicle_hijacked':
      return { title: `Robo de vehículo en ${district}`, category: 'Sucesos', score: 36 };
    default:
      return { title: `Directo desde ${district}`, category: 'Urbano', score: 14 };
  }
}

export function createPhoneSystem(seed = 240817) {
  const random = makeRandom(seed ^ 0x5c21f);
  let open = false;
  let screen: PhoneScreen = 'home';
  let selectedIndex = 0;
  let recording = false;
  let recordingSeconds = 0;
  let recordingHeartbeat = 0;
  let capturedSubject = 'Vista urbana';
  let capturedCategory = 'Urbano';
  let capturedSeverity = 1;
  let capturedScore = 12;
  let battery = 94;
  let clipSerial = 0;
  let seenEventWatermark = 0;
  let viewAccumulator = 0;
  let emergencyCooldown = 0;
  let statusBanner = 'En línea · Red 5G';
  const nearbyScratch: WorldEvent[] = [];

  const clips: PhoneClip[] = [];
  const alerts: PhoneAlert[] = [];

  function seedInitialContent(): void {
    clips.length = 0;
    alerts.length = 0;
    clips.push({
      id: 'clip-seed-1',
      title: 'Atardecer tranquilo en Costa Palmera',
      district: 'Costa Palmera',
      category: 'Urbano',
      views: 184,
      viralScore: 8,
      severity: 0,
    });
    alerts.push({
      id: 'alert-seed-1',
      timeText: '17:15',
      message: 'Tráfico fluido entre Costa Palmera e Isla Estrella.',
      severity: 0,
    });
  }

  seedInitialContent();

  function evaluateSubject(ctx: PhoneStepContext): { title: string; category: string; score: number; severity: number } {
    ctx.eventBus.queryNear(ctx.position.x, ctx.position.z, 36, ctx.eventBus.time - 12, nearbyScratch);
    let best: WorldEvent | undefined;
    for (const ev of nearbyScratch) {
      if (ev.type === 'recording_started' || ev.type === 'video_published') continue;
      if (!best || ev.severity > best.severity || (ev.severity === best.severity && ev.timestamp > best.timestamp)) {
        best = ev;
      }
    }
    if (best) {
      const info = describeEvent(best, ctx.district);
      return {
        title: info.title,
        category: info.category,
        score: info.score + Math.round(ctx.nearbyNpcs * 2.5),
        severity: Math.max(1, best.severity),
      };
    }
    return {
      title: ctx.nearbyNpcs > 0 ? `Ciudadanos en ${ctx.district} (${ctx.nearbyNpcs})` : `Paseo por ${ctx.district}`,
      category: 'Urbano',
      score: 12 + ctx.nearbyNpcs * 2,
      severity: 1,
    };
  }

  function startRecording(ctx: PhoneStepContext): void {
    if (recording) return;
    recording = true;
    recordingSeconds = 0;
    recordingHeartbeat = 0.9;
    const subj = evaluateSubject(ctx);
    capturedSubject = subj.title;
    capturedCategory = subj.category;
    capturedSeverity = subj.severity;
    capturedScore = subj.score;
    statusBanner = 'Grabando escena en directo…';
    ctx.eventBus.emit({
      type: 'recording_started',
      sourceId: 'player',
      position: { x: ctx.position.x, y: 1.4, z: ctx.position.z },
      intensity: 0.75,
      radius: 16,
      severity: 1,
      visual: true,
      auditory: true,
    });
    ctx.onAudioCue?.();
  }

  function stopAndPublish(ctx: PhoneStepContext): PhoneClip | null {
    if (!recording) return null;
    recording = false;
    const subj = evaluateSubject(ctx);
    if (subj.severity >= capturedSeverity) {
      capturedSubject = subj.title;
      capturedCategory = subj.category;
      capturedSeverity = subj.severity;
      capturedScore = Math.max(capturedScore, subj.score);
    }
    const views = 25 + capturedScore * (2 + Math.floor(random() * 4));
    const clip: PhoneClip = {
      id: `clip-${++clipSerial}`,
      title: capturedSubject,
      district: ctx.district,
      category: capturedCategory,
      views,
      viralScore: capturedScore,
      severity: capturedSeverity,
    };
    clips.unshift(clip);
    if (clips.length > 6) clips.pop();
    statusBanner = `Publicado: ${clip.title}`;
    alerts.unshift({
      id: `alert-pub-${clip.id}`,
      timeText: formatClock(ctx.hour),
      message: `Tu vídeo «${clip.title}» ya suma ${clip.views} vistas.`,
      severity: clip.severity,
    });
    if (alerts.length > 6) alerts.pop();

    ctx.eventBus.emit({
      type: 'video_published',
      sourceId: 'player',
      targetIds: [clip.id],
      position: { x: ctx.position.x, y: 1.4, z: ctx.position.z },
      intensity: Math.min(1, 0.55 + capturedScore / 60),
      radius: 44,
      severity: capturedSeverity,
      visual: true,
      auditory: true,
      context: { title: clip.title, category: clip.category, views: clip.views },
    });
    ctx.onAudioCue?.();
    ctx.onNotice?.(`Clip viral publicado: ${clip.title}`, 3.0);
    screen = 'feed';
    selectedIndex = 0;
    return clip;
  }

  function openScreen(next: PhoneScreen, ctx?: PhoneStepContext): void {
    open = true;
    screen = next;
    selectedIndex = 0;
    if (next === 'camera' && ctx) {
      const subj = evaluateSubject(ctx);
      capturedSubject = subj.title;
      statusBanner = recording ? 'Grabando escena en directo…' : 'Cámara lista';
    } else if (next === 'feed') {
      statusBanner = `${clips.length} clips publicados`;
    } else if (next === 'emergency') {
      statusBanner = 'Central 911 disponible';
    } else if (next === 'alerts') {
      statusBanner = `${alerts.length} avisos recientes`;
    } else {
      statusBanner = 'En línea · Red 5G';
    }
  }

  function handleCommand(cmd: PhoneCommand, ctx: PhoneStepContext): void {
    switch (cmd) {
      case 'toggle':
        open = !open;
        if (!open) {
          if (recording) stopAndPublish(ctx);
          screen = 'home';
          selectedIndex = 0;
        } else {
          openScreen(screen, ctx);
        }
        ctx.onAudioCue?.();
        return;
      case 'openCamera':
        openScreen('camera', ctx);
        ctx.onAudioCue?.();
        return;
      case 'openFeed':
        openScreen('feed', ctx);
        ctx.onAudioCue?.();
        return;
      case 'openEmergency':
        openScreen('emergency', ctx);
        ctx.onAudioCue?.();
        return;
      case 'openAlerts':
        openScreen('alerts', ctx);
        ctx.onAudioCue?.();
        return;
      case 'openBag':
        openScreen('bag', ctx);
        return;
      case 'back':
        if (!open) return;
        if (screen === 'home') {
          open = false;
          if (recording) stopAndPublish(ctx);
        } else {
          openScreen('home', ctx);
        }
        ctx.onAudioCue?.();
        return;
      case 'left':
        if (!open) return;
        if (screen === 'home') {
          selectedIndex = (selectedIndex + HOME_APPS.length - 1) % HOME_APPS.length;
          ctx.onAudioCue?.();
        }
        return;
      case 'right':
        if (!open) return;
        if (screen === 'home') {
          selectedIndex = (selectedIndex + 1) % HOME_APPS.length;
          ctx.onAudioCue?.();
        }
        return;
      case 'up':
        if (!open) return;
        if (screen === 'home') {
          selectedIndex = (selectedIndex + 2) % HOME_APPS.length;
        } else if (screen === 'emergency') {
          selectedIndex = (selectedIndex + 1) % 2;
        } else if (screen === 'feed' && clips.length > 0) {
          selectedIndex = (selectedIndex + clips.length - 1) % clips.length;
        } else if (screen === 'bag') {
          selectedIndex = (selectedIndex + products.length - 1) % products.length;
        }
        ctx.onAudioCue?.();
        return;
      case 'down':
        if (!open) return;
        if (screen === 'home') {
          selectedIndex = (selectedIndex + 2) % HOME_APPS.length;
        } else if (screen === 'emergency') {
          selectedIndex = (selectedIndex + 1) % 2;
        } else if (screen === 'feed' && clips.length > 0) {
          selectedIndex = (selectedIndex + 1) % clips.length;
        } else if (screen === 'bag') {
          selectedIndex = (selectedIndex + 1) % products.length;
        }
        ctx.onAudioCue?.();
        return;
      case 'select':
        if (!open) return;
        if (screen === 'bag') { ctx.onUseItem?.(products[selectedIndex % products.length].id); return; }
        if (screen === 'home') {
          const target = HOME_APPS[selectedIndex % HOME_APPS.length];
          openScreen(target.screen, ctx);
          return;
        }
        if (screen === 'camera') {
          if (recording) stopAndPublish(ctx);
          else startRecording(ctx);
          return;
        }
        if (screen === 'emergency') {
          if (emergencyCooldown > 0) {
            statusBanner = `Espera ${Math.ceil(emergencyCooldown)} s para otro aviso`;
            ctx.onAudioCue?.();
            return;
          }
          emergencyCooldown = 6;
          if (selectedIndex === 0) {
            statusBanner = '911 alerta enviada en tu zona';
            alerts.unshift({
              id: `alert-911-${++clipSerial}`,
              timeText: formatClock(ctx.hour),
              message: `Aviso al 911 enviado desde ${ctx.district}.`,
              severity: 2,
            });
            if (alerts.length > 6) alerts.pop();
            ctx.eventBus.emit({
              type: 'crime_reported',
              sourceId: 'player',
              position: { x: ctx.position.x, y: 1.2, z: ctx.position.z },
              intensity: 0.9,
              radius: 40,
              severity: 2,
              auditory: true,
              context: { caller: 'phone_911', district: ctx.district },
            });
            ctx.onEmergency911?.('police', ctx.position);
            ctx.onNotice?.('Aviso 911 transmitido a patrullas', 2.8);
          } else {
            statusBanner = 'Asistencia médica en ruta';
            alerts.unshift({
              id: `alert-med-${++clipSerial}`,
              timeText: formatClock(ctx.hour),
              message: `Asistencia sanitaria solicitada en ${ctx.district}.`,
              severity: 1,
            });
            if (alerts.length > 6) alerts.pop();
            ctx.onEmergency911?.('medical', ctx.position);
            ctx.onNotice?.('Asistencia solicitada (+salud)', 2.4);
          }
          ctx.onAudioCue?.();
          return;
        }
        if (screen === 'feed' || screen === 'alerts') {
          openScreen('home', ctx);
          ctx.onAudioCue?.();
          return;
        }
    }
  }

  function step(dt: number, ctx: PhoneStepContext): void {
    if (!(dt > 0)) return;
    emergencyCooldown = Math.max(0, emergencyCooldown - dt);

    // Log notable world incidents into local alerts feed
    ctx.eventBus.queryNear(ctx.position.x, ctx.position.z, 65, -Infinity, nearbyScratch);
    for (let i = nearbyScratch.length - 1; i >= 0; i--) {
      const ev = nearbyScratch[i];
      if (ev.id <= seenEventWatermark) continue;
      seenEventWatermark = Math.max(seenEventWatermark, ev.id);
      if (
        ev.type === 'traffic_accident'
        || ev.type === 'robbery_started'
        || ev.type === 'glass_broken'
        || ev.type === 'pursuit_started'
      ) {
        const info = describeEvent(ev, ctx.district);
        alerts.unshift({
          id: `alert-ev-${ev.id}`,
          timeText: formatClock(ctx.hour),
          message: info.title,
          severity: ev.severity,
        });
        if (alerts.length > 6) alerts.pop();
      }
    }

    if (recording) {
      recordingSeconds += dt;
      recordingHeartbeat -= dt;
      battery = Math.max(12, battery - dt * 0.25);
      const live = evaluateSubject(ctx);
      if (live.severity >= capturedSeverity) {
        capturedSubject = live.title;
        capturedCategory = live.category;
        capturedSeverity = live.severity;
        capturedScore = Math.max(capturedScore, live.score);
      }
      if (recordingHeartbeat <= 0) {
        recordingHeartbeat = 1.8;
        ctx.eventBus.emit({
          type: 'recording_started',
          sourceId: 'player',
          position: { x: ctx.position.x, y: 1.4, z: ctx.position.z },
          intensity: 0.72,
          radius: 18,
          severity: 1,
          visual: true,
        });
      }
    } else {
      battery = Math.min(100, battery + dt * 0.04);
    }

    viewAccumulator += dt;
    if (viewAccumulator >= 1.0) {
      viewAccumulator -= 1.0;
      for (const clip of clips) {
        if (clip.viralScore > 0) {
          clip.views += Math.max(1, Math.round(clip.viralScore * 0.35));
        }
      }
    }
  }

  function snapshot(ctx: {
    inventory?: Readonly<Inventory>;
    hour: number;
    district: string;
    cash: number;
    wanted: number;
  }): PhoneSnapshot {
    return {
      inventory: ctx.inventory ?? { water: 0, snack: 0, ammo: 0 },
      open,
      screen,
      selectedIndex,
      recording,
      recordingSeconds,
      detectedSubject: capturedSubject,
      canPublish: recording && recordingSeconds >= 0.15,
      clips: clips.map((c) => ({ ...c })),
      alerts: alerts.map((a) => ({ ...a })),
      battery: Math.round(battery),
      district: ctx.district,
      timeText: formatClock(ctx.hour),
      cash: Math.round(ctx.cash),
      wanted: ctx.wanted,
      statusBanner,
    };
  }

  function reset(): void {
    open = false;
    screen = 'home';
    selectedIndex = 0;
    recording = false;
    recordingSeconds = 0;
    recordingHeartbeat = 0;
    capturedSubject = 'Vista urbana';
    capturedCategory = 'Urbano';
    capturedSeverity = 1;
    capturedScore = 12;
    battery = 94;
    clipSerial = 0;
    seenEventWatermark = 0;
    viewAccumulator = 0;
    emergencyCooldown = 0;
    statusBanner = 'En línea · Red 5G';
    seedInitialContent();
  }

  return {
    get isOpen(): boolean { return open; },
    get screen(): PhoneScreen { return screen; },
    get recording(): boolean { return recording; },
    get clips(): readonly PhoneClip[] { return clips; },
    get alerts(): readonly PhoneAlert[] { return alerts; },
    handleCommand,
    step,
    snapshot,
    reset,
  };
}
