import { PerspectiveCamera, Scene, Vector3, Mesh, InstancedMesh, type Material, type BufferGeometry, Texture } from 'three'
import { createAudio } from './audio/audio'
import { gameConfig } from './config/game'
import type { Quality } from './config/game'
import { FixedLoop } from './core/fixed-loop'
import { createInput, type Command } from './core/input'
import { FrameStats } from './debug/stats'
import { loadQuality, saveQuality } from './persistence/preferences'
import { createPhysics } from './physics/physics'
import { createPlayer } from './player/player'
import { createAtmosphere, createRenderer } from './renderer/renderer'
import { createUI } from './ui/ui'
import { createGameplayUI } from './ui/gameplay'
import { createSession, type Session } from './simulation/session'
import type { Physics } from './physics/physics'
import { buildDistrict } from './world/district'

async function startGame() {
  const canvas = document.querySelector<HTMLCanvasElement>('#game-canvas')
  if (!canvas) throw new Error('Falta el lienzo del juego')

  let mode: 'loading' | 'start' | 'playing' | 'paused' | 'error' = 'loading'
  let hour = gameConfig.initialHour
  let debug = false
  let alpha = 1
  let elapsed = 0
  let lastTime = performance.now()
  let video: Awaited<ReturnType<typeof createRenderer>> | undefined
  let player: ReturnType<typeof createPlayer>
  let session: Session | undefined
  let physics: Physics | undefined
  let scene: Scene | undefined
  let resizeObserver: ResizeObserver | undefined
  let frameId = 0
  let disposed = false
  const audio = createAudio()
  const gameplayUI = createGameplayUI(command, (index) => {
    if (mode === 'playing') session?.select(index)
  })

  const loop = new FixedLoop(gameConfig.fixedStep)
  const stats = new FrameStats()
  const ui = createUI({
    onPlay: play,
    onPause: pause,
    onQuality: setQuality,
    onHour: (value) => { hour = ((value % 24) + 24) % 24 },
    onReset: () => {
      if (!player) return
      session?.reset()
      loop.reset()
      alpha = 1
      hour = gameConfig.initialHour
    },
  })
  ui.setMode('loading')

  const input = createInput(canvas, {
    onLook: (dx, dy) => player?.look(dx, dy),
    onPause: pause,
    onCommand: command,
    onDebug: () => {
      debug = !debug
      ui.setDebug(debug ? 'Midiendo fotogramas…' : null)
    },
  })

  function command(action: Command) {
    if (mode !== 'playing' || !session) return
    const previous = session.overlay
    session.command(action)
    if (previous !== 'world' && session.overlay === 'world') input.capture()
  }

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
    audio.unlock()
    audio.pause(false)
  }

  function pause() {
    if (mode !== 'playing') return
    mode = 'paused'
    session?.closeOverlay()
    input.setActive(false)
    audio.pause(true)
    ui.setMode(mode)
  }

  try {
    const worldScene = new Scene()
    scene = worldScene
    const camera = new PerspectiveCamera(58, 1, 0.08, 650)
    const intro = new PerspectiveCamera(54, 1, 0.08, 650)
    const display = await createRenderer(canvas)
    video = display
    const district = buildDistrict(worldScene, gameConfig.seed)
    const atmosphere = createAtmosphere(worldScene, hour)
    const [worldPhysics, quality] = await Promise.all([
      createPhysics(district.colliders),
      loadQuality(),
    ])
    physics = worldPhysics
    if (disposed) { physics.dispose(); return }
    player = createPlayer(worldScene, camera, physics, district.spawn)
    session = createSession(worldScene, camera, physics, district.colliders, player, audio, (context) => input.setContext(context))
    ui.setWorld(district.map)
    const activeQuality = quality ?? gameConfig.defaultQuality
    display.setQuality(activeQuality)
    ui.setQuality(activeQuality)

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth)
      const height = Math.max(1, canvas.clientHeight)
      display.resize(width, height)
      camera.aspect = intro.aspect = width / height
      camera.updateProjectionMatrix()
      intro.updateProjectionMatrix()
    }
    resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    resize()

    const introFocus = new Vector3(-12, 7.2, -32)
    function frame(now: number) {
      const dt = Math.max(0, (now - lastTime) / 1000)
      lastTime = now
      if (mode !== 'paused') elapsed += Math.min(dt, 0.1)
      const simulationStart = debug ? performance.now() : 0
      if (mode === 'playing') {
        alpha = loop.advance(dt, (step) => {
          session!.step(step, input.read())
          hour = (hour + step * 24 / gameConfig.secondsPerDay) % 24
        })
      }
      const simulationMs = debug ? performance.now() - simulationStart : 0

      const startView = mode === 'start'
      if (startView) {
        intro.position.set(-3.3 + Math.sin(elapsed * 0.16) * 0.65, 6.3, 41)
        intro.lookAt(introFocus)
      }
      const animationDt = mode === 'playing' ? Math.min(dt, 0.1) : 0
      player.render(alpha, animationDt)
      session!.render(alpha, animationDt)
      atmosphere.update(hour, startView ? intro.position : player.position, elapsed)
      district.update(elapsed, hour)
      const { x, y, z } = player.position
      ui.update({ x, z, heading: player.heading, hour })
      gameplayUI.update(session!, hour)

      const renderStart = debug ? performance.now() : 0
      display.render(worldScene, startView ? intro : camera)
      if (debug) {
        const reading = stats.sample(dt, performance.now() - renderStart, display.renderer, physics!.world.colliders.len(), 1 + session!.population.people.length + session!.police.units.length, simulationMs)
        if (reading) ui.setDebug(`${reading}\n${session!.world.count} entidades · ${session!.world.historyCount}/60 muestras · ${session!.navigation.stats.deferred} rutas diferidas\n${display.backend} · ${display.renderer.domElement.width} × ${display.renderer.domElement.height}\nPosición: ${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}`)
      }
      frameId = requestAnimationFrame(safeFrame)
    }

    function safeFrame(now: number) {
      if (disposed) return
      try { frame(now) } catch (error) {
        mode = 'error'
        input.setActive(false)
        audio.pause(true)
        console.error('Viceblock detuvo la simulación', error)
        ui.setMode(mode, 'La simulación se ha detenido. Vuelve a cargar la página para reintentar.')
      }
    }

    await display.prepare(worldScene, intro)
    mode = 'start'
    lastTime = performance.now()
    frame(lastTime)
    ui.setMode(mode)
  } catch (error) {
    mode = 'error'
    console.error('Viceblock no pudo iniciar', error)
    ui.setMode(mode, video
      ? 'No se pudo cargar el distrito. Vuelve a cargar la página para reintentar.'
      : 'Viceblock necesita WebGPU o WebGL 2. Activa la aceleración gráfica y vuelve a cargar.')
  }

  window.addEventListener('pagehide', (event) => {
    if (event.persisted) { pause(); return }
    if (disposed) return
    disposed = true
    cancelAnimationFrame(frameId)
    resizeObserver?.disconnect()
    input.dispose()
    gameplayUI.dispose()
    audio.dispose()
    session?.dispose()
    player?.dispose()
    physics?.dispose()
    const geometries = new Set<BufferGeometry>()
    const materials = new Set<Material>()
    const textures = new Set<Texture>()
    scene?.traverse((object) => {
      if (!(object instanceof Mesh)) return
      if (object instanceof InstancedMesh) object.dispose()
      geometries.add(object.geometry)
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material)
    })
    for (const material of materials) {
      for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value)
      material.dispose()
    }
    textures.forEach((texture) => texture.dispose())
    geometries.forEach((geometry) => geometry.dispose())
    if (scene?.environment instanceof Texture) scene.environment.dispose()
    video?.renderer.dispose()
  })
}

void startGame()
