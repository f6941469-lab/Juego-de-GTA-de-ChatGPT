import {
  ACESFilmicToneMapping, PCFShadowMap, SRGBColorSpace, WebGLRenderer,
  type DirectionalLight, type PerspectiveCamera, type Scene,
} from 'three';
import { gameConfig, type Quality } from '../config/game';
import { createSkyReflection } from './lighting/reflection';

export { createAtmosphere } from './lighting/atmosphere';

const presets = {
  low: { pixelRatio: 0.75, shadowSize: 0, reflections: false },
  medium: { pixelRatio: 1, shadowSize: 1024, reflections: true },
  high: { pixelRatio: 1.5, shadowSize: 2048, reflections: true },
  ultra: { pixelRatio: 2, shadowSize: 3072, reflections: true },
} satisfies Record<Quality, { pixelRatio: number; shadowSize: number; reflections: boolean }>;

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

  function resize(nextWidth: number, nextHeight: number): void {
    width = Math.max(1, Math.floor(nextWidth));
    height = Math.max(1, Math.floor(nextHeight));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, presets[quality].pixelRatio));
    renderer.setSize(width, height, false);
  }

  function setQuality(nextQuality: Quality): void {
    quality = nextQuality;
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

  function render(scene: Scene, camera: PerspectiveCamera): void {
    if (configuredScene !== scene) configureScene(scene);
    renderer.render(scene, camera);
  }

  setQuality(quality);
  return { renderer, setQuality, resize, render };
}
