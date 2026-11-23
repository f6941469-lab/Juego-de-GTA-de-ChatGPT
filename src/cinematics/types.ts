export type StoryChapterId = 'prologue_stolen_car' | (string & {});

export type StoryFlag =
  | 'prologue_completed'
  | 'met_valeria'
  | 'escaped_police_boulevard'
  | 'valeria_contact_active'
  | (string & {});

export interface NarrativeState {
  currentChapter: StoryChapterId;
  completedChapters: StoryChapterId[];
  flags: Record<string, boolean>;
}

export type CinematicActorId = 'leo' | 'valeria' | 'officer';
export type CinematicVehicleId = 'sportsCar' | 'patrolCar';
export type CinematicProp = 'none' | 'lockpick' | 'badge' | 'flashlight' | 'coffee' | 'bag' | 'keys';

export type CinematicPosePreset =
  | 'idle'
  | 'sneak_lockpick'
  | 'walk'
  | 'run'
  | 'argue_point'
  | 'argue_hands'
  | 'plead'
  | 'arms_crossed'
  | 'inspect'
  | 'cautious_step'
  | 'punch_windup'
  | 'punch_strike'
  | 'knockback_fall'
  | 'knocked_out'
  | 'celebrate'
  | 'lean_cool'
  | 'wave_bye'
  | 'drive_seated'
  | 'passenger_seated';

export type CinematicAudioCueKind =
  | 'lockpick'
  | 'door'
  | 'sting'
  | 'siren_burst'
  | 'punch'
  | 'body_fall'
  | 'engine_rev'
  | 'tire_screech'
  | 'montage_beat'
  | 'whoosh'
  | 'chime';

export type LightingMood =
  | 'golden_boulevard'
  | 'police_tension'
  | 'impact_flash'
  | 'sunset_chase'
  | 'neon_night'
  | 'palma_handoff';

export type ParticleBurstKind = 'sparks' | 'impact' | 'exhaust';

export interface Vec3Tuple {
  x: number;
  y: number;
  z: number;
}

export interface ActorSample {
  visible: boolean;
  x: number;
  y: number;
  z: number;
  heading: number;
  pose: CinematicPosePreset;
  /** Normalized progress within the current pose or action (0..1) */
  actionT?: number;
  /** Optional world-space point the character turns their head toward */
  lookAt?: Vec3Tuple;
  /** Active handheld prop */
  prop?: CinematicProp;
  /** Intensity of speaking gestures (0..1) */
  talking?: number;
  /** Extra body lean/pitch override in radians */
  bodyPitch?: number;
  /** Extra torso yaw override in radians */
  torsoYaw?: number;
}

export interface VehicleSample {
  visible: boolean;
  x: number;
  y: number;
  z: number;
  heading: number;
  /** Driver door open angle in radians (0 = closed, ~1.05 = open) */
  driverDoor?: number;
  /** Passenger door open angle in radians */
  passengerDoor?: number;
  /** Wheel spin speed in rad/s */
  wheelSpeed?: number;
  /** Front wheel steering angle in radians */
  steer?: number;
  /** Headlights active */
  headlights?: boolean;
  /** Police roof sirens flashing */
  sirens?: boolean;
  /** Body roll during aggressive turns/braking */
  roll?: number;
  /** Body pitch during acceleration/braking */
  pitch?: number;
}

export interface CameraSample {
  pos: Vec3Tuple;
  lookAt: Vec3Tuple;
  fov: number;
  /** Camera shake amplitude (0 = steady, >0 = impact/engine rumble) */
  shake?: number;
  /** Subtle camera Dutch roll in radians */
  roll?: number;
}

export interface DialogueCue {
  id: string;
  start: number;
  end: number;
  speaker: 'LEO' | 'VALERIA' | 'AGENTE MORALES';
  speakerColor: string;
  text: string;
}

export interface TitleCardCue {
  id: string;
  start: number;
  end: number;
  eyebrow: string;
  title: string;
  subtitle?: string;
}

export interface TimedAudioCue {
  id: string;
  time: number;
  kind: CinematicAudioCueKind;
  point?: Vec3Tuple;
}

export interface TimedParticleCue {
  id: string;
  time: number;
  kind: ParticleBurstKind;
  point: Vec3Tuple;
}

export interface CinematicShotMeta {
  id: string;
  label: string;
  start: number;
  end: number;
  mood: LightingMood;
  hour: number;
}

export interface CinematicFrameState {
  shotId: string;
  hour: number;
  mood: LightingMood;
  /** Fade overlay opacity 0..1 */
  fadeBlack: number;
  /** Brief white impact/montage flash opacity 0..1 */
  flashWhite: number;
  /** Letterbox bar progress 0..1 (1 = full 2.35:1 bars) */
  letterbox: number;
  camera: CameraSample;
  focus: Vec3Tuple;
  actors: Record<CinematicActorId, ActorSample>;
  vehicles: Record<CinematicVehicleId, VehicleSample>;
  sirenAudio: boolean;
  engineIntensity: number;
}

export interface CinematicSequence {
  id: StoryChapterId;
  title: string;
  duration: number;
  completionFlags: StoryFlag[];
  completionNotice: string;
  shots: readonly CinematicShotMeta[];
  dialogues: readonly DialogueCue[];
  titleCards: readonly TitleCardCue[];
  audioCues: readonly TimedAudioCue[];
  particleCues: readonly TimedParticleCue[];
  evaluate(time: number): CinematicFrameState;
}
