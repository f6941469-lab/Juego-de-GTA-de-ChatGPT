import { PerspectiveCamera, Scene, Vector3 } from 'three';
import type { GameAudio } from '../audio/audio';
import type { Command, InputContext } from '../core/input';
import type { Physics, Point3, StaticBox } from '../physics/physics';
import type { createPlayer, MovementInput } from '../player/player';
import { allShops, type ShopDefinition } from '../world/generation/shop';
import {
  districtNameAt,
  functionalVenues,
  venueById,
  type FunctionalVenue,
  type VenueId,
} from '../world/generation/expansion';
import { busStops, metroStations } from '../world/generation/transit';
import type { Actor } from './actor';
import { dialogueTopics, playerDialogueReply } from './dialogue';
import { createFeedback } from './feedback';
import { Economy, eyes, Journal, planarDistance, Weapon, type WitnessClip } from './model';
import { Navigation } from './navigation';
import { createPolice } from './police';
import { createPopulation, type Civilian } from './population';
import { createWitnessRecorder, type ReplayActorSnapshot, type ReplayVehicleSnapshot } from './recorder';
import { createTraffic, type ManagedVehicle } from './traffic';
import { WorldState } from './world-state';

type Player = ReturnType<typeof createPlayer>;
export type PhonePage = 'home' | 'feed' | 'bag' | 'help';
export interface VenueOption {
  label: string;
  detail: string;
  badge?: string;
}
export interface VenuePanelState {
  venue: FunctionalVenue;
  subtitle: string;
  intro: string;
  options: VenueOption[];
  note: string;
}
const HOUSE_PRICE = 350;
const idle = { x: 0, z: 0, run: false, jump: false, aim: false, fire: false };

