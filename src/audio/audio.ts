import type { Point3 } from '../physics/physics';
export type Sound = 'step' | 'shot' | 'glass' | 'reload' | 'purchase' | 'notice' | 'impact';
/** Original synthesized cues. Bounded voices, no downloaded assets. */
export function createAudio() {
  let context: AudioContext | undefined;
  let master: GainNode | undefined;
  let noise: AudioBuffer | undefined;
  let voices = 0;
  let listener: Point3 = { x: 0, y: 0, z: 0 };
  let muted = false;
  const last = new Map<Sound, number>();
  const motors: Array<{ oscillator: OscillatorNode; gain: GainNode }> = [];
  let siren: { oscillator: OscillatorNode; gain: GainNode } | undefined;
  function loop(frequency: number) {
    const oscillator = context!.createOscillator(); const gain = context!.createGain();
    oscillator.type = 'triangle'; oscillator.frequency.value = frequency; gain.gain.value = 0;
    oscillator.connect(gain).connect(master!); oscillator.start(); return { oscillator, gain };
  }
  return {
    unlock() {
      if (!context) {
        context = new AudioContext(); master = context.createGain(); master.gain.value = 0.28; master.connect(context.destination);
        noise = context.createBuffer(1, context.sampleRate * 0.25, context.sampleRate);
        const samples = noise.getChannelData(0); for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
        for (let i = 0; i < 3; i++) motors.push(loop(45)); siren = loop(520);
      }
      void context.resume().catch(() => {});
    },
    play(kind: Sound, point?: Point3) {
      if (!context || context.state !== 'running' || muted || voices >= 8) return;
      const now = context.currentTime;
      if (now - (last.get(kind) ?? -1) < 0.07) return;
      last.set(kind, now);
      const distance = point ? Math.hypot(point.x - listener.x, point.y - listener.y, point.z - listener.z) : 0;
      const attenuation = 1 / (1 + distance * distance * 0.025); if (attenuation < 0.015) return;
      const gain = context.createGain(); const pan = context.createStereoPanner(); pan.pan.value = point ? Math.max(-0.8, Math.min(0.8, (point.x - listener.x) / 15)) : 0;
      gain.connect(pan).connect(master!);
      const noisy = ['shot', 'glass', 'step', 'impact'].includes(kind);
      const source = noisy ? context.createBufferSource() : context.createOscillator();
      if (source instanceof AudioBufferSourceNode) source.buffer = noise!;
      else { source.type = 'triangle'; source.frequency.setValueAtTime(kind === 'purchase' ? 780 : kind === 'notice' ? 610 : 210, now); source.frequency.exponentialRampToValueAtTime(kind === 'purchase' ? 1200 : 100, now + 0.14); }
      const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = kind === 'shot' ? 1800 : kind === 'glass' ? 7000 : kind === 'step' ? 180 : 1600;
      source.connect(filter).connect(gain);
      const duration = kind === 'glass' ? 0.24 : kind === 'step' ? 0.06 : 0.16;
      const volume = (kind === 'shot' ? 0.9 : kind === 'step' ? 0.16 : 0.32) * attenuation;
      gain.gain.setValueAtTime(Math.max(0.001, volume), now); gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      voices++; source.onended = () => { voices--; source.disconnect(); filter.disconnect(); gain.disconnect(); pan.disconnect(); };
      source.start(now); source.stop(now + duration);
    },
    update(position: Point3, cars: readonly { position: Point3; speed: number }[], police: boolean, time: number) {
      listener = position;
      if (!context || !siren) return;
      for (const [index, motor] of motors.entries()) {
        const car = cars[index]; const distance = car ? Math.hypot(car.position.x - position.x, car.position.z - position.z) : 100;
        motor.gain.gain.setTargetAtTime(muted ? 0 : 0.035 / (1 + distance * distance * 0.04), context.currentTime, 0.1);
        motor.oscillator.frequency.setTargetAtTime(40 + (car?.speed ?? 0) * 10, context.currentTime, 0.15);
      }
      siren.gain.gain.setTargetAtTime(police && !muted ? 0.025 : 0, context.currentTime, 0.2);
      siren.oscillator.frequency.setTargetAtTime(620 + Math.sin(time * 7) * 170, context.currentTime, 0.05);
    },
    setMuted(value: boolean) { muted = value; if (master && context) master.gain.setTargetAtTime(value ? 0 : 0.28, context.currentTime, 0.03); },
    pause(value: boolean) { if (context) void (value ? context.suspend() : context.resume()).catch(() => {}); },
    dispose() { motors.forEach((motor) => { motor.oscillator.stop(); motor.oscillator.disconnect(); motor.gain.disconnect(); }); siren?.oscillator.stop(); void context?.close(); },
  };
}
export type GameAudio = ReturnType<typeof createAudio>;
