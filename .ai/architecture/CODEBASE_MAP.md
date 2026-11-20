---
document_id: ARCH-CODEBASE-MAP
status: active
last_updated: 2026-11-20
verified_against: "248f8b44b7aebf77fc38a0d5c0bde996e680cec5"
verification_scope: "static-analysis-only"
---

# Mapa del Código Fuente (`CODEBASE_MAP.md`)

> Inventario compacto de los `5.987` líneas fuente/config/tests (excluyendo `package-lock.json` y `public/licencias/`).

## Raíz y configuración
- `index.html`: Shell DOM de portada, HUD, `<dialog>` de ajustes/pausa, controles táctiles y `#debug-panel`.
- `package.json` / `package-lock.json`: Versión `0.2.0`, scripts (`dev`, `build`, `preview`, `typecheck`, `test`), 4 deps runtime, 4 devDeps.
- `tsconfig.json`: TypeScript `ES2022`, `strict: true`, `verbatimModuleSyntax: true`, `noEmit: true`.
- `vite.config.ts`: `base: './'`, chunks manuales `three` y `rapier`.
- `.github/workflows/ci.yml`: Pipeline CI (`npm ci`, `npm test`, `npm run build` en Node 24).

## `src/` (34 archivos `.ts`, 3 `.css`)

| Directorio / Archivo | Símbolos principales | Responsabilidad |
| :--- | :--- | :--- |
| `src/main.ts` | `startGame`, `step`, `frame`, `play`, `pause` | Punto de entrada y bucle principal |
| `src/config/game.ts` | `Quality`, `gameConfig` | Semilla (`240817`), hora (`17.25`), `fixedStep` (`1/60`) |
| `src/core/fixed-loop.ts` | `FixedLoop` | Acumulador de paso fijo e interpolación `alpha` |
| `src/core/input.ts` | `createInput` | Teclado, Pointer Lock, arrastre y controles táctiles |
| `src/physics/physics.ts` | `createPhysics`, `createCharacterCollider`, `createCameraClearance`, `createExitClearance` | Mundo Rapier WASM y consultas espaciales |
| `src/physics/vehicle-obstacles.ts` | `createVehicleObstacles` | Cuerpos cinemáticos en Rapier para tráfico/patrullas |
| `src/player/player.ts` | `createPlayer`, `MovementInput` | Locomoción a pie, salto y transición con vehículo |
| `src/player/follow-camera.ts` | `createFollowCamera` | Cámara en tercera persona con *spring arm* |
| `src/characters/avatar.ts` | `createAvatar`, `AvatarPose` | Modelo cúbico jerárquico y animación procedural |
| `src/vehicles/vehicle.ts` | `createVehicle` | Dinámica `Rayo GT`, embarque/desembarque y `impact` |
| `src/vehicles/vehicle-model.ts` | `createVehicleModel`, `vehicleDimensions` | Malla biselada, ruedas, luces y sirena |
| `src/navigation/road-graph.ts` | `buildRoadGraph`, `closestRoadNode`, `findRoadRoute` | Grafo vial dirigido (88 nodos, 314 carriles) y Dijkstra |
| `src/ai/traffic/traffic.ts` | `createTraffic`, `profiles` | Población, rutas, curvas Bézier y evitación 1D |
| `src/ai/traffic/signals.ts` | `createSignals`, `signalAt`, `controlsJunction` | Fases semafóricas e `InstancedMesh` de semáforos |
| `src/ai/traffic/traffic-visuals.ts` | `createTrafficVisuals` | Render instanciado de hasta 23 vehículos |
| `src/ai/police/police.ts` | `createPolice`, `clearLine` | Patrullas, FOV + LOS, cerco y detención |
| `src/ai/police/wanted.ts` | `createWantedSystem`, `responseLevels` | Estados de búsqueda y predicción |
| `src/world/district.ts` | `buildDistrict` | Ensamblado del distrito, manzanas, parques y skyline |
| `src/world/streaming.ts` | `createDistrictStreaming` | Sectores `64×64 m` con histéresis visual y 2 LODs |
| `src/world/generation/layout.ts` | `districtBounds`, `avenues`, `crossStreets`, `makeRandom`, `roadRectangles` | Trazado maestro y PRNG determinista |
| `src/world/generation/geometry.ts` | `DistrictGeometry`, `DistrictResources`, `disposeInstances` | Batching `InstancedMesh` y textura grano XZ |
| `src/world/generation/buildings.ts` | `addBuilding`, `buildingCollider` | Fachadas art déco/torre/porche y rótulos voxel |
| `src/world/generation/streets.ts` | `addStreets`, `addLamppost`, `addBench` | Vías, aceras, cebras, bordillos y mobiliario |
| `src/world/generation/coast.ts` | `addCoast` | Playa, paseo marítimo y shader de océano |
| `src/world/generation/vegetation.ts` | `addPalm`, `addPlanter` | Palmeras curvas y jardineras |
| `src/renderer/renderer.ts` | `createRenderer` | `WebGLRenderer`, perfiles `low`–`ultra` y sombras |
| `src/renderer/resolution.ts` | `createFrameBudget` | Escala dinámica `1.0 → 0.64` |
| `src/renderer/lighting/atmosphere.ts` | `createAtmosphere` | Ciclo solar/lunar, *texel snapping*, niebla y domo |
| `src/renderer/lighting/reflection.ts` | `createSkyReflection` | `DataTexture` IBL `128×64` |
| `src/renderer/postprocessing/contact-shadows.ts` | `createContactShadows` | Hasta 10 sombras de contacto instanciadas |
| `src/shaders/sky.ts` | `skyVertexShader`, `skyFragmentShader` | Cielo, nubes FBM, estrellas, sol y luna |
| `src/audio/audio.ts` | `createGameAudio` | Mezclador Web Audio, motor 5 marchas, ambiente y Doppler |
| `src/audio/synths/signals.ts` | `gain`, `filter`, `oscillator`, `noiseBuffer`, `sweep`, `burst` | Primitivas de síntesis Web Audio |
| `src/persistence/preferences.ts` | `loadQuality`, `saveQuality`, `loadAudioPreference`, `saveAudioPreference` | IndexedDB (`viceblock` v1) |
| `src/ui/ui.ts` | `createUI` | Portada, HUD, modales y gestión de modo |
| `src/ui/minimap.ts` | `createMinimap` | Canvas 2D del distrito y flecha del jugador |
| `src/ui/*.css` | — | Estilos de menú, HUD/táctil y diálogos |
| `src/debug/stats.ts` / `overlay.ts` | `FrameStats`, `createDebugOverlay` | Métricas F3 y wireframe colisionadores/rutas F4 |

## `tests/` (9 archivos, 25 pruebas)
`district.test.ts` (2), `fixed-loop.test.ts` (2), `player.test.ts` (4), `vehicle.test.ts` (5), `traffic.test.ts` (4), `police.test.ts` (2), `wanted.test.ts` (2), `world-streaming.test.ts` (2), `resolution.test.ts` (2).
