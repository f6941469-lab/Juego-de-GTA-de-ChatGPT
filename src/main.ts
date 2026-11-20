import { PerspectiveCamera, Scene, Vector3 } from 'three'
import { createPolice } from './ai/police/police'
import { createTraffic } from './ai/traffic/traffic'
import { createGameAudio } from './audio/audio'
import { gameConfig, type Quality } from './config/game'
import { WorldEventBus } from './core/events'
import { FixedLoop } from './core/fixed-loop'
import { createInput } from './core/input'
import { formatSimulationInspector, type SystemTimings } from './debug/inspector'
import { createDebugOverlay } from './debug/overlay'
import { FrameStats } from './debug/stats'
import { buildPedestrianGraph } from './navigation/pedestrian-graph'
import { loadAudioPreference, loadQuality, saveAudioPreference, saveQuality } from './persistence/preferences'
import { createPhysics } from './physics/physics'
import { createVehicleObstacles } from './physics/vehicle-obstacles'
import { createPlayer } from './player/player'
import { createAtmosphere, createContactShadows, createRenderer, type ContactShadowSource } from './renderer/renderer'
import { EntityRegistry } from './simulation/entities'
import { createUI } from './ui/ui'
import { createVehicle } from './vehicles/vehicle'
import { buildDistrict } from './world/district'
import { getDistrictAt } from './world/generation/layout'
import { createStores } from './world/stores'

