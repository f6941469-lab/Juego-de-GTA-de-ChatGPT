import { burst, filter, gain, noiseBuffer, noiseLoop, oscillator, smooth, sweep } from './synths/signals'

export interface SoundSource {
  id?: string | number
  x: number
  z: number
  speed?: number
}

export interface AudioFrame {
  x: number
  y: number
  z: number
  heading: number
  speed: number
  driving: boolean
  moving: boolean
  throttle: number
  braking: boolean
  coastDistance: number
  rain?: number
  police: readonly SoundSource[]
  traffic: readonly SoundSource[]
}

type Cue =
  | 'enter'
  | 'leave'
  | 'jump'
  | 'horn'
  | 'impact'
  | 'ui'
  | 'shot'
  | 'reload'
  | 'empty'
  | 'cash'
  | 'glass'
  | 'debris'

function clamp(value: number, lower = 0, upper = 1): number {
  return Math.min(upper, Math.max(lower, value))
}

const gearLimits = [7, 14, 22, 31, 46]

function spatialVoice(context: AudioContext, output: AudioNode, patrol: boolean) {
  const panner = context.createPanner()
  panner.panningModel = 'equalpower'
  panner.distanceModel = 'inverse'
  panner.refDistance = patrol ? 8 : 4
  panner.rolloffFactor = patrol ? 0.94 : 1.4
  panner.maxDistance = 110
  panner.positionY.value = 1.25
  panner.connect(output)
  const level = gain(context, panner)
  const body = filter(context, level, 'lowpass', patrol ? 2800 : 490)
  const tone = oscillator(context, body, 'triangle', patrol ? 680 : 62)
  return {
    panner, level, tone, patrol,
    id: undefined as SoundSource['id'],
    distance: 0,
    previousTime: -Infinity,
  }
}

function assemble(context: AudioContext) {
  const compressor = context.createDynamicsCompressor()
  compressor.threshold.value = -13
  compressor.knee.value = 9
  compressor.ratio.value = 5
  compressor.attack.value = 0.004
  compressor.release.value = 0.14
  compressor.connect(context.destination)

  const master = gain(context, compressor)
  const world = gain(context, master, 1)
  const effects = gain(context, world, 0.84)
  const vehicles = gain(context, world, 1)
  const atmosphere = gain(context, world, 0.85)
  const interfaceBus = gain(context, master, 0.72)
  const buffer = noiseBuffer(context)

  const driveLevel = gain(context, vehicles)
  const driveFilter = filter(context, driveLevel, 'lowpass', 420, 0.9)
  const engine = oscillator(context, driveFilter, 'sawtooth', 43)
  const engineHarmonic = oscillator(context, gain(context, driveFilter, 0.43), 'triangle', 84)
  const roadLevel = gain(context, vehicles)
  const roadFilter = filter(context, roadLevel, 'bandpass', 650, 0.78)
  noiseLoop(context, buffer, roadFilter, 0.34)

  const coastLevel = gain(context, atmosphere)
  const coastFilter = filter(context, coastLevel, 'lowpass', 520)
  noiseLoop(context, buffer, coastFilter)
  const air = filter(context, gain(context, atmosphere, 0.095), 'bandpass', 260, 0.5)
  noiseLoop(context, buffer, air, 1.14)
  const city = filter(context, gain(context, atmosphere, 0.065), 'lowpass', 175)
  oscillator(context, city, 'triangle', 49)
  oscillator(context, gain(context, city, 0.45), 'triangle', 65.2)

  const rainLevel = gain(context, atmosphere)
  noiseLoop(context, buffer, filter(context, rainLevel, 'bandpass', 2600, 0.48), 0.81)

  const traffic = Array.from({ length: 5 }, () => spatialVoice(context, vehicles, false))
  const police = Array.from({ length: 3 }, () => spatialVoice(context, vehicles, true))
  return {
    master, world, effects, vehicles, interfaceBus, buffer, driveLevel, driveFilter, engine, engineHarmonic, roadLevel, roadFilter,
    coastLevel, coastFilter, rainLevel, traffic, police,
  }
}

type Voice = ReturnType<typeof spatialVoice>

