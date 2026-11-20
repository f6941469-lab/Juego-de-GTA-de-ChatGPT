import { PerspectiveCamera, Scene, Vector3 } from 'three'
import { createGameAudio } from './audio/audio'
import { gameConfig, type Quality } from './config/game'
import { FixedLoop } from './core/fixed-loop'
import { createInput } from './core/input'
import { formatSimulationInspector } from './debug/inspector'
import { createDebugOverlay } from './debug/overlay'
import { FrameStats } from './debug/stats'
import { loadAudioPreference, loadQuality, saveAudioPreference, saveQuality } from './persistence/preferences'
import { createPhysics } from './physics/physics'
import { createPlayer } from './player/player'
import { createAtmosphere, createContactShadows, createRenderer, type ContactShadowSource } from './renderer/renderer'
import { createSimulationEngine } from './simulation/engine'
import { createUI } from './ui/ui'
import { buildDistrict } from './world/district'
import { getDistrictAt } from './world/generation/layout'

async function startGame() {
  const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')
  if (!canvas) throw new Error('Falta el lienzo del juego')

  let mode: 'loading' | 'start' | 'playing' | 'paused' | 'error' = 'loading'
  let debug = false
  let inspectorDebug = false
  let geometryDebug = false
  let alpha = 1
  let elapsed = 0
  let lastTime = performance.now()
  let video: ReturnType<typeof createRenderer> | undefined
  let player: ReturnType<typeof createPlayer>
  let engine: ReturnType<typeof createSimulationEngine> | undefined
  let noticeText: string | null = null
  let noticeTimer = 0
  let frameId = 0
  let disposed = false

  const loop = new FixedLoop(gameConfig.fixedStep)
  const stats = new FrameStats()
  const audio = createGameAudio()
  const ui = createUI({
    onPlay: play,
    onPause: pause,
    onQuality: setQuality,
    onHour: (value) => { if (engine) engine.hour = value },
    onVolume: (volume, muted) => {
      audio.setVolume(volume)
      audio.setMuted(muted)
      void saveAudioPreference({ volume, muted })
    },
    onReset: () => {
      engine?.reset(gameConfig.initialHour)
      loop.reset()
      alpha = 1
      noticeText = null
      noticeTimer = 0
      audio.cue('ui')
    },
    onPhoneCommand: (command) => {
      if (mode === 'playing') engine?.sendPhoneCommand(command)
    },
    onBuy: (index) => { if (mode === 'playing') engine?.buyProduct(index) },
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
    onDebugWanted: (level) => {
      if (debug || inspectorDebug) engine?.setForcedWanted(level)
    },
  })

  function setQuality(quality: Quality) {
    if (!video) return
    video.setQuality(quality)
    void saveQuality(quality)
  }

  function play() {
    if (mode !== 'start' && mode !== 'paused') return
    mode = 'playing'
    loop.reset()
    lastTime = performance.now()
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
    const atmosphere = createAtmosphere(scene, gameConfig.initialHour)
    const [physics, quality, audioPreference] = await Promise.all([
      createPhysics(district.colliders, { streamingRadius: 112, initialFocus: district.spawn }),
      loadQuality(),
      loadAudioPreference(),
    ])
    player = createPlayer(scene, camera, physics, district.spawn)
    const simulation = createSimulationEngine(
      scene,
      physics,
      player,
      district,
      gameConfig.seed,
      gameConfig.initialHour,
      {
        onAudioCue: (cue) => audio.cue(cue),
        onNotice: (text, duration) => {
          noticeText = text ? text : null
          noticeTimer = duration
        },
      },
    )
    engine = simulation
    const shadows = createContactShadows(scene, 14)
    const overlay = createDebugOverlay(scene)

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
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    resize()

    const introFocus = new Vector3(-12, 7.2, -32)
    const focusVector = new Vector3()
    const shadowSources: ContactShadowSource[] = []
    const combinedRoutesScratch: (typeof simulation.traffic.routes)[number][] = []
    let audioTimer = 0
    let overlayTimer = 0
    let inspectorTimer = 0

    function step(dt: number) {
      if (noticeTimer > 0) {
        noticeTimer -= dt
        if (noticeTimer <= 0) noticeText = null
      }
      simulation.step(dt, input.read(), debug || inspectorDebug)
      input.setPhoneOpen(simulation.overlayOpen)
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
      simulation.render(alpha, mode === 'playing' ? visualDt : 0, elapsed)

      const position = simulation.focusPosition
      const heading = simulation.focusHeading
      const hour = simulation.hour
      const focus = startView
        ? intro.position
        : focusVector.set(position.x, position.y, position.z)
      atmosphere.update(hour, focus, elapsed)
      district.update(elapsed, hour, focus)

      shadowSources.length = 0
      if (!simulation.driving) shadowSources.push({ x: player.position.x, y: player.position.y, z: player.position.z, radiusX: 0.65, radiusZ: 0.55 })
      for (const entry of simulation.vehicles.all) {
        const carPos = entry.car.position
        if ((carPos.x - focus.x) ** 2 + (carPos.z - focus.z) ** 2 < 55 ** 2) {
          shadowSources.push({ x: carPos.x, y: carPos.y, z: carPos.z, radiusX: 1.32, radiusZ: 2.45, heading: entry.car.heading })
        }
      }
      for (const unit of simulation.traffic.vehicles) {
        if ((unit.x - focus.x) ** 2 + (unit.z - focus.z) ** 2 < 42 ** 2) {
          shadowSources.push({ x: unit.x, y: 0, z: unit.z, radiusX: 1.15, radiusZ: 2.1, heading: unit.heading })
        }
      }
      for (const unit of simulation.police.units) {
        if ((unit.x - focus.x) ** 2 + (unit.z - focus.z) ** 2 < 42 ** 2) {
          shadowSources.push({ x: unit.x, y: 0, z: unit.z, radiusX: 1.15, radiusZ: 2.1, heading: unit.heading })
        }
      }
      shadows.update(shadowSources, hour)

      const { x, y, z } = position
      const prompt = simulation.getInteractionPrompt()
      const activeCar = simulation.activeVehicle
      const phoneState = simulation.getPhoneSnapshot()
      input.setPhoneOpen(simulation.overlayOpen)

      ui.update({
        x, z, heading, hour, district: getDistrictAt(x, z),
        health: simulation.health,
        cash: simulation.cash,
        weaponLabel: simulation.weaponLabel,
        aiming: simulation.aiming,
        armed: simulation.armed,
        driving: simulation.driving,
        canInteract: prompt.canInteract,
        interactionLabel: prompt.label,
        touchInteractionLabel: prompt.touchLabel,
        notice: noticeText,
        stores: simulation.stores.getMarkers(),
        speed: (activeCar?.speed ?? 0) * 3.6,
        wanted: simulation.police.wanted.level,
        policeStatus: simulation.police.statusLabel,
        phone: phoneState,
        trade: simulation.getTradeSnapshot(),
      })

      audioTimer -= visualDt
      if (mode === 'playing' && audioTimer <= 0) {
        audioTimer = 0.042
        audio.update({
          x, y, z, heading,
          speed: activeCar ? activeCar.speed : simulation.walkingSpeed,
          driving: simulation.driving,
          moving: simulation.walkingSpeed > 0.35,
          throttle: simulation.throttle,
          braking: activeCar?.braking ?? false,
          coastDistance: district.map.water ? Math.abs(x - (district.map.water.x - district.map.water.width / 2)) : 120,
          police: simulation.police.wanted.level ? simulation.police.units : [],
          traffic: simulation.traffic.vehicles,
        })
      }

      overlay.visible = geometryDebug
      overlayTimer -= visualDt
      if (geometryDebug && overlayTimer <= 0) {
        overlayTimer = 0.25
        combinedRoutesScratch.length = 0
        for (const r of simulation.traffic.routes) combinedRoutesScratch.push(r)
        for (const r of simulation.police.routes) combinedRoutesScratch.push(r)
        overlay.update(
          district.colliders,
          combinedRoutesScratch,
          position,
          simulation.pedestrianGraph,
          simulation.npcPopulation.getDebugCones(position),
        )
      }

      const renderStart = debug ? performance.now() : 0
      display.render(scene, startView ? intro : camera, now, mode === 'playing')
      if (debug) {
        const reading = stats.sample(dt, performance.now() - renderStart, display.renderer, physics.activeStaticColliders, simulation.entities.size)
        const timing = display.getFrameTiming()
        const sectors = district.stats()
        if (reading) ui.setDebug([
          reading,
          `${timing.frameMs?.toFixed(1) ?? '—'} ms cuadro · ${timing.pixelRatio.toFixed(2)}× píxeles`,
          `${sectors.loaded}/${sectors.total} sectores · ${sectors.detailed} detallados`,
          `${simulation.traffic.count} tráfico · ${simulation.npcPopulation.count} NPC · ${simulation.police.units.length} patrullas · ${simulation.police.statusLabel}`,
          `Posición: ${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}`,
        ].join('\n'))
      } else if (inspectorDebug) {
        inspectorTimer -= visualDt
        if (inspectorTimer <= 0) {
          inspectorTimer = 0.2
          const nearNpcs = simulation.npcPopulation.agents
            .filter((agent) => (agent.x - x) ** 2 + (agent.z - z) ** 2 <= 45 * 45)
            .slice(0, 6)
            .map((agent) => agent.brain)
          ui.setDebug(formatSimulationInspector({
            entities: simulation.entities,
            events: simulation.eventBus,
            timings: simulation.timings,
            wantedLevel: simulation.police.wanted.level,
            wantedState: simulation.police.wanted.state,
            lastKnown: simulation.police.wanted.lastKnown,
            npcs: nearNpcs,
          }))
        }
      }
      frameId = requestAnimationFrame(safeFrame)
    }

    function safeFrame(now: number) {
      if (disposed) return
      try { frame(now) } catch (error) {
        mode = 'error'; input.setActive(false); audio.setPaused(true)
        console.error('Viceblock detuvo la simulación', error)
        ui.setMode(mode, 'La simulación se ha detenido. Recarga para reintentar.')
      }
    }

    window.addEventListener('pagehide', (event) => {
      if (event.persisted) { pause(); return }
      if (disposed) return
      disposed = true
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      input.dispose()
      overlay.dispose()
      atmosphere.dispose()
      simulation.dispose()
      player.dispose()
      district.dispose()
      physics.dispose()
      display.dispose()
    })

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
