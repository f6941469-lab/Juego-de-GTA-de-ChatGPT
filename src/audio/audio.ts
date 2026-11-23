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
    playCinematic(kind: 'lockpick' | 'door' | 'sting' | 'siren_burst' | 'punch' | 'body_fall' | 'engine_rev' | 'tire_screech' | 'montage_beat' | 'whoosh' | 'chime', point?: Point3) {
      if (!context || context.state !== 'running' || muted || voices >= 8) return;
      const now = context.currentTime;
      const gain = context.createGain();
      const pan = context.createStereoPanner();
      pan.pan.value = point ? Math.max(-0.7, Math.min(0.7, (point.x - listener.x) / 18)) : 0;
      gain.connect(pan).connect(master!);

      const useNoise = kind === 'punch' || kind === 'body_fall' || kind === 'tire_screech' || kind === 'whoosh';
      const source = useNoise ? context.createBufferSource() : context.createOscillator();
      const filter = context.createBiquadFilter();

      let duration = 0.25;
      let volume = 0.34;
      if (source instanceof AudioBufferSourceNode) {
        source.buffer = noise!;
        filter.type = kind === 'tire_screech' ? 'bandpass' : 'lowpass';
        if (kind === 'punch') {
          filter.frequency.setValueAtTime(1100, now);
          filter.frequency.exponentialRampToValueAtTime(120, now + 0.2);
          duration = 0.22;
          volume = 0.85;
        } else if (kind === 'body_fall') {
          filter.frequency.setValueAtTime(280, now);
          duration = 0.24;
          volume = 0.65;
        } else if (kind === 'tire_screech') {
          filter.frequency.setValueAtTime(1850, now);
          filter.Q.value = 5;
          duration = 0.38;
          volume = 0.32;
        } else {
          // whoosh
          filter.frequency.setValueAtTime(400, now);
          filter.frequency.exponentialRampToValueAtTime(2200, now + 0.14);
          duration = 0.18;
          volume = 0.42;
        }
      } else {
        filter.type = 'lowpass';
        filter.frequency.value = 2600;
        if (kind === 'lockpick') {
          source.type = 'square';
          source.frequency.setValueAtTime(1650, now);
          source.frequency.exponentialRampToValueAtTime(2400, now + 0.06);
          duration = 0.07;
          volume = 0.18;
        } else if (kind === 'door') {
          source.type = 'triangle';
          source.frequency.setValueAtTime(145, now);
          source.frequency.exponentialRampToValueAtTime(52, now + 0.14);
          duration = 0.16;
          volume = 0.45;
        } else if (kind === 'sting') {
          source.type = 'sawtooth';
          source.frequency.setValueAtTime(110, now);
          source.frequency.exponentialRampToValueAtTime(68, now + 0.45);
          filter.frequency.value = 540;
          duration = 0.48;
          volume = 0.36;
        } else if (kind === 'siren_burst') {
          source.type = 'triangle';
          source.frequency.setValueAtTime(540, now);
          source.frequency.linearRampToValueAtTime(860, now + 0.28);
          source.frequency.linearRampToValueAtTime(560, now + 0.56);
          duration = 0.6;
          volume = 0.28;
        } else if (kind === 'engine_rev') {
          source.type = 'sawtooth';
          source.frequency.setValueAtTime(68, now);
          source.frequency.exponentialRampToValueAtTime(195, now + 0.38);
          source.frequency.exponentialRampToValueAtTime(125, now + 0.62);
          filter.frequency.value = 620;
          duration = 0.65;
          volume = 0.42;
        } else if (kind === 'montage_beat') {
          source.type = 'triangle';
          source.frequency.setValueAtTime(220, now);
          source.frequency.setValueAtTime(330, now + 0.11);
          source.frequency.setValueAtTime(440, now + 0.22);
          duration = 0.38;
          volume = 0.34;
        } else {
          // chime
          source.type = 'sine';
          source.frequency.setValueAtTime(660, now);
          source.frequency.exponentialRampToValueAtTime(990, now + 0.26);
          duration = 0.32;
          volume = 0.26;
        }
      }

      source.connect(filter).connect(gain);
      gain.gain.setValueAtTime(Math.max(0.001, volume), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      voices++;
      source.onended = () => {
        voices--;
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
        pan.disconnect();
      };
      source.start(now);
      source.stop(now + duration);
    },
    setMuted(value: boolean) { muted = value; if (master && context) master.gain.setTargetAtTime(value ? 0 : 0.28, context.currentTime, 0.03); },
    pause(value: boolean) { if (context) void (value ? context.suspend() : context.resume()).catch(() => {}); },
    dispose() { motors.forEach((motor) => { motor.oscillator.stop(); motor.oscillator.disconnect(); motor.gain.disconnect(); }); siren?.oscillator.stop(); void context?.close(); },
  };
}
export type GameAudio = Omit<ReturnType<typeof createAudio>, 'playCinematic'> & {
  playCinematic?: ReturnType<typeof createAudio>['playCinematic'];
};