function updateSpatial(
  voices: readonly Voice[], sources: readonly SoundSource[], frame: AudioFrame, now: number,
): void {
  const nearest = sources.map((source) => ({
    source,
    distance: (source.x - frame.x) ** 2 + (source.z - frame.z) ** 2,
  })).filter(({ distance }) => distance < 100 ** 2)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, voices.length)

  const unassigned = new Set(voices)
  const requests: Array<{ voice: Voice; source: SoundSource }> = []
  for (const { source } of nearest) {
    const voice = source.id === undefined ? undefined : voices.find((candidate) => candidate.id === source.id && unassigned.has(candidate))
    if (voice) {
      requests.push({ voice, source })
      unassigned.delete(voice)
    }
  }

  for (const { source } of nearest) {
    if (requests.some((request) => request.source === source)) continue
    const voice = unassigned.values().next().value
    if (!voice) break
    requests.push({ voice, source })
    unassigned.delete(voice)
  }

  for (const { voice, source } of requests) {
    const changedSource = voice.id !== source.id
    voice.id = source.id
    const distance = Math.hypot(source.x - frame.x, source.z - frame.z)
    const dt = now - voice.previousTime
    const radialSpeed = !changedSource && source.id !== undefined && dt >= 0.02 && dt < 0.25
      ? (distance - voice.distance) / dt : 0
    const doppler = 343 / (343 + clamp(radialSpeed, -52, 52))
    voice.distance = distance
    voice.previousTime = now
    const speed = clamp(Math.abs(source.speed ?? 0), 0, 35)
    const speedFactor = speed / 35
    const frequency = voice.patrol
      ? 875 + 226 * Math.sin(now * 6.6 + voices.indexOf(voice) * 1.7)
      : 63 + speed * 3.4
    smooth(voice.panner.positionX, source.x, now, changedSource ? 0.009 : 0.075)
    smooth(voice.panner.positionZ, source.z, now, changedSource ? 0.009 : 0.075)
    smooth(voice.tone.frequency, frequency * doppler, now, 0.05)
    smooth(voice.level.gain, voice.patrol ? 0.17 : 0.09 + speedFactor * 0.09, now, 0.12)
  }

  for (const voice of unassigned) {
    voice.id = undefined
    voice.previousTime = -Infinity
    smooth(voice.level.gain, 0, now, 0.065)
  }
}

