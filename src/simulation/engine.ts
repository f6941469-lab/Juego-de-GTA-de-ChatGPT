import { Vector3, type Scene } from 'three';
import { createNpcPopulation, type MovingObstacle } from '../ai/npc/npc-population';
import { createPolice } from '../ai/police/police';
import { createTraffic } from '../ai/traffic/traffic';
import { gameConfig } from '../config/game';
import { WorldEventBus } from '../core/events';
import type { createInput } from '../core/input';
import type { SystemTimings } from '../debug/inspector';
import { buildPedestrianGraph } from '../navigation/pedestrian-graph';
import type { Physics } from '../physics/physics';
import { createVehicleObstacles } from '../physics/vehicle-obstacles';
import type { createPlayer } from '../player/player';
import { createWeaponSystem, type BallisticTarget } from '../player/weapons';
import { createVehicleManager } from '../vehicles/vehicle-manager';
import type { District } from '../world/district';
import { createStores } from '../world/stores';
import { EntityRegistry } from './entities';

type ControlState = ReturnType<ReturnType<typeof createInput>['read']>;

export interface EngineCallbacks {
  onAudioCue?: (cue: 'ui' | 'enter' | 'leave' | 'horn' | 'jump' | 'impact' | 'shot' | 'reload' | 'empty' | 'cash') => void;
  onNotice?: (text: string, durationSeconds: number) => void;
}

export interface InteractionPrompt {
  canInteract: boolean;
  label?: string;
  touchLabel?: string;
}