export function createSession(
  scene: Scene,
  camera: PerspectiveCamera,
  physics: Physics,
  boxes: readonly StaticBox[],
  player: Player,
  audio: GameAudio,
  onContext: (context: InputContext) => void,
  onAdvanceHour?: (deltaHours: number) => void,
) {
  const journal = new Journal();
  const economy = new Economy();
  const weapon = new Weapon();
  const world = new WorldState();
  const navigation = new Navigation(boxes);
  const feedback = createFeedback(scene, physics, (glass, changed) => navigation.rebuild([...boxes, ...glass], changed));
  const population = createPopulation(scene, physics, navigation, journal, player.collider.handle);
  const traffic = createTraffic(scene, physics, journal);
  const recorder = createWitnessRecorder(scene, physics, journal);

  let now = 0;
  let overlay: InputContext = 'world';
  let phonePage: PhonePage = 'home';
  let selection = 0;
  let activeShop: ShopDefinition = allShops[0];
  let activeVenue: FunctionalVenue | undefined;
  let venueMessage = '';
  let activeTalkNpc: Civilian | undefined;
  let talkReply = '';
  let currentVehicle: ManagedVehicle | undefined;
  let notice = '';
  let noticeUntil = 0;
  let threatTime = 0;
  let threatSent = false;
  let robberyPaid = false;
  let threatenedShop: ShopDefinition | undefined;
  let aim = false;
  let health = 100;
  let hitUntil = 0;
  let footDistance = 0;
  let muted = false;
  let detention = false;
  let previousPoliceState: string = 'patrol';

  // Expanded world gameplay state (Prison, Buyable House, Casino)
  let inPrison = false;
  let prisonBail = 30;
  let prisonSentenceHours = 2;
  let houseOwned = false;
  let homeRespawnEnabled = false;
  let casinoNet = 0;
  let casinoRngState = 7731;

  // Replay viewer state (isolated from live simulation)
  let replayClips: WitnessClip[] = [];
  let replayAngle = 0;
  let replayFrame = 0;
  let replayPlaying = true;
  let replayAcc = 0;
  let replayTitle = '';
  let resetOnReplayExit = false;

  const previousFeet = player.position.clone();
  const direction = new Vector3();
  let emptyLatched = false;

  const police = createPolice(
    scene,
    physics,
    navigation,
    journal,
    player.collider.handle,
    () => { detention = true; },
    traffic.network,
    (dmg) => {
      if (economy.armor > 0) {
        const absorbed = Math.min(economy.armor, dmg);
        economy.armor -= absorbed;
        health = Math.max(0, health - (dmg - absorbed));
      } else {
        health = Math.max(0, health - dmg);
      }
      hitUntil = now + 0.25;
      audio.play('impact', player.position);
      tell('¡Disparo policial!', true);
    },
  );

  police.setOnStarsChanged((stars, label) => {
    if (stars === 0) {
      tell(
        journal.allClips.length > 0
          ? 'Has evadido a la policía · mira Palma Social (↑) para ver los ángulos grabados'
          : 'Has evadido a la policía · barrio despejado',
        true,
      );
      return;
    }
    const glyph = '★'.repeat(stars) + '☆'.repeat(5 - stars);
    if (stars >= 4) {
      tell(`${glyph} ${label} · Helicóptero y SWAT desplegados`, true);
    } else if (stars === 3) {
      tell(`${glyph} ${label} · Barricadas y refuerzos en camino`, true);
    } else if (stars === 2) {
      tell(`${glyph} ${label} · Patrullas en persecución`, true);
    } else {
      tell(`${glyph} ${label}`, true);
    }
  });

  let cachedPopVersion = -1;
  let cachedActors: Actor[] = [];
  let cachedWalkers: Array<{ owner: number; position: Point3; readonly active: boolean }> = [];
  const policeActorSet = new Set(police.units.map((u) => u.actor));
  const playerWalker = {
    owner: player.collider.handle,
    position: player.position,
    get active() { return !player.inVehicle; },
  };

  function allActors(): readonly Actor[] {
    if (cachedPopVersion !== population.version) {
      cachedPopVersion = population.version;
      cachedActors = [
        ...population.allPeople.map((person) => person.actor),
        ...police.units.map((unit) => unit.actor),
      ];
      cachedWalkers = [
        playerWalker,
        ...cachedActors.map((actor) => ({
          owner: actor.collider.handle,
          position: actor.position,
          get active() { return !actor.suspended && actor.health > 0 && actor.collider.isEnabled(); },
        })),
      ];
    }
    return cachedActors;
  }

  function walkers() {
    allActors();
    return cachedWalkers;
  }

  function registerActor(id: string, actor: Actor) {
    world.register({
      id,
      kind: 'person',
      position: actor.position,
      get heading() { return actor.heading; },
      get health() { return actor.health; },
    });
  }

  world.register({
    id: 'player',
    kind: 'person',
    position: player.position,
    get heading() { return player.heading; },
    get health() { return health; },
  });
  for (const person of population.allPeople) registerActor(person.id, person.actor);
  for (const unit of police.units) registerActor(unit.id, unit.actor);
  for (const car of traffic.cars) {
    world.register({ id: car.id, kind: 'vehicle', position: car.position, get heading() { return car.heading; } });
    world.register({ id: car.driverId!, kind: 'person', position: car.position, vehicleId: car.id });
    world.register({ id: car.seatId, kind: 'seat', position: car.position, get occupantId() { return car.driverId; }, vehicleId: car.id });
  }
  world.register({ id: traffic.bus.id, kind: 'vehicle', position: traffic.bus.position, get heading() { return traffic.bus.heading; } });
  world.register({ id: traffic.metro.id, kind: 'vehicle', position: traffic.metro.position, get heading() { return traffic.metro.heading; } });
  for (const pCar of police.patrolCars) {
    world.register({ id: pCar.id, kind: 'vehicle', position: pCar.position, get heading() { return pCar.heading; } });
  }
  for (const store of allShops) {
    world.register({ id: store.id, kind: 'shop', position: store.counter });
  }
  for (const window of feedback.windows) {
    world.register({ id: window.id, kind: 'damage', position: window.box, get health() { return window.intact ? 100 : 0; } });
  }
  for (const prop of feedback.props) {
    world.register({ id: prop.id, kind: 'damage', position: prop.box, get health() { return prop.intact ? 100 : 0; } });
  }
  world.update(0, player.position);
  physics.step(1 / 60);

  function tell(message: string, sound = false) {
    notice = message;
    noticeUntil = now + 4;
    if (sound) audio.play('notice');
  }

  function context(value: InputContext) {
    if (overlay === 'replay' && value !== 'replay') {
      recorder.hideReplay();
      if (pendingArrestStars > 0) {
        const stars = pendingArrestStars;
        pendingArrestStars = 0;
        resetOnReplayExit = false;
        transferToPrison(stars);
        return;
      }
      if (resetOnReplayExit) {
        resetOnReplayExit = false;
        doResetWithFee();
        return;
      }
    }
    overlay = value;
    selection = 0;
    aim = false;
    player.setWeapon(weapon.equipped, false);
    onContext(value);
  }

  function canTrade(): { store: ShopDefinition; merchant: Civilian } | undefined {
    if (weapon.equipped || player.inVehicle || player.position.y >= 0.7) return undefined;
    const hit = population.nearestMerchant(player.position);
    if (!hit || hit.dist >= 2.1) return undefined;
    const { store, merchant } = hit;
    if (merchant.actor.health <= 0 || !['routine', 'browsing'].includes(merchant.state)) return undefined;
    if (!physics.canSee(eyes(player.position), eyes(merchant.actor.position), [player.collider.handle, merchant.actor.collider.handle])) return undefined;
    return { store, merchant };
  }

  function buy(index: number) {
    const trade = canTrade();
    if (!trade) { tell('El mostrador no está disponible'); context('world'); return; }
    const item = trade.store.catalog[index];
    if (!item) return;
    const error = economy.buyFrom(trade.store.id, item.id);
    if (error) tell(error, true);
    else { tell(`${item.name} en tu mochila · −$${item.price}`); audio.play('purchase'); }
  }

  function use(index: number) {
    const owned = economy.ownedItems();
    const entry = owned[index];
    if (!entry) return;
    const item = entry.item;
    if (item.effect === 'ammo' && weapon.reserve > 108) { tell('Reserva de munición llena'); return; }
    if ((item.effect === 'heal' || item.effect === 'energy') && health >= 100) { tell('Tu salud ya está al máximo'); return; }
    if (item.effect === 'armor' && economy.armor >= 100) { tell('Tu protección ya está al máximo'); return; }
    if (!economy.use(item.id)) { tell('No tienes este producto'); return; }
    if (item.effect === 'ammo') weapon.reserve += item.amount;
    else if (item.effect === 'armor') economy.armor = Math.min(100, economy.armor + item.amount);
    else health = Math.min(100, health + item.amount);
    tell(`${item.name} utilizado`);
    audio.play('purchase');
  }

  let pendingArrestStars = 0;

  function nextCasinoRandom(): number {
    casinoRngState = (Math.imul(1664525, casinoRngState) + 1013904223) >>> 0;
    return casinoRngState / 4294967296;
  }

  function probeGroundPoint(x: number, z: number, hintY: number): Point3 {
    const hit = physics.raycast({ x, y: hintY + 2.2, z }, { x: 0, y: -1, z: 0 }, 5.0, [player.collider.handle]);
    const y = hit && hit.normal.y > 0.7 ? (hintY + 2.2) - hit.timeOfImpact + 0.08 : Math.max(0.08, hintY);
    return { x, y, z };
  }

  function transferToPrison(starsAtArrest: number, reduced = false) {
    if (currentVehicle) {
      if (currentVehicle.controlledByPlayer) {
        currentVehicle.controlledByPlayer = false;
        currentVehicle.driverId = undefined;
        currentVehicle.occupiedSeats = 0;
      } else {
        const idx = currentVehicle.passengerIds.indexOf('player');
        if (idx >= 0) currentVehicle.passengerIds.splice(idx, 1);
      }
      currentVehicle = undefined;
    }
    detention = false;
    pendingArrestStars = 0;
    weapon.equipped = false;
    weapon.reloadTime = 0;
    const tier = Math.max(1, starsAtArrest);
    inPrison = true;
    prisonBail = reduced ? Math.max(20, tier * 20) : Math.max(30, tier * 35);
    prisonSentenceHours = reduced ? Math.max(2, tier) : Math.max(2, tier * 2);
    police.clearWanted();
    const cell = venueById.prison.cellPoint!;
    player.teleport(cell, Math.PI);
    activeVenue = venueById.prison;
    venueMessage = reduced
      ? `Te entregaste voluntariamente. Fianza reducida: $${prisonBail} · Condena: ${prisonSentenceHours} h.`
      : `Has sido detenido e ingresado en la Cárcel de Palma. Fianza: $${prisonBail} · Condena: ${prisonSentenceHours} h.`;
    context('venue');
    tell('Ingresado en Cárcel de Palma · cumple condena, paga fianza o intenta fugarte', true);
  }

  function nearestVenue(): FunctionalVenue | undefined {
    if (player.inVehicle) return undefined;
    if (inPrison) return venueById.prison;
    for (const venue of functionalVenues) {
      const d = planarDistance(player.position, venue.interactPoint);
      const dy = Math.abs(player.position.y - venue.interactPoint.y);
      if (d <= venue.interactRadius && dy < 2.2) return venue;
    }
    return undefined;
  }

  function buildVenuePanel(venue: FunctionalVenue | undefined): VenuePanelState | undefined {
    if (!venue) return undefined;
    if (venue.id === 'prison') {
      if (inPrison) {
        return {
          venue,
          subtitle: `CELDA DE DETENCIÓN · TU SALDO $${economy.money}`,
          intro: venueMessage || 'Estás recluido en la Cárcel de Palma. Elige cómo salir de tu celda.',
          options: [
            { label: `Cumplir condena (${prisonSentenceHours} h)`, detail: 'Avanza el reloj y sal en libertad legalmente', badge: 'GRATIS' },
            { label: 'Pagar fianza inmediata', detail: 'Limpia tu historial y sal ahora por la puerta principal', badge: `$${prisonBail}` },
            { label: 'Intentar fuga de la celda', detail: 'Escapa al patio penal · dispara alerta policial inmediata', badge: '⚠ 3★' },
          ],
          note: 'Puedes cerrar con Esc para caminar dentro de tu celda y volver con E.',
        };
      }
      return {
        venue,
        subtitle: `ACCESO PENITENCIARIO · ${venue.district.toUpperCase()}`,
        intro: venueMessage || 'Control de acceso de la Penitenciaría Estatal de Costa Palmera.',
        options: [
          { label: 'Consultar registro penitenciario', detail: 'Revisa antecedentes y estado policial actual', badge: `${police.stars}★` },
          { label: 'Salir del control', detail: 'Volver al Bulevar Cívico' },
        ],
        note: 'Cuando la policía te detenga serás trasladado directamente a este complejo.',
      };
    }

    if (venue.id === 'police_hq') {
      const fine = police.stars > 0 ? Math.max(25, police.stars * 30) : 0;
      return {
        venue,
        subtitle: `COMISARÍA CENTRAL · NIVEL ${police.stars}★ · SALDO $${economy.money}`,
        intro: venueMessage || 'Recepción oficial de la Policía de Costa Palmera. ¿En qué podemos atenderte?',
        options: [
          { label: 'Pagar multa y limpiar estrellas', detail: police.stars > 0 ? 'Cancela la búsqueda activa de forma legal' : 'No tienes cargos activos', badge: fine > 0 ? `$${fine}` : 'LIMPIO' },
          { label: 'Entregarse voluntariamente', detail: 'Traslado a Cárcel de Palma con fianza y condena reducidas', badge: 'CÁRCEL' },
          { label: 'Consultar boletín del distrito', detail: 'Resumen de incidentes y patrullas activas', badge: `${journal.events.length} REG` },
        ],
        note: 'La Comisaría Central coordina las patrullas, barricadas y el helicóptero del distrito.',
      };
    }

    if (venue.id === 'casino') {
      return {
        venue,
        subtitle: `ISLA FORTUNA · SALDO $${economy.money} · BALANCE ${casinoNet >= 0 ? `+$${casinoNet}` : `-$${Math.abs(casinoNet)}`}`,
        intro: venueMessage || 'Mesa principal de Casino Royale Palma. Haz tu jugada y prueba tu suerte.',
        options: [
          { label: 'Ruleta Rojo / Negro', detail: 'Apuesta clásica 50/50 · premio x2 ($40)', badge: '$20' },
          { label: 'Ruleta Docena Dorada', detail: 'Riesgo medio · premio x3 ($150)', badge: '$50' },
          { label: 'Dados 21 · Mesa VIP', detail: 'Duelo contra la banca · premio x2 ($200)', badge: '$100' },
        ],
        note: 'Los premios y pérdidas se acreditan al instante en tu efectivo.',
      };
    }

    if (venue.id === 'restaurant') {
      return {
        venue,
        subtitle: `SIERRA PALMERA · SALUD ${health}/100 · PROT. ${economy.armor}/100 · $${economy.money}`,
        intro: venueMessage || 'Bienvenidos a la terraza panorámica de El Mirador. Cocina recién hecha frente a la bahía.',
        options: [
          { label: 'Menú Costero Completo', detail: 'Restaura salud al 100% y +15 de protección', badge: '$18' },
          { label: 'Mariscada Especial del Mirador', detail: 'Restaura salud al 100% y +45 de protección', badge: '$35' },
          { label: 'Café y Postre Panorámico', detail: 'Recupera +35 de salud al instante', badge: '$10' },
        ],
        note: 'Disfruta de la vista elevada sobre Costa Palmera e Isla Fortuna.',
      };
    }

    // Buyable House: Casa del Mirador
    if (!houseOwned) {
      return {
        venue,
        subtitle: `INMOBILIARIA ISLA FORTUNA · TU SALDO $${economy.money}`,
        intro: venueMessage || 'Villa moderna con piscina privada, vestidor y vistas a Bahía Palmera. Lista para habitar.',
        options: [
          { label: 'Comprar Casa del Mirador', detail: 'Adquiere esta propiedad como refugio y punto de descanso permanente', badge: `$${HOUSE_PRICE}` },
          { label: 'Seguir explorando', detail: 'Volver al exterior sin comprar todavía' },
        ],
        note: 'Al comprarla podrás descansar, avanzar el reloj, bajar búsqueda menor y reaparecer aquí.',
      };
    }
    return {
      venue,
      subtitle: `TU REFUGIO EN ISLA FORTUNA · SALUD ${health}/100`,
      intro: venueMessage || 'Bienvenido a tu hogar en Casa del Mirador. Todo listo para descansar o prepararte.',
      options: [
        { label: 'Dormir y descansar (+6 h)', detail: 'Salud al 100%, avanza el día 6 horas y calma búsqueda menor', badge: '+6H' },
        { label: 'Cambiar de ropa y reabastecer', detail: 'Baja búsqueda <= 2★ y recarga munición básica a 32', badge: 'PERFIL BAJO' },
        { label: 'Punto de aparición en casa', detail: homeRespawnEnabled ? 'Activo: reaparecerás en esta villa' : 'Inactivo: reaparecerás en Costa Palmera Centro', badge: homeRespawnEnabled ? 'ACTIVO' : 'INACTIVO' },
      ],
      note: 'Propiedad registrada a tu nombre en Isla Fortuna.',
    };
  }

  function handleVenueSelect(index: number) {
    if (!activeVenue) return;
    const id: VenueId = activeVenue.id;

    if (id === 'prison') {
      if (inPrison) {
        if (index === 0) {
          inPrison = false;
          onAdvanceHour?.(prisonSentenceHours);
          police.clearWanted();
          player.teleport(venueById.prison.releasePoint!, 0);
          activeVenue = undefined;
          context('world');
          tell(`Condena de ${prisonSentenceHours} h cumplida · eres libre frente a la Cárcel de Palma`, true);
          return;
        }
        if (index === 1) {
          if (economy.money < prisonBail) {
            venueMessage = `Necesitas $${prisonBail} para pagar la fianza (tienes $${economy.money}).`;
            tell(venueMessage, true);
            return;
          }
          economy.money -= prisonBail;
          inPrison = false;
          police.clearWanted();
          player.teleport(venueById.prison.releasePoint!, 0);
          activeVenue = undefined;
          context('world');
          audio.play('purchase');
          tell(`Fianza de $${prisonBail} pagada · libertad inmediata`, true);
          return;
        }
        if (index === 2) {
          inPrison = false;
          const yardEscape = { x: -38, y: 0.1, z: -129 };
          player.teleport(yardEscape, 0);
          activeVenue = undefined;
          context('world');
          police.reportEscalation(player.position, 110, true, 3);
          journal.publish('report', player.position, now, 'prison', false);
          tell('¡FUGA DE LA CÁRCEL DE PALMA! Alerta policial ★★★', true);
          return;
        }
        return;
      }
      if (index === 0) {
        venueMessage = `Registro activo: ${police.stars}★ · ${journal.events.length} incidentes en el distrito · fianza base $35/estrella.`;
        tell('Registro penitenciario consultado');
      } else {
        activeVenue = undefined;
        context('world');
      }
      return;
    }

    if (id === 'police_hq') {
      if (index === 0) {
        if (police.stars === 0) {
          venueMessage = 'Tu expediente está limpio. No tienes estrellas de búsqueda activas.';
          tell(venueMessage);
          return;
        }
        const fine = Math.max(25, police.stars * 30);
        if (economy.money < fine) {
          venueMessage = `La multa oficial es de $${fine} y solo dispones de $${economy.money}.`;
          tell(venueMessage, true);
          return;
        }
        economy.money -= fine;
        police.clearWanted();
        audio.play('purchase');
        venueMessage = `Multa de $${fine} saldada. Se cancelan todas las órdenes de búsqueda.`;
        tell('Estrellas limpiadas en Comisaría Central', true);
      } else if (index === 1) {
        transferToPrison(Math.max(1, police.stars), true);
      } else if (index === 2) {
        venueMessage = `Boletín oficial: ${police.stars}★ (${police.starLabel}) · ${journal.events.length} reportes registrados · ${police.patrolCars.length} patrullas en servicio.`;
        tell('Boletín policial actualizado');
      }
      return;
    }

    if (id === 'casino') {
      const bets = [20, 50, 100];
      const wager = bets[index];
      if (!wager) return;
      if (economy.money < wager) {
        venueMessage = `No tienes suficiente efectivo para apostar $${wager} (saldo: $${economy.money}).`;
        tell(venueMessage, true);
        return;
      }
      economy.money -= wager;
      const roll = nextCasinoRandom();
      if (index === 0) {
        const won = roll < 0.52;
        if (won) {
          economy.money += 40;
          casinoNet += 20;
          venueMessage = '¡Rojo ganador! Cobras $40 (+$20 netos).';
          audio.play('purchase');
          tell('Casino Royale · ¡Ganaste $40 en la ruleta!');
        } else {
          casinoNet -= 20;
          venueMessage = 'Salió negro · pierdes la apuesta de $20.';
          audio.play('notice');
          tell('Casino Royale · Perdiste $20');
        }
      } else if (index === 1) {
        const won = roll < 0.36;
        if (won) {
          economy.money += 150;
          casinoNet += 100;
          venueMessage = '¡Pleno en la Docena Dorada! Cobras $150 (+$100 netos).';
          audio.play('purchase');
          tell('Casino Royale · ¡Gran premio de $150!');
        } else {
          casinoNet -= 50;
          venueMessage = 'La bola cayó fuera de tu docena · pierdes $50.';
          audio.play('notice');
          tell('Casino Royale · Perdiste $50');
        }
      } else {
        const playerScore = 14 + Math.floor(roll * 8);
        const dealerScore = 14 + Math.floor(nextCasinoRandom() * 8);
        if (playerScore > dealerScore) {
          economy.money += 200;
          casinoNet += 100;
          venueMessage = `Mesa VIP: sacaste ${playerScore} contra ${dealerScore} de la banca. ¡Cobras $200!`;
          audio.play('purchase');
          tell('Casino Royale · ¡Ganaste $200 en Dados 21!');
        } else if (playerScore === dealerScore) {
          economy.money += 100;
          venueMessage = `Empate a ${playerScore} · la banca te devuelve los $100.`;
          audio.play('notice');
          tell('Casino Royale · Empate, recuperas $100');
        } else {
          casinoNet -= 100;
          venueMessage = `Mesa VIP: ${playerScore} contra ${dealerScore} de la banca · pierdes $100.`;
          audio.play('notice');
          tell('Casino Royale · La banca gana ($100)');
        }
      }
      return;
    }

    if (id === 'restaurant') {
      const meals = [
        { name: 'Menú Costero Completo', price: 18, fullHeal: true, heal: 100, armor: 15 },
        { name: 'Mariscada Especial del Mirador', price: 35, fullHeal: true, heal: 100, armor: 45 },
        { name: 'Café y Postre Panorámico', price: 10, fullHeal: false, heal: 35, armor: 0 },
      ];
      const meal = meals[index];
      if (!meal) return;
      if (economy.money < meal.price) {
        venueMessage = `El plato cuesta $${meal.price} y tienes $${economy.money}.`;
        tell(venueMessage, true);
        return;
      }
      economy.money -= meal.price;
      health = meal.fullHeal ? 100 : Math.min(100, health + meal.heal);
      if (meal.armor > 0) economy.armor = Math.min(100, economy.armor + meal.armor);
      audio.play('purchase');
      venueMessage = `Servido: ${meal.name}. Salud ${health}/100 · Protección ${economy.armor}/100.`;
      tell(`${meal.name} disfrutado en El Mirador · −$${meal.price}`);
      return;
    }

    if (id === 'house') {
      if (!houseOwned) {
        if (index === 0) {
          if (economy.money < HOUSE_PRICE) {
            venueMessage = `Casa del Mirador cuesta $${HOUSE_PRICE}. Te faltan $${HOUSE_PRICE - economy.money} (prueba el Casino o comercios).`;
            tell(venueMessage, true);
            return;
          }
          economy.money -= HOUSE_PRICE;
          houseOwned = true;
          homeRespawnEnabled = true;
          selection = 0;
          audio.play('purchase');
          venueMessage = '¡Escrituras firmadas! Casa del Mirador ahora es tu refugio en Isla Fortuna.';
          tell('¡Compraste Casa del Mirador por $350!', true);
        } else {
          activeVenue = undefined;
          context('world');
        }
        return;
      }
      if (index === 0) {
        health = 100;
        onAdvanceHour?.(6);
        if (police.stars > 0 && (police.stars <= 2 || police.evading)) {
          police.clearWanted();
        }
        audio.play('notice');
        venueMessage = 'Dormiste 6 horas frente al mar. Salud restaurada al 100% y reloj avanzado.';
        tell('Descansaste 6 horas en Casa del Mirador · salud al 100%', true);
      } else if (index === 1) {
        if (police.stars > 0 && police.stars <= 2) police.clearWanted();
        if (weapon.reserve < 32) weapon.reserve = 32;
        audio.play('purchase');
        venueMessage = `Perfil bajo aplicado · munición de reserva lista (${weapon.reserve} cartuchos).`;
        tell('Cambiaste de ropa y revisaste el equipo en casa');
      } else if (index === 2) {
        homeRespawnEnabled = !homeRespawnEnabled;
        venueMessage = homeRespawnEnabled
          ? 'Punto de aparición fijado en Casa del Mirador (Isla Fortuna).'
          : 'Punto de aparición restaurado a Costa Palmera Centro.';
        tell(venueMessage);
      }
    }
  }

  function openReplayWith(clips: WitnessClip[], title: string, resetAfter = false) {
    if (!clips.length) return false;
    replayClips = clips;
    replayAngle = 0;
    replayFrame = 0;
    replayPlaying = true;
    replayAcc = 0;
    replayTitle = title;
    resetOnReplayExit = resetAfter;
    context('replay');
    return true;
  }

  function toggleVehicle() {
    if (currentVehicle) {
      const candidateX = currentVehicle.position.x + Math.cos(currentVehicle.heading) * 2.1;
      const candidateZ = currentVehicle.position.z + Math.sin(currentVehicle.heading) * 2.1;
      const inCore = Math.abs(candidateX) < 62 && Math.abs(candidateZ) < 92 && currentVehicle.position.y < 1.2;
      const side = inCore
        ? (navigation.closest({ x: candidateX, y: 0.08, z: candidateZ }, 3.2)
          ?? navigation.closest(currentVehicle.position, 4.0)
          ?? probeGroundPoint(candidateX, candidateZ, currentVehicle.position.y))
        : probeGroundPoint(candidateX, candidateZ, currentVehicle.position.y);

      if (currentVehicle.controlledByPlayer) {
        currentVehicle.controlledByPlayer = false;
        const carRef = traffic.cars.find((c) => c.id === currentVehicle!.id);
        if (carRef) carRef.abandoned = true;
        currentVehicle.driverId = undefined;
        currentVehicle.occupiedSeats = 0;
      } else {
        const idx = currentVehicle.passengerIds.indexOf('player');
        if (idx >= 0) currentVehicle.passengerIds.splice(idx, 1);
      }
      currentVehicle = undefined;
      player.setInVehicle(false, side);
      tell('Saliste del vehículo');
      return;
    }

    const nearest = traffic.nearestBoardable(player.position, 3.4);
    if (!nearest) {
      tell('Acércate a un coche, al autobús o al metro');
      return;
    }
    if (nearest.kind === 'bus' || nearest.kind === 'metro') {
      if (!nearest.stoppedAtId && nearest.speed > 1.3) {
        tell('Espera a que se detenga en la parada o estación');
        return;
      }
      weapon.equipped = false;
      weapon.reloadTime = 0;
      nearest.passengerIds.push('player');
      currentVehicle = nearest;
      player.setInVehicle(true, nearest.position, nearest.heading);
      tell(nearest.kind === 'bus' ? 'Subiste al autobús · F para bajar en una parada' : 'Subiste al metro · F para bajar en estación');
      return;
    }

    // Car entry / carjacking
    const car = traffic.cars.find((c) => c.id === nearest.id);
    if (!car) return;
    weapon.equipped = false;
    weapon.reloadTime = 0;
    if (car.occupiedSeats > 0 && car.driverId && car.driverId !== 'player') {
      const ejectPos = navigation.closest({
        x: car.position.x - Math.cos(car.heading) * 1.9,
        y: 0.08,
        z: car.position.z - Math.sin(car.heading) * 1.9,
      }, 2.5) ?? { x: car.position.x - 1.8, y: 0.08, z: car.position.z };
      population.ejectFromVehicle(car.id, ejectPos, now);
    }
    car.controlledByPlayer = true;
    car.abandoned = false;
    car.driverId = 'player';
    car.occupiedSeats = 1;
    currentVehicle = car;
    player.setInVehicle(true, car.position, car.heading);
    tell('Conduciendo · WASD para manejar · Espacio frena · F para salir');
  }

  function select(index: number) {
    selection = index;
    if (overlay === 'shop') buy(index);
    else if (overlay === 'venue') handleVenueSelect(index);
    else if (overlay === 'talk' && activeTalkNpc) {
      const topic = dialogueTopics[index];
      if (!topic) return;
      if (topic.id === 'leave') {
        activeTalkNpc = undefined;
        context('world');
      } else {
        talkReply = playerDialogueReply(activeTalkNpc, topic.id, journal.events.at(-1), police.stars, now);
        population.recordPlayerChat(activeTalkNpc, topic.label, now);
      }
    } else if (overlay === 'replay') {
      if (index >= 0 && index < replayClips.length) {
        replayAngle = index;
        replayFrame = 0;
        replayPlaying = true;
      }
    } else if (overlay === 'phone') {
      if (phonePage === 'home') {
        if (index === 3) {
          muted = !muted;
          audio.setMuted(muted);
          tell(muted ? 'Sonido desactivado' : 'Sonido activado');
        } else {
          phonePage = (['feed', 'bag', 'help'] as const)[index] ?? 'home';
          selection = 0;
        }
      } else if (phonePage === 'bag') {
        use(index);
      } else if (phonePage === 'feed' && journal.posts.length) {
        const post = journal.posts[index];
        if (post && post.clips.length > 0) {
          openReplayWith(post.clips, `Palma Social · ${post.clips[0].locationName}`, false);
        } else {
          tell('Testimonio real. La grabación de video todavía no está disponible.');
        }
      }
    }
  }

  function command(command: Command) {
    if (overlay !== 'world') {
      if (command === 'back') {
        if (overlay === 'phone' && phonePage !== 'home') {
          phonePage = 'home';
          selection = 0;
        } else {
          activeTalkNpc = undefined;
          activeVenue = undefined;
          context('world');
        }
      } else if (['up', 'down', 'left', 'right'].includes(command)) {
        if (overlay === 'replay') {
          if (command === 'left' || command === 'right') {
            const delta = command === 'left' ? -1 : 1;
            replayAngle = (replayAngle + delta + Math.max(1, replayClips.length)) % Math.max(1, replayClips.length);
            replayFrame = 0;
          } else {
            replayPlaying = !replayPlaying;
          }
          return;
        }
        const venueOptionsCount = overlay === 'venue' ? Math.max(1, buildVenuePanel(activeVenue)?.options.length ?? 1) : 1;
        const count = overlay === 'shop'
          ? activeShop.catalog.length
          : overlay === 'venue'
            ? venueOptionsCount
            : overlay === 'talk'
              ? dialogueTopics.length
              : phonePage === 'bag'
                ? Math.max(1, economy.ownedItems().length)
                : phonePage === 'home'
                  ? 4
                  : Math.max(1, journal.posts.length);
        const delta = command === 'up' || command === 'left' ? -1 : 1;
        selection = (selection + delta + count) % count;
      } else if (command === 'confirm' || command === 'interact') {
        if (overlay === 'replay') replayPlaying = !replayPlaying;
        else select(selection);
      }
      return;
    }

    if (command === 'phone') {
      weapon.equipped = false;
      weapon.reloadTime = 0;
      phonePage = 'home';
      context('phone');
      audio.play('notice');
    } else if (command === 'vehicle') {
      toggleVehicle();
    } else if (command === 'interact') {
      const venue = !weapon.equipped ? nearestVenue() : undefined;
      if (venue) {
        activeVenue = venue;
        venueMessage = '';
        context('venue');
        return;
      }
      const trade = canTrade();
      if (trade) {
        activeShop = trade.store;
        context('shop');
        return;
      }
      const npc = !player.inVehicle && !weapon.equipped ? population.nearestTalkable(player.position, 2.6) : undefined;
      if (npc) {
        activeTalkNpc = npc;
        npc.actor.face(player.position, 0.5);
        talkReply = playerDialogueReply(npc, 'greet', journal.events.at(-1), police.stars, now);
        population.recordPlayerChat(npc, 'Saludar', now);
        context('talk');
        return;
      }
      const nearAnyShop = allShops.find((s) => planarDistance(player.position, s.entrance) < 11);
      const nearAnyVenue = functionalVenues.find((v) => planarDistance(player.position, v.entrance) < 14);
      tell(
        weapon.equipped
          ? 'Guarda la pistola con 1 para hablar o interactuar'
          : nearAnyVenue
            ? `Entra en ${nearAnyVenue.name} y acércate al punto de atención.`
            : nearAnyShop
              ? `Acércate al mostrador de ${nearAnyShop.name}. La entrada está abierta.`
              : 'Explora tiendas, vecinos o los puntos clave de la ciudad (Casino, Restaurante, Comisaría, Cárcel y Casa).',
      );
    } else if (command === 'equip') {
      if (player.inVehicle) { tell('Sal del vehículo con F para usar el arma'); return; }
      weapon.toggle();
      tell(weapon.equipped ? 'Pistola equipada · botón derecho para apuntar' : 'Pistola guardada');
    } else if (command === 'reload') {
      if (weapon.reload()) audio.play('reload');
      else tell(weapon.rounds === 8 ? 'Cargador lleno' : 'Sin munición de reserva');
    }
  }

  function aimHit() {
    camera.getWorldDirection(direction);
    return physics.raycast(camera.position, direction, 70, [player.collider.handle]);
  }

  function shoot() {
    const targetHit = aimHit();
    const target = camera.position.clone().addScaledVector(direction, targetHit?.timeOfImpact ?? 70);
    const yaw = player.aimHeading;
    const muzzle = new Vector3(
      player.position.x + Math.sin(yaw) * 0.65 + Math.cos(yaw) * 0.3,
      player.position.y + 1.36,
      player.position.z - Math.cos(yaw) * 0.65 + Math.sin(yaw) * 0.3,
    );
    const trajectory = target.clone().sub(muzzle);
    const distance = trajectory.length();
    trajectory.normalize();
    const hit = physics.raycast(muzzle, trajectory, distance + 0.01, [player.collider.handle]);
    const impact = muzzle.clone().addScaledVector(trajectory, hit?.timeOfImpact ?? distance);
    feedback.shot(muzzle, impact, hit !== null);
    audio.play('shot', muzzle);
    player.kick();
    journal.publish('shot', player.position, now);
    if (!hit) return;
    if (feedback.hit(hit.collider.handle, impact)) {
      journal.publish('glass', impact, now, 'impact', false);
      audio.play('glass', impact);
      hitUntil = now + 0.15;
    }
    const actor = allActors().find((item) => item.collider.handle === hit.collider.handle);
    if (actor) {
      actor.hurt(35);
      audio.play('impact', impact);
      hitUntil = now + 0.18;
      if (policeActorSet.has(actor)) {
        police.reportEscalation(player.position, 55, true, 3);
      } else {
        police.reportEscalation(player.position, 42, true, 2);
      }
    } else if (!feedback.windows.some((w) => w.collider.handle === hit.collider.handle)) {
      audio.play('impact', impact);
    }
  }

  let cachedPrompt = '';
  let lastPromptTime = -1;
  let lastPromptX = Number.NaN;
  let lastPromptZ = Number.NaN;

  function doResetWithFee() {
    if (houseOwned && homeRespawnEnabled && venueById.house.spawnPoint) {
      if (currentVehicle) {
        currentVehicle.controlledByPlayer = false;
        currentVehicle = undefined;
      }
      health = 100;
      detention = false;
      inPrison = false;
      police.clearWanted();
      economy.money = Math.max(0, economy.money - 30);
      player.teleport(venueById.house.spawnPoint, 0);
      context('world');
      tell('Recuperado en Casa del Mirador · $30 de gastos médicos', true);
      return;
    }
    reset();
    economy.money = Math.max(0, economy.money - 30);
    tell('Traslado al inicio · nueva escena · $30 de gastos', true);
  }

  function reset() {
    if (overlay === 'replay') recorder.hideReplay();
    overlay = 'world';
    selection = 0;
    aim = false;
    player.setWeapon(false, false);
    onContext('world');
    now = 0;
    currentVehicle = undefined;
    activeTalkNpc = undefined;
    activeVenue = undefined;
    venueMessage = '';
    talkReply = '';
    activeShop = allShops[0];
    inPrison = false;
    prisonBail = 30;
    prisonSentenceHours = 2;
    houseOwned = false;
    homeRespawnEnabled = false;
    casinoNet = 0;
    casinoRngState = 7731;
    pendingArrestStars = 0;
    cachedPopVersion = -1;
    lastPromptTime = -1;
    journal.reset();
    economy.reset();
    weapon.reset();
    population.reset();
    police.reset();
    traffic.reset();
    feedback.reset();
    recorder.reset();
    player.reset();
    health = 100;
    threatTime = footDistance = 0;
    threatSent = robberyPaid = detention = emptyLatched = false;
    threatenedShop = undefined;
    hitUntil = 0;
    previousPoliceState = 'patrol';
    resetOnReplayExit = false;
    replayClips = [];
    previousFeet.copy(player.position);
    world.reset(player.position);
    physics.step(1 / 60);
    tell('Mercado Palma · entra por la puerta central y acércate a Mara');
  }

  function buildPrompt(): string {
    if (currentVehicle) return 'F · Bajar del vehículo';
    if (inPrison) return 'E · Opciones de celda (Condena / Fianza / Fuga)';
    const venue = !weapon.equipped ? nearestVenue() : undefined;
    if (venue) {
      if (venue.id === 'house') return houseOwned ? 'E · Casa del Mirador (Descansar / Refugio)' : `E · Comprar Casa del Mirador ($${HOUSE_PRICE})`;
      if (venue.id === 'casino') return 'E · Jugar en Casino Royale Palma';
      if (venue.id === 'restaurant') return 'E · Pedir menú en El Mirador';
      if (venue.id === 'police_hq') return 'E · Recepción de Comisaría Central';
      return `E · ${venue.name}`;
    }
    const trade = canTrade();
    if (trade) return `E · Hablar con ${trade.merchant.name} / comprar`;
    const veh = traffic.nearestBoardable(player.position, 3.2);
    if (veh) {
      if (veh.kind === 'bus') return 'F · Subir al autobús';
      if (veh.kind === 'metro') return 'F · Subir al metro';
      return veh.occupiedSeats > 0 ? 'F · Robar vehículo' : 'F · Conducir vehículo';
    }
    const npc = !weapon.equipped ? population.nearestTalkable(player.position, 2.6) : undefined;
    if (npc) return `E · Hablar con ${npc.name}`;
    const nearVenueEntrance = functionalVenues.find((v) => planarDistance(player.position, v.entrance) < 6 && Math.abs(player.position.y - v.entrance.y) < 2.2);
    if (nearVenueEntrance) return `${nearVenueEntrance.name} · entrada abierta`;
    const nearStore = allShops.find((s) => planarDistance(player.position, s.entrance) < 5);
    if (nearStore) return `${nearStore.name} · entrada abierta`;
    const nearStop = busStops.find((b) => planarDistance(player.position, b.waitPoint) < 3.5);
    if (nearStop) return nearStop.name;
    const nearMetro = metroStations.find((m) => planarDistance(player.position, m.platform) < 4);
    if (nearMetro) return nearMetro.name;
    return '';
  }

  function getPrompt(): string {
    const moved = Math.hypot(player.position.x - lastPromptX, player.position.z - lastPromptZ) > 0.25;
    if (moved || now - lastPromptTime >= 0.12 || lastPromptTime < 0) {
      lastPromptTime = now;
      lastPromptX = player.position.x;
      lastPromptZ = player.position.z;
      cachedPrompt = buildPrompt();
    }
    return cachedPrompt;
  }

  function buildReplaySnapshots() {
    const actors: ReplayActorSnapshot[] = [
      { id: 'player', position: player.position, heading: player.heading, health, armed: weapon.equipped, color: 0x247c81 },
      ...population.allPeople.map((p) => ({
        id: p.id, position: p.actor.position, heading: p.actor.heading, health: p.actor.health, armed: false, color: p.color,
      })),
      ...police.units.map((u) => ({
        id: u.id, position: u.actor.position, heading: u.actor.heading, health: u.actor.health, armed: police.state === 'pursue', color: 0x304f7c,
      })),
    ];
    const vehicles: ReplayVehicleSnapshot[] = [
      ...traffic.allVehicles.map((v) => ({ id: v.id, position: v.position, heading: v.heading, color: v.color, kind: v.kind })),
      ...police.patrolCars.map((p) => ({ id: p.id, position: p.position, heading: p.heading, color: 0x1e2c3d, kind: 'police' as const })),
    ];
    return { actors, vehicles };
  }

  const api = {
    journal,
    economy,
    weapon,
    population,
    police,
    traffic,
    feedback,
    navigation,
    world,
    recorder,
    get time() { return now; },
    get overlay() { return overlay; },
    get phonePage() { return phonePage; },
    get selection() { return selection; },
    get activeShop() { return activeShop; },
    get venuePanel() { return buildVenuePanel(activeVenue); },
    get currentDistrict() { return districtNameAt(player.position.x, player.position.z); },
    get houseOwned() { return houseOwned; },
    get inPrison() { return inPrison; },
    get casinoNet() { return casinoNet; },
    get activeTalkNpc() { return activeTalkNpc; },
    get talkReply() { return talkReply; },
    get currentVehicle() { return currentVehicle; },
    get replayState() {
      const clip = replayClips[replayAngle];
      return {
        active: overlay === 'replay',
        title: replayTitle,
        clips: replayClips,
        clip,
        angle: replayAngle,
        frame: replayFrame,
        playing: replayPlaying,
      };
    },
    get health() { return health; },
    get armor() { return economy.armor; },
    get muted() { return muted; },
    get aiming() { return aim; },
    get hit() { return now < hitUntil; },
    get notice() {
      const speech = population.activeSpeech(now);
      if (now < noticeUntil) return notice;
      return speech;
    },
    get threat() { return threatTime > 0 ? Math.min(1, threatTime / 3) : 0; },
    get prompt() { return getPrompt(); },
    command,
    select,
    openReplayWith,
    closeOverlay() { activeVenue = undefined; context('world'); },
    step(dt: number, controls: MovementInput & { aim: boolean; fire: boolean }, currentHour = 17.25) {
      if (overlay === 'replay') {
        const clip = replayClips[replayAngle];
        if (replayPlaying && clip && clip.frames.length > 1) {
          replayAcc += dt;
          if (replayAcc >= 0.18) {
            replayAcc = 0;
            replayFrame = (replayFrame + 1) % clip.frames.length;
          }
        }
        return;
      }

      navigation.beginStep(walkers());
      now += dt;
      const input = overlay === 'world' ? controls : idle;

      if (currentVehicle) {
        if (currentVehicle.controlledByPlayer) {
          traffic.setPlayerDrive({
            throttle: input.z,
            steer: -input.x,
            brake: input.jump,
          });
        } else {
          traffic.setPlayerDrive({ throttle: 0, steer: 0, brake: false });
        }
        player.prepareStep(dt, idle);
      } else {
        traffic.setPlayerDrive({ throttle: 0, steer: 0, brake: false });
        weapon.tick(dt);
        aim = weapon.equipped && (input.aim || input.fire);
        player.setWeapon(weapon.equipped, aim);
        previousFeet.copy(player.position);
        player.prepareStep(dt, input);
      }

      population.step(
        dt,
        now,
        player.position,
        weapon.equipped,
        world,
        economy,
        { bus: traffic.bus, metro: traffic.metro },
        currentHour,
        police.stars,
        traffic.allVehicles,
      );
      police.step(dt, now, player.position, weapon.equipped, currentVehicle?.id);
      previousPoliceState = police.state;

      const actors = allActors();
      for (let i = 0; i < actors.length; i++) actors[i].prepare(dt);
      traffic.prepare(dt, now);
      physics.step(dt);
      player.finishStep(dt);
      for (let i = 0; i < actors.length; i++) actors[i].finish(dt);
      traffic.finish();

      if (currentVehicle) {
        const safePose = currentVehicle.position.y < 0
          ? { x: currentVehicle.position.x, y: 0.2, z: currentVehicle.position.z }
          : currentVehicle.position;
        player.syncVehiclePose(safePose, currentVehicle.heading);
        if (currentVehicle.controlledByPlayer && Math.abs(currentVehicle.speed) > 2.2) {
          feedback.hitNear(currentVehicle.position, 1.8);
          for (let i = 0; i < actors.length; i++) {
            const actor = actors[i];
            if (actor.health > 0 && !actor.suspended && actor.collider.isEnabled() && planarDistance(actor.position, currentVehicle.position) < 1.55) {
              actor.hurt(45);
              audio.play('impact', actor.position);
              police.reportEscalation(currentVehicle.position, policeActorSet.has(actor) ? 55 : 34, true, policeActorSet.has(actor) ? 3 : 2);
            }
          }
        }
      } else {
        footDistance += planarDistance(previousFeet, player.position);
        if (footDistance > (input.run ? 1.65 : 1.3) && Math.abs(player.position.y - previousFeet.y) < 0.025) {
          footDistance = 0;
          audio.play('step', player.position);
        }
        if (input.fire && weapon.fire()) shoot();
        if (!input.fire) emptyLatched = false;
        else if (weapon.equipped && weapon.rounds === 0 && weapon.reloadTime === 0 && !emptyLatched) {
          emptyLatched = true;
          tell(weapon.reserve > 0 ? 'Cargador vacío · R para recargar' : 'Sin munición · compra una caja en el mercado', true);
        }
      }

      // Multi-store threat & robbery detection (any of the 9 merchants)
      const target = aim ? aimHit() : null;
      const threatenedMerchant = target
        ? population.merchants.find((m) => m.actor.collider.handle === target.collider.handle && m.actor.health > 0 && planarDistance(player.position, m.actor.position) < 11)
        : undefined;
      if (threatenedMerchant) {
        const storeDef = allShops.find((s) => s.id === threatenedMerchant.shopId) ?? allShops[0];
        if (threatenedShop && threatenedShop.id !== storeDef.id) {
          threatTime = 0;
          threatSent = robberyPaid = false;
        }
        threatenedShop = storeDef;
        threatTime += dt;
        if (threatTime > 0.7 && !threatSent) {
          journal.publish('threat', player.position, now);
          threatSent = true;
          tell(`${threatenedMerchant.name} ha reconocido la amenaza`);
        }
        if (threatTime >= 3 && !robberyPaid) {
          const cash = economy.robStore(storeDef.id);
          robberyPaid = true;
          journal.publish('robbery', player.position, now);
          tell(cash ? `${threatenedMerchant.name} entrega $${cash} · hay testigos del asalto` : 'La caja está vacía');
          audio.play('purchase');
        }
      } else {
        threatTime = 0;
        threatSent = robberyPaid = false;
        threatenedShop = undefined;
      }

      if (overlay === 'shop' && !canTrade()) {
        context('world');
        tell('La atención se ha interrumpido');
      }
      if (overlay === 'talk' && (!activeTalkNpc || activeTalkNpc.actor.health <= 0 || ['fleeing', 'reacting', 'reporting', 'recording'].includes(activeTalkNpc.state))) {
        activeTalkNpc = undefined;
        context('world');
        tell('La conversación se ha interrumpido');
      }

      if (!currentVehicle) {
        for (const car of traffic.cars) {
          if (car.speed > 2.8 && planarDistance(car.position, player.position) < 1.5 && player.position.y < 1 && now > hitUntil + 1) {
            health = Math.max(0, health - 20);
            hitUntil = now + 0.3;
            audio.play('impact', player.position);
            tell('Golpe de vehículo · usa comida desde la mochila');
          }
        }
      }

      // Witness POV Recording (lazy snapshots only built when an active capture samples a frame)
      recorder.step(dt, now, population.allPeople, player.position, buildReplaySnapshots);
      journal.tickSocial(dt);

      if (detention) {
        const arrestStars = Math.max(1, police.stars);
        detention = false;
        if (journal.allClips.length > 0 && typeof document !== 'undefined') {
          pendingArrestStars = arrestStars;
          openReplayWith(
            [...journal.allClips.slice(0, 6)],
            'Detenido · Cobertura del incidente',
            false,
          );
          return;
        }
        transferToPrison(arrestStars);
      } else if (health === 0) {
        if (journal.allClips.length > 0 && typeof document !== 'undefined') {
          openReplayWith(
            [...journal.allClips.slice(0, 6)],
            'Incapacitado · Cobertura del incidente',
            true,
          );
          return;
        }
        doResetWithFee();
      }

      world.update(now, player.position);
      feedback.step(dt, player.position);
      audio.update(player.position, traffic.cars, police.state !== 'patrol', now);
    },
    render(alpha: number, dt: number) {
      if (overlay === 'replay') {
        const clip = replayClips[replayAngle];
        if (clip) recorder.renderReplayFrame(camera, clip, replayFrame);
        return;
      }
      const actors = allActors();
      const pursuing = police.state === 'pursue';
      for (let i = 0; i < actors.length; i++) {
        const actor = actors[i];
        actor.render(alpha, dt, pursuing && policeActorSet.has(actor), camera.position);
      }
      traffic.render(alpha);
      police.render(alpha);
    },
    setCinematicMode(active: boolean) {
      const show = !active;
      const actors = allActors();
      for (let i = 0; i < actors.length; i++) {
        actors[i].setVisible(show);
      }
      for (const vehicle of traffic.allVehicles) {
        vehicle.mesh.visible = show;
      }
      for (const patrolCar of police.patrolCars) {
        patrolCar.mesh.visible = show;
      }
    },
    announce(text: string) {
      tell(text, true);
    },
    reset,
    dispose() {
      population.dispose();
      police.dispose();
      traffic.dispose();
      feedback.dispose();
      recorder.dispose();
    },
  };

  tell('Mercado Palma · entra por la puerta central y acércate a Mara');
  return api;
}

export type Session = ReturnType<typeof createSession>;
