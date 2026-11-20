import {
  ACESFilmicToneMapping, PCFShadowMap, SRGBColorSpace, WebGLRenderer,
  type DirectionalLight, type PerspectiveCamera, type Scene,
} from 'three';
import { gameConfig, type Quality } from '../config/game';
import { createSkyReflection } from './lighting/reflection';
import { createFrameBudget } from './resolution';

export { createContactShadows, type ContactShadowSource } from './postprocessing/contact-shadows';
export { createAtmosphere } from './lighting/atmosphere';

const presets = {
  low: { pixelRatio: 0.75, maxPixels: 1_200_000, shadowSize: 0, reflections: false },
  medium: { pixelRatio: 1, maxPixels: 1_800_000, shadowSize: 1024, reflections: true },
  high: { pixelRatio: 1.5, maxPixels: 2_800_000, shadowSize: 2048, reflections: true },
  ultra: { pixelRatio: 2, maxPixels: 4_500_000, shadowSize: 3072, reflections: true },
} satisfies Record<Quality, { pixelRatio: number; maxPixels: number; shadowSize: number; reflections: boolean }>;

export function createRenderer(canvas: HTMLCanvasElement) {
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.type = PCFShadowMap;

  const reflection = createSkyReflection();
  let quality = gameConfig.defaultQuality;
  let configuredScene: Scene | undefined;
  let width = 1;
  let height = 1;
  const budget = createFrameBudget();

  function applyResolution() {
    const preset = presets[quality];
    const baseline = Math.min(window.devicePixelRatio || 1, preset.pixelRatio, Math.sqrt(preset.maxPixels / (width * height)));
    renderer.setPixelRatio(baseline * budget.scale);
    renderer.setSize(width, height, false);
  }

  function resize(nextWidth: number, nextHeight: number): void {
    width = Math.max(1, Math.floor(nextWidth));
    height = Math.max(1, Math.floor(nextHeight));
    applyResolution();
  }

  function setQuality(nextQuality: Quality): void {
    quality = nextQuality;
    budget.reset();
    renderer.shadowMap.enabled = presets[quality].shadowSize > 0;
    configuredScene = undefined;
    resize(width, height);
  }

  function configureScene(scene: Scene): void {
    const { shadowSize, reflections } = presets[quality];
    if (shadowSize > 0) {
      scene.traverse((object) => {
        const light = object as DirectionalLight;
        if (!light.isDirectionalLight || !light.castShadow || light.shadow.mapSize.x === shadowSize) return;
        light.shadow.mapSize.set(shadowSize, shadowSize);
        light.shadow.map?.dispose();
        light.shadow.map = null;
      });
    }
    if (reflections && scene.environment === null) scene.environment = reflection;
    if (!reflections && scene.environment === reflection) scene.environment = null;
    configuredScene = scene;
  }

  let lastRenderCpuMs: number | undefined

  function render(scene: Scene, camera: PerspectiveCamera, now = performance.now(), adaptive = true): void {
    if (budget.sample(now, adaptive, lastRenderCpuMs)) applyResolution();
    if (configuredScene !== scene) configureScene(scene);
    const start = performance.now();
    renderer.render(scene, camera);
    lastRenderCpuMs = performance.now() - start;
  }

  setQuality(quality);
  return {
    renderer, setQuality, resize, render,
    getFrameTiming() { return { frameMs: budget.average, renderCpuMs: lastRenderCpuMs, renderScale: budget.scale, pixelRatio: renderer.getPixelRatio() }; },
    dispose() {
      reflection.dispose();
      renderer.dispose();
    },
  };
}