export function createGameAudio() {
  let context: AudioContext | undefined
  let mix: ReturnType<typeof assemble> | undefined
  let modeVolume = 0.35
  let muted = false
  let paused = false
  let disposed = false
  let nextFootfall = 0
  let gear = 0
  let previousSpeed = 0
  let previousHeading = 0
  let previousTime = -Infinity
  const lastCue = new Map<Cue, number>()

  function applySettings(): void {
    if (!context || !mix) return
    const now = context.currentTime
    smooth(mix.master.gain, muted ? 0 : modeVolume ** 1.25, now)
    smooth(mix.world.gain, paused ? 0 : 1, now)
  }

  async function unlock(): Promise<void> {
    if (disposed || typeof AudioContext === 'undefined') return
    if (!context) {
      const audio = new AudioContext({ latencyHint: 'interactive' })
      try {
        mix = assemble(audio)
        context = audio
        applySettings()
      } catch (error) {
        void audio.close().catch(() => {})
        throw error
      }
    }
    if (context.state !== 'running') await context.resume()
  }

  function cue(name: Cue): void {
    if (!context || !mix || context.state !== 'running' || (paused && name !== 'ui')) return
    const now = context.currentTime
    if (now - (lastCue.get(name) ?? -Infinity) < (name === 'horn' ? 0.28 : 0.08)) return
    lastCue.set(name, now)
    const { effects, interfaceBus, buffer } = mix
    switch (name) {
      case 'horn':
        sweep(context, effects, now, 'triangle', 372, 349, 0.38, 0.26)
        sweep(context, effects, now, 'triangle', 498, 466, 0.34, 0.16)
        break
      case 'impact':
        burst(context, buffer, effects, now, 1120, 0.36, 0.57)
        sweep(context, effects, now, 'sine', 112, 39, 0.24, 0.45)
        break
      case 'jump':
        burst(context, buffer, effects, now, 750, 0.12, 0.15)
        sweep(context, effects, now, 'sine', 116, 68, 0.09, 0.16)
        break
      case 'enter':
      case 'leave':
        burst(context, buffer, effects, now, name === 'enter' ? 1650 : 1040, 0.11, 0.25)
        sweep(context, effects, now + 0.025, 'sine', 119, 84, 0.09, 0.15)
        break
      case 'ui':
        sweep(context, interfaceBus, now, 'sine', 568, 748, 0.09, 0.19)
        break
      case 'shot':
        burst(context, buffer, effects, now, 1850, 0.095, 0.54)
        sweep(context, effects, now, 'sawtooth', 260, 58, 0.11, 0.34)
        break
      case 'reload':
        sweep(context, effects, now, 'triangle', 480, 640, 0.07, 0.16)
        sweep(context, effects, now + 0.15, 'triangle', 660, 920, 0.06, 0.18)
        break
      case 'empty':
        sweep(context, effects, now, 'square', 920, 420, 0.035, 0.1)
        break
      case 'cash':
        sweep(context, interfaceBus, now, 'sine', 880, 1174, 0.07, 0.2)
        sweep(context, interfaceBus, now + 0.065, 'sine', 1174, 1568, 0.09, 0.22)
        break
      case 'glass':
        burst(context, buffer, effects, now, 3400, 0.22, 0.42)
        sweep(context, effects, now, 'triangle', 1760, 1220, 0.09, 0.16)
        sweep(context, effects, now + 0.04, 'triangle', 2380, 1560, 0.11, 0.13)
        break
      case 'debris':
        burst(context, buffer, effects, now, 860, 0.26, 0.48)
        sweep(context, effects, now, 'sine', 165, 52, 0.19, 0.34)
        break
    }
  }

  function update(frame: AudioFrame): void {
    if (!context || !mix || paused || context.state !== 'running') return
    const now = context.currentTime
    const { listener } = context
    smooth(listener.positionX, frame.x, now, 0.055)
    smooth(listener.positionY, frame.y + 1.45, now, 0.055)
    smooth(listener.positionZ, frame.z, now, 0.055)
    smooth(listener.forwardX, Math.sin(frame.heading), now, 0.046)
    smooth(listener.forwardZ, -Math.cos(frame.heading), now, 0.046)

    const speed = clamp(Math.abs(frame.speed), 0, 45)
    const delta = now - previousTime
    const step = delta >= 0.02 && delta < 0.25 ? delta : 0
    const acceleration = step ? (speed - previousSpeed) / step : 0
    const turn = frame.heading - previousHeading
    const turnSpeed = step ? Math.abs(Math.atan2(Math.sin(turn), Math.cos(turn))) / step : 0
    previousTime = now
    previousSpeed = speed
    previousHeading = frame.heading

    const priorGear = gear
    if (!frame.driving) gear = 0
    else {
      while (gear < gearLimits.length - 1 && speed >= gearLimits[gear] + 0.55) gear++
      while (gear > 0 && speed < gearLimits[gear - 1] - 0.8) gear--
    }
    const low = gear > 0 ? gearLimits[gear - 1] : 0
    const stretch = clamp((speed - low) / (gearLimits[gear] - low))
    const load = 0.86 * clamp(frame.throttle) + 0.14 * clamp(acceleration / 6)
    const revs = 44 + stretch * 88 + load * 31
    if (frame.driving && gear !== priorGear && step) {
      burst(context, mix.buffer, mix.vehicles, now, 870, 0.066, 0.21)
      sweep(context, mix.vehicles, now, 'triangle', 130, 66, 0.075, 0.11)
    }
    smooth(mix.engine.frequency, revs, now, 0.08)
    smooth(mix.engineHarmonic.frequency, revs * 2.013, now, 0.064)
    smooth(mix.driveLevel.gain, frame.driving ? 0.095 + speed * 0.0028 + load * 0.10 : 0, now, 0.085)
    smooth(mix.driveFilter.frequency, 295 + load * 310 + speed * 21, now, 0.08)
    const slip = clamp((turnSpeed * speed - 7) / 15)
    const brake = frame.braking && speed > 1.2 ? 0.36 : 0
    const tractionNoise = Math.max(slip, brake)
    smooth(mix.roadFilter.frequency, 430 + speed * 22 + tractionNoise * 1120, now)
    smooth(mix.roadLevel.gain, frame.driving ? speed / 45 * 0.23 + tractionNoise * 0.31 : 0, now)

    const surf = 1 - clamp(frame.coastDistance / 90)
    const wave = 0.76 + Math.sin(now * 0.71) * 0.18 + Math.sin(now * 1.43) * 0.06
    smooth(mix.coastLevel.gain, surf * wave * 0.49, now, 0.21)
    smooth(mix.coastFilter.frequency, 360 + wave * 460, now, 0.16)
    smooth(mix.rainLevel.gain, clamp(frame.rain ?? 0) * 0.38, now, 0.38)
    updateSpatial(mix.traffic, frame.traffic, frame, now)
    updateSpatial(mix.police, frame.police, frame, now)

    if (!frame.driving && frame.moving && frame.y < 0.5) {
      if (now >= nextFootfall) {
        const pace = clamp(speed / 7)
        burst(context, mix.buffer, mix.effects, now, 620 + pace * 440, 0.11, 0.10 + pace * 0.16)
        sweep(context, mix.effects, now, 'sine', 105, 70, 0.08, 0.11 + pace * 0.08)
        nextFootfall = now + 0.39 - pace * 0.15
      }
    } else {
      nextFootfall = now
    }
  }

  function handlePageHide(event: PageTransitionEvent): void {
    if (!event.persisted) dispose()
  }

  function dispose(): void {
    if (disposed) return
    disposed = true
    if (typeof window !== 'undefined') window.removeEventListener('pagehide', handlePageHide)
    if (context && context.state !== 'closed') void context.close().catch(() => {})
    context = undefined
    mix = undefined
    lastCue.clear()
  }

  if (typeof window !== 'undefined') window.addEventListener('pagehide', handlePageHide)

  return {
    unlock,
    update,
    cue,
    dispose,
    setVolume(value: number) {
      if (Number.isFinite(value)) modeVolume = clamp(value)
      applySettings()
    },
    setMuted(value: boolean) {
      muted = value
      applySettings()
    },
    setPaused(value: boolean) {
      paused = value
      applySettings()
    },
  }
}