async function startGame() {
  const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')
  if (!canvas) throw new Error('Falta el lienzo del juego')

  let mode: 'loading' | 'start' | 'playing' | 'paused' | 'error' = 'loading'
  let hour = gameConfig.initialHour
  let debug = false
  let inspectorDebug = false
  let geometryDebug = false
  let forceWanted: number | undefined
  let alpha = 1
  let elapsed = 0
  let lastTime = performance.now()
  let video: ReturnType<typeof createRenderer> | undefined
  let player: ReturnType<typeof createPlayer>
  let resetRun: (() => void) | undefined

  const loop = new FixedLoop(gameConfig.fixedStep)
  const stats = new FrameStats()
  const audio = createGameAudio()
  const ui = createUI({
    onPlay: play,
    onPause: pause,
    onQuality: setQuality,
    onHour: (value) => { hour = ((value % 24) + 24) % 24 },
    onVolume: (volume, muted) => {
      audio.setVolume(volume)
      audio.setMuted(muted)
      void saveAudioPreference({ volume, muted })
    },
    onReset: () => {
      resetRun?.()
      loop.reset()
      alpha = 1
      hour = gameConfig.initialHour
      audio.cue('ui')
    },
  })
  ui.setMode('loading')

  const input = createInput(canvas, {
    onLook: (dx, dy) => player?.look(dx, dy),
    onPause: pause,
    onDebug: () => {
      debug = !debug
      if (debug) inspectorDebug = false
      ui.setDebug(debug ? 'Midiendo fotogramas…' : null)
    },
    onDebugOverlay: () => { geometryDebug = !geometryDebug },
    onDebugInspector: () => {
      inspectorDebug = !inspectorDebug
      if (inspectorDebug) debug = false
      ui.setDebug(inspectorDebug ? 'Inspeccionando simulación…' : null)
    },
    onDebugWanted: (level) => { if (debug || inspectorDebug) forceWanted = level },
  })

  function setQuality(quality: Quality) {
    if (!video) return
    video.setQuality(quality)
    void saveQuality(quality)
  }

  function play() {
    if (mode !== 'start' && mode !== 'paused') return
    mode = 'playing'
    ui.setMode(mode)
    input.setActive(true)
    input.capture()
    audio.setPaused(false)
    void audio.unlock().then(() => audio.cue('ui')).catch(() => {})
  }

  function pause() {
    if (mode !== 'playing') return
    mode = 'paused'
    input.setActive(false)
    ui.setMode(mode)
    audio.setPaused(true)
    audio.cue('ui')
  }

  try {
    const scene = new Scene()
    const camera = new PerspectiveCamera(58, 1, 0.08, 650)
    const intro = new PerspectiveCamera(54, 1, 0.08, 650)
    const display = createRenderer(canvas)
    video = display
    const district = buildDistrict(scene, gameConfig.seed)
    const atmosphere = createAtmosphere(scene, hour)
    const [physics, quality, audioPreference] = await Promise.all([
      createPhysics(district.colliders), loadQuality(), loadAudioPreference(),
    ])
    const eventBus = new WorldEventBus()
    const entities = new EntityRegistry()
    const pedestrianGraph = buildPedestrianGraph(physics.spatial, district.map.stores ?? [])
    player = createPlayer(scene, camera, physics, district.spawn)
    const vehicle = createVehicle(scene, physics, { x: 3.9, y: 0, z: 22 })
    const traffic = createTraffic(scene, district.map, gameConfig.seed)
    const police = createPolice(scene, traffic.graph, physics.spatial)
    const stores = createStores(scene, district.map.stores ?? [])
    const physicalTraffic = createVehicleObstacles(physics)
    const shadows = createContactShadows(scene, 10)
    const overlay = createDebugOverlay(scene)
    const previousPlayer = new Vector3().copy(player.position)
    const timings: SystemTimings = { physicsMs: 0, trafficMs: 0, policeMs: 0, eventsMs: 0 }
    let health = 100
    let impactCooldown = 0
    let recovery = 0
    let walkingSpeed = 0
    let throttle = 0
    let audioTimer = 0
    let overlayTimer = 0
    let inspectorTimer = 0
    let noticeText: string | null = null
    let noticeTimer = 0
    let previousWantedState = police.wanted.state
    let previousWantedLevel = police.wanted.level

    function syncEntities(focusX: number, focusZ: number) {
      entities.clear()
      entities.upsert({
        id: 'player',
        kind: 'player',
        position: { x: player.position.x, y: player.position.y, z: player.position.z },
        heading: player.heading,
        velocity: { x: 0, z: 0 },
        radius: 0.45,
        active: !vehicle.active,
        tier: 'high',
        threatLevel: police.wanted.level > 0 ? Math.min(1, police.wanted.level * 0.25) : 0,
        vehicleId: vehicle.active ? 'rayo-gt' : undefined,
      })
      entities.upsert({
        id: 'rayo-gt',
        kind: 'vehicle',
        position: { x: vehicle.position.x, y: vehicle.position.y, z: vehicle.position.z },
        heading: vehicle.heading,
        velocity: {
          x: Math.sin(vehicle.heading) * vehicle.speed,
          z: -Math.cos(vehicle.heading) * vehicle.speed,
        },
        radius: 2.1,
        active: true,
        tier: 'high',
        threatLevel: vehicle.active && vehicle.speed > 14 ? 0.35 : 0,
        occupants: vehicle.active ? ['player'] : undefined,
      })
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
        })
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
        })
      }
      entities.updateSpatialAndTiers(focusX, focusZ)
    }

    resetRun = () => {
      physicalTraffic.reset()
      vehicle.reset(player)
      player.reset()
      police.reset()
      stores.reset()
      eventBus.reset()
      previousPlayer.copy(player.position)
      health = 100
      impactCooldown = recovery = walkingSpeed = throttle = 0
      noticeText = null
      noticeTimer = 0
      previousWantedState = police.wanted.state
      previousWantedLevel = police.wanted.level
      forceWanted = undefined
      syncEntities(player.position.x, player.position.z)
    }

    syncEntities(player.position.x, player.position.z)

    ui.setWorld(district.map)
    const activeQuality = quality ?? gameConfig.defaultQuality
    display.setQuality(activeQuality)
    ui.setQuality(activeQuality)
    const sound = audioPreference ?? { volume: 0.35, muted: false }
    audio.setVolume(sound.volume)
    audio.setMuted(sound.muted)
    ui.setVolume(sound.volume, sound.muted)

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth)
      const height = Math.max(1, canvas.clientHeight)
      display.resize(width, height)
      camera.aspect = intro.aspect = width / height
      camera.updateProjectionMatrix()
      intro.updateProjectionMatrix()
    }
    new ResizeObserver(resize).observe(canvas)
    resize()

    const introFocus = new Vector3(-12, 7.2, -32)
    const playerObstacle = { x: 0, z: 0, radius: 0.6 }
    const carObstacle = { x: 0, z: 0, radius: 2.15 }
    const obstacles = [playerObstacle, carObstacle]

    function step(dt: number) {
      const measure = debug || inspectorDebug
      const evtStart = measure ? performance.now() : 0
      eventBus.advance(dt)
      stores.step(dt)
      if (noticeTimer > 0) {
        noticeTimer -= dt
        if (noticeTimer <= 0) noticeText = null
      }
      const controls = input.read()
      if (controls.interact) {
        if (vehicle.interact(player)) {
          previousPlayer.copy(player.position)
          walkingSpeed = 0
          audio.cue(vehicle.active ? 'enter' : 'leave')
        } else if (!vehicle.active) {
          const robbery = stores.rob(player.position)
          if (robbery) {
            police.wanted.report({ x: robbery.store.doorX, z: robbery.store.doorZ }, 1)
            eventBus.emit({
              type: 'robbery_started',
              sourceId: 'player',
              targetIds: [robbery.store.id],
              position: { x: robbery.store.doorX, y: 0.9, z: robbery.store.doorZ },
              intensity: 0.85,
              radius: 42,
              severity: 2,
              visual: true,
              auditory: true,
              context: { store: robbery.store.name, loot: robbery.loot },
            })
            audio.cue('ui')
            noticeText = `Asalto en ${robbery.store.name} · Botín $${robbery.loot.toLocaleString('es')}`
            noticeTimer = 4.2
          }
        }
      }
      if (controls.horn && vehicle.active) {
        audio.cue('horn')
        eventBus.emit({
          type: 'horn_honked',
          sourceId: 'player',
          position: { x: vehicle.position.x, y: 0.8, z: vehicle.position.z },
          intensity: 0.55,
          radius: 36,
          severity: 0,
          auditory: true,
        })
      }
      const position = vehicle.active ? vehicle.position : player.position
      if (controls.challenge) { police.wanted.report(position); audio.cue('ui') }
      if (forceWanted !== undefined) {
        police.wanted.report(position, 0, forceWanted)
        forceWanted = undefined
      }
      if (measure) timings.eventsMs = performance.now() - evtStart

      Object.assign(playerObstacle, { x: position.x, z: position.z, radius: vehicle.active ? 1.45 : 0.65 })
      carObstacle.x = vehicle.position.x
      carObstacle.z = vehicle.position.z
      const trafficObstacles = vehicle.active ? [playerObstacle] : [...obstacles]
      for (const unit of police.units) trafficObstacles.push({ x: unit.x, z: unit.z, radius: 1.9 })

      const trafficStart = measure ? performance.now() : 0
      traffic.step(dt, position, trafficObstacles, hour)
      if (measure) timings.trafficMs = performance.now() - trafficStart

      const policeStart = measure ? performance.now() : 0
      police.step(dt, {
        x: position.x, z: position.z,
        speed: vehicle.active ? vehicle.speed : walkingSpeed,
        heading: vehicle.active ? vehicle.heading : player.heading,
      })
      if (measure) timings.policeMs = performance.now() - policeStart

      if (police.wanted.level > previousWantedLevel) {
        eventBus.emit({
          type: 'police_alerted',
          position: { x: position.x, y: 1, z: position.z },
          intensity: 0.7 + police.wanted.level * 0.1,
          radius: 55,
          severity: police.wanted.level,
          auditory: true,
        })
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
          })
        } else if (previousWantedState === 'Persecución' && police.wanted.level === 0) {
          eventBus.emit({
            type: 'pursuit_ended',
            targetIds: ['player'],
            position: { x: position.x, y: 1, z: position.z },
            intensity: 0.3,
            radius: 30,
            severity: 0,
          })
        }
      }
      previousWantedState = police.wanted.state
      previousWantedLevel = police.wanted.level

      const physStart = measure ? performance.now() : 0
      physicalTraffic.update([...traffic.vehicles, ...police.units], position)
      if (vehicle.active) {
        vehicle.prepareStep(dt, controls)
      } else {
        if (controls.jump && player.grounded) audio.cue('jump')
        player.prepareStep(dt, controls)
      }
      // Centralized single Rapier step per fixed simulation tick (VB-001).
      physics.step(dt)
      if (vehicle.active) {
        vehicle.finishStep(dt)
        throttle = vehicle.engineLoad
      } else {
        player.finishStep(dt)
        walkingSpeed = Math.hypot(player.position.x - previousPlayer.x, player.position.z - previousPlayer.z) / dt
        previousPlayer.copy(player.position)
        throttle = 0
      }
      if (measure) timings.physicsMs = performance.now() - physStart

      syncEntities(position.x, position.z)

      impactCooldown -= dt
      recovery -= dt
      if (vehicle.active && vehicle.impact > 3.1 && impactCooldown <= 0) {
        health = Math.max(0, health - Math.min(40, vehicle.impact * 2.1))
        impactCooldown = 0.48
        recovery = 12
        audio.cue('impact')
        eventBus.emit({
          type: 'vehicle_collision',
          sourceId: 'rayo-gt',
          position: { x: vehicle.position.x, y: 0.7, z: vehicle.position.z },
          intensity: Math.min(1, vehicle.impact / 10),
          radius: 45,
          severity: vehicle.impact > 6 ? 2 : 1,
          visual: true,
          auditory: true,
          context: { impact: Number(vehicle.impact.toFixed(2)) },
        })
        if (vehicle.impact > 6) police.reportImpact(vehicle.position)
      }
      if (recovery <= 0) health = Math.min(100, health + dt * 4)
      if (health <= 0 || police.takeDetention()) {
        resetRun?.()
        audio.cue('impact')
      }
      hour = (hour + dt * 24 / gameConfig.secondsPerDay) % 24
    }

    function frame(now: number) {
      const dt = Math.max(0, (now - lastTime) / 1000)
      const visualDt = Math.min(dt, 0.1)
      lastTime = now
      if (mode !== 'paused') elapsed += visualDt
      if (mode === 'playing') alpha = loop.advance(dt, step)

      const startView = mode === 'start'
      if (startView) {
        intro.position.set(-3.3 + Math.sin(elapsed * 0.16) * 0.65, 6.3, 41)
        intro.lookAt(introFocus)
      }
      vehicle.setLights(hour < 7 || hour > 18.5)
      vehicle.render(alpha, visualDt)
      player.render(alpha, visualDt)
      traffic.render(alpha, elapsed)
      police.render(alpha, visualDt, elapsed, hour)
      stores.render(elapsed)
      const position = vehicle.active ? vehicle.position : player.position
      const heading = vehicle.active ? vehicle.heading : player.heading
      const focus = startView ? intro.position : position
      atmosphere.update(hour, focus, elapsed)
      district.update(elapsed, hour, focus)

      const nearby = [...traffic.vehicles, ...police.units].filter((unit) => (unit.x - focus.x) ** 2 + (unit.z - focus.z) ** 2 < 45 ** 2)
      const shadowSources: ContactShadowSource[] = [
        { ...vehicle.position, radiusX: 1.32, radiusZ: 2.45, heading: vehicle.heading },
        ...nearby.map((unit) => ({ x: unit.x, y: 0, z: unit.z, radiusX: 1.15, radiusZ: 2.1, heading: unit.heading })),
      ]
      if (!vehicle.active) shadowSources.unshift({ ...player.position, radiusX: 0.65, radiusZ: 0.55 })
      shadows.update(shadowSources, hour)

      const { x, y, z } = position
      const canVehicleInteract = vehicle.canInteract(player)
      const nearbyStore = !vehicle.active && !canVehicleInteract ? stores.findNearby(player.position) : null
      const canInteract = canVehicleInteract || Boolean(nearbyStore)
      const interactionLabel = canVehicleInteract ? undefined
        : nearbyStore
          ? (nearbyStore.available ? `Asaltar ${nearbyStore.store.name}` : `${nearbyStore.store.name} (${Math.ceil(nearbyStore.cooldown)} s)`)
          : undefined
      const touchInteractionLabel = canVehicleInteract ? undefined
        : nearbyStore ? (nearbyStore.available ? 'Asaltar' : 'Cerrada') : undefined

      ui.update({
        x, z, heading, hour, district: getDistrictAt(x, z), health,
        driving: vehicle.active, canInteract, interactionLabel, touchInteractionLabel, notice: noticeText,
        stores: stores.getMarkers(),
        speed: vehicle.speed * 3.6, wanted: police.wanted.level, policeStatus: police.wanted.state,
      })

      audioTimer -= visualDt
      if (mode === 'playing' && audioTimer <= 0) {
        audioTimer = 0.042
        audio.update({
          x, y, z, heading, speed: vehicle.active ? vehicle.speed : walkingSpeed,
          driving: vehicle.active, moving: walkingSpeed > 0.35, throttle, braking: vehicle.braking,
          coastDistance: district.map.water ? Math.abs(x - (district.map.water.x - district.map.water.width / 2)) : 120,
          police: police.wanted.level ? police.units : [], traffic: traffic.vehicles,
        })
      }

      overlay.visible = geometryDebug
      overlayTimer -= visualDt
      if (geometryDebug && overlayTimer <= 0) {
        overlayTimer = 0.25
        overlay.update(district.colliders, [...traffic.routes, ...police.routes], position, pedestrianGraph)
      }
      const renderStart = debug ? performance.now() : 0
      display.render(scene, startView ? intro : camera, now, mode === 'playing')
      if (debug) {
        const reading = stats.sample(dt, performance.now() - renderStart, display.renderer, district.colliders.length, entities.size)
        const timing = display.getFrameTiming()
        const sectors = district.stats()
        if (reading) ui.setDebug([
          reading,
          `${timing.frameMs?.toFixed(1) ?? '—'} ms cuadro · ${timing.pixelRatio.toFixed(2)}× píxeles`,
          `${sectors.loaded}/${sectors.total} sectores · ${sectors.detailed} detallados`,
          `${traffic.count} tráfico · ${police.units.length} patrullas · ${police.wanted.state}`,
          `Posición: ${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}`,
        ].join('\n'))
      } else if (inspectorDebug) {
        inspectorTimer -= visualDt
        if (inspectorTimer <= 0) {
          inspectorTimer = 0.2
          ui.setDebug(formatSimulationInspector({
            entities,
            events: eventBus,
            timings,
            wantedLevel: police.wanted.level,
            wantedState: police.wanted.state,
            lastKnown: police.wanted.lastKnown,
          }))
        }
      }
      requestAnimationFrame(frame)
    }

    mode = 'start'
    lastTime = performance.now()
    frame(lastTime)
    ui.setMode(mode)
  } catch (error) {
    mode = 'error'
    console.error('Viceblock no pudo iniciar', error)
    ui.setMode(mode, video
      ? 'No se pudo cargar el distrito. Vuelve a cargar la página para reintentar.'
      : 'Viceblock necesita WebGL 2. Activa la aceleración gráfica y vuelve a cargar.')
  }
}

void startGame()
