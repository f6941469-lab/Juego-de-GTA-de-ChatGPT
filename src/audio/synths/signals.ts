export function gain(context: AudioContext, destination: AudioNode, value = 0): GainNode {
  const node = context.createGain()
  node.gain.value = value
  node.connect(destination)
  return node
}

export function filter(context: AudioContext, destination: AudioNode, type: BiquadFilterType, frequency: number, quality = 0.7): BiquadFilterNode {
  const node = context.createBiquadFilter()
  node.type = type
  node.frequency.value = frequency
  node.Q.value = quality
  node.connect(destination)
  return node
}

export function oscillator(context: AudioContext, destination: AudioNode, type: OscillatorType, frequency: number): OscillatorNode {
  const node = context.createOscillator()
  node.type = type
  node.frequency.value = frequency
  node.connect(destination)
  node.start()
  return node
}

export function noiseBuffer(context: AudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
  const samples = buffer.getChannelData(0)
  let seed = 285451
  for (let frame = 0; frame < samples.length; frame++) {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0
    samples[frame] = seed / 0x80000000 - 1
  }
  return buffer
}

export function noiseLoop(context: AudioContext, buffer: AudioBuffer, destination: AudioNode, offset = 0): void {
  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = true
  source.connect(destination)
  source.start(0, offset)
}

export function smooth(parameter: AudioParam, value: number, now: number, timeConstant = 0.045): void {
  parameter.setTargetAtTime(value, now, timeConstant)
}

function envelope(node: GainNode, when: number, volume: number, duration: number): void {
  node.gain.setValueAtTime(0, when)
  node.gain.linearRampToValueAtTime(volume, when + Math.min(0.012, duration * 0.2))
  node.gain.exponentialRampToValueAtTime(0.0001, when + duration)
}

export function sweep(
  context: AudioContext, destination: AudioNode, when: number,
  type: OscillatorType, from: number, to: number, duration: number, volume: number,
): void {
  const level = gain(context, destination)
  const source = context.createOscillator()
  source.type = type
  source.frequency.setValueAtTime(from, when)
  source.frequency.exponentialRampToValueAtTime(to, when + duration)
  source.connect(level)
  source.onended = () => {
    source.disconnect()
    level.disconnect()
  }
  envelope(level, when, volume, duration)
  source.start(when)
  source.stop(when + duration)
}

export function burst(
  context: AudioContext, buffer: AudioBuffer, destination: AudioNode, when: number,
  frequency: number, duration: number, volume: number,
): void {
  const level = gain(context, destination)
  const EQ = filter(context, level, 'lowpass', frequency)
  const source = context.createBufferSource()
  source.buffer = buffer
  source.connect(EQ)
  source.onended = () => {
    source.disconnect()
    EQ.disconnect()
    level.disconnect()
  }
  envelope(level, when, volume, duration)
  source.start(when, when % 1.2, duration)
}
