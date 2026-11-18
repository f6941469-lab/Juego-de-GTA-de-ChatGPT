import { PerspectiveCamera, Scene, Vector3 } from 'three'
import { gameConfig } from './config/game'
import type { Quality } from './config/game'
import { FixedLoop } from './core/fixed-loop'
import { createInput } from './core/input'
import { FrameStats } from './debug/stats'
import { loadQuality, saveQuality } from './persistence/preferences'
import { createPhysics } from './physics/physics'
import { createPlayer } from './player/player'
import { createAtmosphere, createRenderer } from './renderer/renderer'
import { createUI } from './ui/ui'
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
  let video: ReturnType<typeof createRenderer> | undefined
  let player: ReturnType<typeof createPlayer>

  const loop = new FixedLoop(gameConfig.fixedStep)
  const stats = new FrameStats()
  const ui = createUI({
    onPlay: play,
    onPause: pause,
    onQuality: setQuality,
    onHour: (value) => { hour = ((value % 24) + 24) % 24 },
    onReset: () => {
      if (!player) return
      player.reset()
      loop.reset()
      alpha = 1
      hour = gameConfig.initialHour
    },
  })
  ui.setMode('loading')

  const input = createInput(canvas, {
    onLook: (dx, dy) => player?.look(dx, dy),
    onPause: pause,
    onDebug: () => {
      debug = !debug
      ui.setDebug(debug ? 'Midiendo fotogramas…' : null)
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
    ui.setMode(mode)
    input.setActive(true)
    input.capture()
  }

  function pause() {
    if (mode !== 'playing') return
    mode = 'paused'
    input.setActive(false)
    ui.setMode(mode)
  }

  try {
    const scene = new Scene()
    const camera = new PerspectiveCamera(58, 1, 0.08, 650)
    const intro = new PerspectiveCamera(54, 1, 0.08, 650)
    const display = createRenderer(canvas)
    video = display
    const district = buildDistrict(scene, gameConfig.seed)
    const atmosphere = createAtmosphere(scene, hour)
    const [physics, quality] = await Promise.all([
      createPhysics(district.colliders),
      loadQuality(),
    ])
    player = createPlayer(scene, camera, physics, district.spawn)
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
    new ResizeObserver(resize).observe(canvas)
    resize()

    const introFocus = new Vector3(-12, 7.2, -32)
    function frame(now: number) {
      const dt = Math.max(0, (now - lastTime) / 1000)
      lastTime = now
      if (mode !== 'paused') elapsed += Math.min(dt, 0.1)
      if (mode === 'playing') {
        alpha = loop.advance(dt, (step) => {
          player.step(step, input.read())
          hour = (hour + step * 24 / gameConfig.secondsPerDay) % 24
        })
      }

      const startView = mode === 'start'
      if (startView) {
        intro.position.set(-3.3 + Math.sin(elapsed * 0.16) * 0.65, 6.3, 41)
        intro.lookAt(introFocus)
      }
      player.render(alpha, Math.min(dt, 0.1))
      atmosphere.update(hour, startView ? intro.position : player.position, elapsed)
      district.update(elapsed, hour)
      const { x, y, z } = player.position
      ui.update({ x, z, heading: player.heading, hour })

      const renderStart = debug ? performance.now() : 0
      display.render(scene, startView ? intro : camera)
      if (debug) {
        const reading = stats.sample(dt, performance.now() - renderStart, display.renderer, district.colliders.length)
        if (reading) ui.setDebug(`${reading}\nPosición: ${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}`)
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