export function createSimulationEngine(
  scene: Scene,
  physics: Physics,
  player: ReturnType<typeof createPlayer>,
  district: District,
  seed: number,
  initialHour: number,
  callbacks: EngineCallbacks = {},
) {
  const eventBus = new WorldEventBus();
  const entities = new EntityRegistry();
  const pedestrianGraph = buildPedestrianGraph(physics.spatial, district.map.stores ?? []);
  const vehicles = createVehicleManager(scene, physics, { x: 3.9, y: 0, z: 22 });
  const traffic = createTraffic(scene, district.map, seed);
  const police = createPolice(scene, traffic.graph, physics.spatial);
  const stores = createStores(scene, district.map.stores ?? []);
  const npcPopulation = createNpcPopulation(scene, {
    graph: pedestrianGraph,
    spatial: physics.spatial,
    stores: stores.getInteriors(),
    seed,
  });
  const weapons = createWeaponSystem(scene);
  const physicalTraffic = createVehicleObstacles(physics);
  const previousPlayer = new Vector3().copy(player.position);

  const playerObstacle = { x: 0, z: 0, radius: 0.6 };
  const trafficObstacleScratch: { x: number; z: number; radius?: number }[] = [];
  const movingVehiclesScratch: MovingObstacle[] = [];
  const ballisticTargetScratch: BallisticTarget[] = [];
  const timings: SystemTimings = { physicsMs: 0, trafficMs: 0, policeMs: 0, eventsMs: 0 };

  let hour = initialHour;
  let health = 100;
  let cash = 0;
  let impactCooldown = 0;
  let recovery = 0;
  let walkingSpeed = 0;
  let throttle = 0;
  let forceWanted: number | undefined;
  let recentFireThreat = 0;
  let weaponEventCooldown = 0;
  let aimEventCooldown = 0;
  let aimingNow = false;
  let previousWantedState = police.wanted.state;
  let previousWantedLevel = police.wanted.level;

  function currentFocus(): { x: number; y: number; z: number } {
    return vehicles.active ? vehicles.active.car.position : player.position;
  }

  function syncEntities(focusX: number, focusZ: number): void {
    entities.clear();
    const activeCar = vehicles.active;
    const weaponThreat = !activeCar ? (aimingNow ? 0.85 : weapons.spec.threat) : 0;
    const threatLevel = Math.max(
      police.wanted.level > 0 ? Math.min(1, police.wanted.level * 0.25) : 0,
      weaponThreat,
      recentFireThreat,
    );

    entities.upsert({
      id: 'player',
      kind: 'player',
      position: { x: player.position.x, y: player.position.y, z: player.position.z },
      heading: player.heading,
      velocity: { x: 0, z: 0 },
      radius: 0.45,
      active: !activeCar,
      tier: 'high',
      threatLevel,
      vehicleId: activeCar?.id,
    });

    for (const entry of vehicles.all) {
      const car = entry.car;
      entities.upsert({
        id: entry.id,
        kind: 'vehicle',
        position: { x: car.position.x, y: car.position.y, z: car.position.z },
        heading: car.heading,
        velocity: {
          x: Math.sin(car.heading) * car.speed,
          z: -Math.cos(car.heading) * car.speed,
        },
        radius: 2.1,
        active: true,
        tier: 'high',
        threatLevel: car.active && car.speed > 14 ? 0.35 : Math.max(0, car.active ? recentFireThreat : 0),
        occupants: car.active ? ['player'] : undefined,
        label: car.label,
      });
    }

    for (const car of traffic.vehicles) {
      entities.upsert({
        id: car.id,
        kind: 'traffic_vehicle',
        position: { x: car.x, y: 0, z: car.z },
        heading: car.heading,
        velocity: { x: Math.sin(car.heading) * car.speed, z: -Math.cos(car.heading) * car.speed },
        radius: 1.9,
        active: true,
        tier: 'high',
        threatLevel: 0,
      });
    }

    for (const unit of police.units) {
      entities.upsert({
        id: unit.id,
        kind: 'police_unit',
        position: { x: unit.x, y: 0, z: unit.z },
        heading: unit.heading,
        velocity: { x: Math.sin(unit.heading) * unit.speed, z: -Math.cos(unit.heading) * unit.speed },
        radius: 1.95,
        active: true,
        tier: 'high',
        threatLevel: 0,
      });
    }

    entities.updateSpatialAndTiers(focusX, focusZ);
  }

  function reset(restoreHour = initialHour): void {
    physicalTraffic.reset();
    vehicles.reset(player);
    player.reset();
    weapons.reset();
    police.reset();
    stores.reset();
    npcPopulation.reset();
    eventBus.reset();
    previousPlayer.copy(player.position);
    health = 100;
    cash = 0;
    hour = restoreHour;
    impactCooldown = recovery = walkingSpeed = throttle = 0;
    recentFireThreat = weaponEventCooldown = aimEventCooldown = 0;
    aimingNow = false;
    previousWantedState = police.wanted.state;
    previousWantedLevel = police.wanted.level;
    forceWanted = undefined;
    callbacks.onNotice?.('', 0);
    syncEntities(player.position.x, player.position.z);
  }

  function startStoreHeist(storePos: { x: number; y: number; z: number }): boolean {
    const interior = stores.beginHeist(storePos, weapons.equipped !== 'unarmed');
    if (!interior) return false;
    npcPopulation.intimidateStoreClerk(interior.store.id, player.position, eventBus);
    eventBus.emit({
      type: 'robbery_started',
      sourceId: 'player',
      targetIds: [interior.store.id, 'merchant'],
      position: { x: player.position.x, y: 0.9, z: player.position.z },
      intensity: 0.85,
      radius: 40,
      severity: 2,
      visual: true,
      auditory: true,
      context: { store: interior.store.name, loot: interior.store.loot },
    });
    callbacks.onAudioCue?.('ui');
    return true;
  }

  function step(dt: number, controls: ControlState, measure = false): void {
    const evtStart = measure ? performance.now() : 0;
    eventBus.advance(dt);
    stores.step(dt);
    recentFireThreat = Math.max(0, recentFireThreat - dt * 0.4);
    weaponEventCooldown = Math.max(0, weaponEventCooldown - dt);
    aimEventCooldown = Math.max(0, aimEventCooldown - dt);

    if (controls.interact) {
      const carAction = vehicles.interact(player);
      if (carAction.changed) {
        previousPlayer.copy(player.position);
        walkingSpeed = 0;
        callbacks.onAudioCue?.(carAction.entered ? 'enter' : 'leave');
      } else if (!vehicles.active) {
        const hijacked = traffic.hijackNearest(player.position);
        if (hijacked) {
          vehicles.boardSpawned(player, {
            x: hijacked.x,
            y: 0,
            z: hijacked.z,
            heading: hijacked.heading,
            paint: hijacked.paint,
            label: 'Vehículo urbano',
            initialSpeed: Math.min(hijacked.speed, 6),
          });
          npcPopulation.spawnDisplacedDriver({
            x: hijacked.x,
            z: hijacked.z,
            heading: hijacked.heading,
            identity: hijacked.driver,
            threatPos: player.position,
          });
          eventBus.emit({
            type: 'vehicle_hijacked',
            sourceId: 'player',
            targetIds: [hijacked.driver.id],
            position: { x: hijacked.x, y: 0.9, z: hijacked.z },
            intensity: 0.85,
            radius: 44,
            severity: 2,
            visual: true,
            auditory: true,
            context: { driver: hijacked.driver.name },
          });
          previousPlayer.copy(player.position);
          walkingSpeed = 0;
          callbacks.onAudioCue?.('enter');
          callbacks.onNotice?.(`Vehículo tomado a ${hijacked.driver.name}`, 3.0);
        } else {
          startStoreHeist(player.position);
        }
      }
    }

    const activeCar = vehicles.active?.car;
    if (controls.horn && activeCar) {
      callbacks.onAudioCue?.('horn');
      eventBus.emit({
        type: 'horn_honked',
        sourceId: 'player',
        position: { x: activeCar.position.x, y: 0.8, z: activeCar.position.z },
        intensity: 0.55,
        radius: 36,
        severity: 0,
        auditory: true,
      });
    }

    // Weapons, aiming, and real ballistic line-of-fire checks
    ballisticTargetScratch.length = 0;
    for (const agent of npcPopulation.agents) {
      if (agent.recoverTimer > 0) continue;
      ballisticTargetScratch.push({ id: agent.id, x: agent.x, z: agent.z, radius: 0.48, kind: 'npc' });
    }
    for (const car of traffic.vehicles) {
      ballisticTargetScratch.push({ id: car.id, x: car.x, z: car.z, radius: 1.65, kind: 'vehicle' });
    }

    const shooterHeading = controls.aim ? player.aimYaw : player.heading;
    const shot = weapons.step(
      dt,
      controls,
      {
        x: player.position.x,
        y: player.position.y,
        z: player.position.z,
        heading: shooterHeading,
        inVehicle: activeCar !== undefined,
      },
      physics.spatial,
      ballisticTargetScratch,
    );
    aimingNow = shot.aiming;
    player.setAimPose(aimingNow, weapons.equipped);

    if (shot.weaponChanged) {
      callbacks.onAudioCue?.('ui');
      if (weapons.equipped !== 'unarmed' && weaponEventCooldown <= 0) {
        weaponEventCooldown = 2.0;
        eventBus.emit({
          type: 'weapon_visible',
          sourceId: 'player',
          position: { x: player.position.x, y: 1.1, z: player.position.z },
          intensity: weapons.spec.threat,
          radius: 20,
          severity: 1,
          visual: true,
        });
      }
    }
    if (shot.reloaded) callbacks.onAudioCue?.('reload');
    if (shot.empty) callbacks.onAudioCue?.('empty');

    if (shot.aiming) {
      if (aimEventCooldown <= 0) {
        aimEventCooldown = 0.85;
        eventBus.emit({
          type: 'weapon_aimed',
          sourceId: 'player',
          position: { x: player.position.x, y: 1.3, z: player.position.z },
          intensity: 0.85,
          radius: 26,
          severity: 2,
          visual: true,
        });
      }
      const insideStore = stores.findStoreContaining(player.position);
      if (insideStore) {
        npcPopulation.intimidateStoreClerk(insideStore.store.id, player.position, eventBus);
        if (!stores.activeHeist) {
          startStoreHeist(player.position);
        }
      }
    }

    if (shot.fired) {
      callbacks.onAudioCue?.('shot');
      recentFireThreat = 1.0;
      eventBus.emit({
        type: 'gunshot_fired',
        sourceId: 'player',
        targetIds: shot.hitTarget ? [shot.hitTarget.id] : undefined,
        position: { x: player.position.x, y: 1.3, z: player.position.z },
        intensity: 1,
        radius: weapons.spec.soundRadius,
        severity: 3,
        visual: true,
        auditory: true,
        context: { weapon: weapons.equipped },
      });
      npcPopulation.intimidateArea(player.position, 14, eventBus);

      if (shot.hitTarget?.kind === 'npc') {
        npcPopulation.applyDamage(shot.hitTarget.id, weapons.spec.damage, player.position, eventBus);
      } else if (shot.hitTarget?.kind === 'vehicle') {
        eventBus.emit({
          type: 'threat_appeared',
          sourceId: 'player',
          targetIds: [shot.hitTarget.id],
          position: { x: shot.endPoint.x, y: 0.9, z: shot.endPoint.z },
          intensity: 0.9,
          radius: 34,
          severity: 2,
          visual: true,
          auditory: true,
        });
      }
      // Nearby patrols within clear sight or close gunfire distance immediately respond
      for (const unit of police.units) {
        const d = Math.hypot(unit.x - player.position.x, unit.z - player.position.z);
        if (d < 46 && (d < 24 || physics.spatial.clearLine(unit, player.position))) {
          police.wanted.report(player.position, 1);
          break;
        }
      }
    }

    // Step progressive store heist if active
    const heistStep = stores.stepHeist(dt, player.position, {
      aimingWeapon: shot.aiming,
      recentShot: shot.fired,
    });
    if (heistStep) {
      if (heistStep.status === 'in_progress') {
        callbacks.onNotice?.(
          `Asaltando ${heistStep.store.name} · ${Math.round(heistStep.progress * 100)} %`,
          0.35,
        );
      } else if (heistStep.status === 'completed') {
        cash += heistStep.loot;
        callbacks.onAudioCue?.('cash');
        callbacks.onNotice?.(
          `Asalto completado en ${heistStep.store.name} · +$${heistStep.loot.toLocaleString('es')}`,
          4.2,
        );
        eventBus.emit({
          type: 'robbery_finished',
          sourceId: 'player',
          targetIds: [heistStep.store.id],
          position: { x: player.position.x, y: 0.9, z: player.position.z },
          intensity: 0.8,
          radius: 36,
          severity: 2,
          visual: true,
          auditory: true,
          context: { store: heistStep.store.name, loot: heistStep.loot },
        });
        npcPopulation.releaseStoreClerk(heistStep.store.id, player.position);
      } else {
        if (heistStep.loot > 0) {
          cash += heistStep.loot;
          callbacks.onAudioCue?.('cash');
          callbacks.onNotice?.(
            `Saliste de ${heistStep.store.name} · +$${heistStep.loot.toLocaleString('es')}`,
            3.2,
          );
        } else {
          callbacks.onNotice?.(`Asalto cancelado en ${heistStep.store.name}`, 2.5);
        }
        eventBus.emit({
          type: 'robbery_finished',
          sourceId: 'player',
          targetIds: [heistStep.store.id],
          position: { x: player.position.x, y: 0.9, z: player.position.z },
          intensity: 0.55,
          radius: 28,
          severity: 1,
        });
        npcPopulation.releaseStoreClerk(heistStep.store.id, player.position);
      }
    }

    const position = currentFocus();
    if (controls.challenge) {
      police.wanted.report(position);
      callbacks.onAudioCue?.('ui');
    }
    if (forceWanted !== undefined) {
      police.wanted.report(position, 0, forceWanted);
      forceWanted = undefined;
    }
    if (measure) timings.eventsMs = performance.now() - evtStart;

    Object.assign(playerObstacle, { x: position.x, z: position.z, radius: activeCar ? 1.45 : 0.65 });
    trafficObstacleScratch.length = 0;
    trafficObstacleScratch.push(playerObstacle);
    for (const entry of vehicles.all) {
      if (entry.car !== activeCar) {
        trafficObstacleScratch.push({ x: entry.car.position.x, z: entry.car.position.z, radius: 2.15 });
      }
    }
    for (const unit of police.units) {
      trafficObstacleScratch.push({ x: unit.x, z: unit.z, radius: 1.9 });
    }
    for (const crossing of npcPopulation.getCrossingObstacles()) {
      trafficObstacleScratch.push(crossing);
    }

    const trafficStart = measure ? performance.now() : 0;
    traffic.step(dt, position, trafficObstacleScratch, hour);
    if (measure) timings.trafficMs = performance.now() - trafficStart;

    const policeStart = measure ? performance.now() : 0;
    police.step(
      dt,
      {
        x: position.x,
        z: position.z,
        speed: activeCar ? activeCar.speed : walkingSpeed,
        heading: activeCar ? activeCar.heading : player.heading,
      },
      {
        onFire: (shooter, hitPlayer, damage) => {
          callbacks.onAudioCue?.('shot');
          const dx = position.x - shooter.x;
          const dz = position.z - shooter.z;
          const dist = Math.max(0.5, Math.hypot(dx, dz));
          const dirAngle = Math.atan2(dx / dist, -(dz / dist));
          weapons.addTracer(shooter.x + dx * 0.5, 1.25, shooter.z + dz * 0.5, dirAngle, dist);
          eventBus.emit({
            type: 'gunshot_fired',
            sourceId: 'police',
            targetIds: ['player'],
            position: { x: shooter.x, y: 1.25, z: shooter.z },
            intensity: 0.9,
            radius: 52,
            severity: 3,
            visual: true,
            auditory: true,
          });
          if (hitPlayer) {
            health = Math.max(0, health - damage);
            recovery = 12;
            callbacks.onAudioCue?.('impact');
          }
        },
      },
    );
    if (measure) timings.policeMs = performance.now() - policeStart;

    if (police.wanted.level > previousWantedLevel) {
      eventBus.emit({
        type: 'police_alerted',
        position: { x: position.x, y: 1, z: position.z },
        intensity: 0.7 + police.wanted.level * 0.1,
        radius: 55,
        severity: police.wanted.level,
        auditory: true,
      });
    }
    if (police.wanted.state !== previousWantedState) {
      if (police.wanted.state === 'Persecución') {
        eventBus.emit({
          type: 'pursuit_started',
          targetIds: ['player'],
          position: { x: position.x, y: 1, z: position.z },
          intensity: 0.9,
          radius: 65,
          severity: police.wanted.level,
          visual: true,
          auditory: true,
        });
      } else if (previousWantedState === 'Persecución' && police.wanted.level === 0) {
        eventBus.emit({
          type: 'pursuit_ended',
          targetIds: ['player'],
          position: { x: position.x, y: 1, z: position.z },
          intensity: 0.3,
          radius: 30,
          severity: 0,
        });
      }
    }
    previousWantedState = police.wanted.state;
    previousWantedLevel = police.wanted.level;

    const physStart = measure ? performance.now() : 0;
    physicalTraffic.update([...traffic.vehicles, ...police.units], position);
    if (activeCar) {
      vehicles.prepareStep(dt, controls);
    } else {
      if (controls.jump && player.grounded) callbacks.onAudioCue?.('jump');
      player.prepareStep(dt, controls);
    }
    physics.step(dt);
    if (activeCar) {
      vehicles.finishStep(dt);
      throttle = activeCar.engineLoad;
    } else {
      player.finishStep(dt);
      walkingSpeed = Math.hypot(player.position.x - previousPlayer.x, player.position.z - previousPlayer.z) / dt;
      previousPlayer.copy(player.position);
      throttle = 0;
    }
    if (measure) timings.physicsMs = performance.now() - physStart;

    syncEntities(position.x, position.z);

    movingVehiclesScratch.length = 0;
    for (const entry of vehicles.all) {
      movingVehiclesScratch.push({
        x: entry.car.position.x,
        z: entry.car.position.z,
        speed: entry.car.speed,
        heading: entry.car.heading,
        radius: 1.5,
      });
    }
    for (const car of traffic.vehicles) {
      movingVehiclesScratch.push({
        x: car.x,
        z: car.z,
        speed: car.speed,
        heading: car.heading,
        radius: 1.45,
      });
    }

    npcPopulation.step({
      dt,
      focus: position,
      hour,
      eventBus,
      entities,
      spatial: physics.spatial,
      policeNearby: police.units.length > 0 && police.wanted.level > 0,
      vehicles: movingVehiclesScratch,
      onReportCrime: (location, severity) => {
        police.wanted.report(location, severity);
      },
      onHitPlayer: (damage) => {
        if (!activeCar) {
          health = Math.max(0, health - damage);
          recovery = 12;
          callbacks.onAudioCue?.('impact');
        }
      },
    });
    entities.updateSpatialAndTiers(position.x, position.z);

    impactCooldown -= dt;
    recovery -= dt;
    if (activeCar && activeCar.impact > 3.1 && impactCooldown <= 0) {
      health = Math.max(0, health - Math.min(40, activeCar.impact * 2.1));
      impactCooldown = 0.48;
      recovery = 12;
      callbacks.onAudioCue?.('impact');
      eventBus.emit({
        type: 'vehicle_collision',
        sourceId: vehicles.active?.id ?? 'rayo-gt',
        position: { x: activeCar.position.x, y: 0.7, z: activeCar.position.z },
        intensity: Math.min(1, activeCar.impact / 10),
        radius: 45,
        severity: activeCar.impact > 6 ? 2 : 1,
        visual: true,
        auditory: true,
        context: { impact: Number(activeCar.impact.toFixed(2)) },
      });
      if (activeCar.impact > 6) police.reportImpact(activeCar.position);
    }
    if (recovery <= 0) health = Math.min(100, health + dt * 4);
    if (health <= 0 || police.takeDetention()) {
      reset(initialHour);
      callbacks.onAudioCue?.('impact');
    }
    hour = (hour + (dt * 24) / gameConfig.secondsPerDay) % 24;
  }

  function render(alpha: number, visualDt: number, elapsed: number): void {
    vehicles.setLights(hour < 7 || hour > 18.5);
    vehicles.render(alpha, visualDt);
    player.render(alpha, visualDt);
    weapons.render();
    traffic.render(alpha, elapsed);
    npcPopulation.render(alpha);
    police.render(alpha, visualDt, elapsed, hour);
    stores.render(elapsed);
  }

  function getInteractionPrompt(): InteractionPrompt {
    const canVehicleInteract = vehicles.canInteract(player);
    if (canVehicleInteract) return { canInteract: true };

    if (!vehicles.active) {
      if (stores.activeHeist) return { canInteract: false };
      const hijackCandidate = traffic.findHijackCandidate(player.position);
      if (hijackCandidate) {
        return {
          canInteract: true,
          label: 'Tomar vehículo',
          touchLabel: 'Tomar',
        };
      }
      const nearbyStore = stores.findNearby(player.position);
      if (nearbyStore) {
        return {
          canInteract: true,
          label: nearbyStore.available
            ? `Asaltar ${nearbyStore.store.name}`
            : `${nearbyStore.store.name} (${Math.ceil(nearbyStore.cooldown)} s)`,
          touchLabel: nearbyStore.available ? 'Asaltar' : 'Cerrada',
        };
      }
    }
    return { canInteract: false };
  }

  syncEntities(player.position.x, player.position.z);

  return {
    eventBus,
    entities,
    pedestrianGraph,
    vehicles,
    weapons,
    traffic,
    police,
    stores,
    npcPopulation,
    timings,
    get hour() { return hour; },
    set hour(value: number) { hour = ((value % 24) + 24) % 24; },
    get health() { return health; },
    get cash() { return cash; },
    get aiming() { return aimingNow; },
    get armed() { return weapons.equipped !== 'unarmed'; },
    get weaponLabel() { return weapons.hudLabel(); },
    get walkingSpeed() { return walkingSpeed; },
    get throttle() { return throttle; },
    get driving() { return vehicles.active !== undefined; },
    get activeVehicle() { return vehicles.active?.car; },
    get focusPosition() { return currentFocus(); },
    get focusHeading() { return vehicles.active ? vehicles.active.car.heading : player.heading; },
    setForcedWanted(level: number) { forceWanted = level; },
    step,
    render,
    reset,
    getInteractionPrompt,
    dispose() {
      physicalTraffic.reset();
      npcPopulation.dispose();
      stores.dispose();
      weapons.dispose();
      police.reset();
      traffic.dispose();
      vehicles.dispose();
      eventBus.reset();
      entities.clear();
    },
  };
}
