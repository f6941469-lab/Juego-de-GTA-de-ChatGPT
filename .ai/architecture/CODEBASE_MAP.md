---
document_id: ARCH-CODEBASE-MAP
status: active
last_updated: 2026-11-20
verified_against: "3a830a4-dirty (Phase 6)"
verification_scope: "typecheck-tests-build-phase6"
---

# Mapa del Código Fuente (`CODEBASE_MAP.md`)

> Inventario de módulos y pruebas de Viceblock tras Fases 1–6.

## Raíz y configuración
- `index.html`: Shell DOM de portada, HUD (`#cash-display`, `#weapon-display`, `#aim-reticle`, `#phone-device`), `<dialog>` de ajustes/pausa, controles táctiles (`#touch-phone`) y `#debug-panel`.
- `package.json` / `package-lock.json`: Versión `0.2.0`, scripts (`dev`, `build`, `preview`, `typecheck`, `test`), 4 deps runtime, 4 devDeps.
- `tsconfig.json`: TypeScript `ES2022`, `strict: true`, `verbatimModuleSyntax: true`, `noEmit: true`.
- `vite.config.ts`: `base: './'`, chunks manuales `three` y `rapier`.
- `.github/workflows/ci.yml`: Pipeline CI (`npm ci`, `npm test`, `npm run build` en Node 24).

## `src/` (42 archivos `.ts`, 3 `.css`)

| Directorio / Archivo | Símbolos principales | Responsabilidad |
| :--- | :--- | :--- |
| `src/main.ts` | `startGame`, `step`, `frame`, `play`, `pause` | Arranque, bucle rAF, HUD/teléfono/estado policial/UI, audio y debug F3/F4/F5 |
| `src/config/game.ts` | `Quality`, `gameConfig` | Semilla (`240817`), hora (`17.25`), `fixedStep` (`1/60`) |
| `src/core/fixed-loop.ts` | `FixedLoop` | Acumulador de paso fijo e interpolación `alpha` |
| `src/core/events.ts` | `WorldEventBus`, `WorldEvent`, `WorldEventType` | Bus de eventos espacial/temporal acotado (no omnisciente) |
| `src/core/input.ts` | `createInput` | Teclado (`WASD`, `1-3`, `Q`, `R`, `F`, `G`, `↑/M` teléfono), ratón, arrastre, táctil y F3/F4/F5 (`VB-015` resuelto) |
| `src/simulation/entities.ts` | `EntityRegistry`, `WorldEntity`, `computeSimulationTier` | Registro espacial de entidades y tiers `high`/`medium`/`low` |
| `src/simulation/phone.ts` | `createPhoneSystem`, `PhoneCommand`, `PhoneSnapshot` | Teléfono diegético: cámara/directo, feed viral, emergencias 911 y alertas urbanas |
| `src/simulation/engine.ts` | `createSimulationEngine` | Orquestador de simulación (física única, armas/balística, destructibles, accidentes, teléfono, vehículos, tráfico, NPCs, asaltos, policía) |
| `src/physics/physics.ts` | `createPhysics`, `createCharacterCollider`, `createCameraClearance`, `createExitClearance` | Mundo Rapier WASM, `step(dt)` centralizado y consultas |
| `src/physics/spatial-index.ts` | `SpatialBoxGrid` | Índice espacial `32m` y raycast DDA `O(celdas)` sobre `StaticBox` |
| `src/physics/vehicle-obstacles.ts` | `createVehicleObstacles` | Cuerpos cinemáticos en Rapier para tráfico/patrullas |
| `src/player/player.ts` | `createPlayer`, `MovementInput` | Locomoción a pie (`prepareStep`/`finishStep`), apuntado y transición vehicular |
| `src/player/weapons.ts` | `createWeaponSystem`, `weaponSpecs` | Armas, munición, recarga, raycast contra `SpatialBoxGrid`/objetivos/props y trazadores `InstancedMesh` |
| `src/player/follow-camera.ts` | `createFollowCamera` | Cámara en tercera persona con *spring arm* |
| `src/characters/avatar.ts` | `createAvatar`, `AvatarPose` | Modelo cúbico jerárquico del jugador, pose de apuntado y arma en mano |
| `src/vehicles/vehicle.ts` | `createVehicle`, `VehicleSpawn` | Dinámica vehicular, daño mecánico (`health`/`applyDamage`), `prepareStep`/`finishStep` y `boardImmediate` |
| `src/vehicles/vehicle-manager.ts` | `createVehicleManager` | Pool de hasta 4 vehículos conducibles (`Rayo GT` + robados) |
| `src/vehicles/vehicle-model.ts` | `createVehicleModel`, `vehicleDimensions` | Malla biselada, ruedas, luces y dimensiones vehiculares |
| `src/navigation/road-graph.ts` | `buildRoadGraph`, `closestRoadNode`, `findRoadRoute` | Grafo vial dirigido (146 nodos) y Dijkstra |
| `src/navigation/pedestrian-graph.ts` | `buildPedestrianGraph`, `findPedestrianRoute`, `findEscapeNode`, `steerPedestrian` | Grafo peatonal (aceras/puentes/tiendas), A* MinHeap y esquiva |
| `src/ai/perception.ts` | `evaluatePerception`, `createObserverState`, `inFieldOfView` | Percepción visual (FOV + LOS `minY=1.15m`) y auditiva |
| `src/ai/npc/profiles.ts` | `createNpcIdentity`, `NpcRole`, `NpcTraits` | 10 roles y rasgos individuales deterministas |
| `src/ai/npc/npc-brain.ts` | `createNpcBrain`, `stepNpcBrain`, `NpcEmotionalState` | 17 estados emocionales, memoria limitada, reacción a grabación y Utility AI |
| `src/ai/npc/npc-visuals.ts` | `createNpcVisuals`, `NpcVisualAgent` | Renderizado instanciado (7 `InstancedMesh`) para hasta 72 NPCs |
| `src/ai/npc/npc-population.ts` | `createNpcPopulation`, `NpcAgent` | Peatones por horario/distrito, dependientes, testigos 911, reacción a accidentes y combate/huida |
| `src/ai/traffic/traffic.ts` | `createTraffic`, `profiles`, `hijackNearest`, `damageVehicle`, `resolveVehicleCrash` | Población, conductores reales, accidentes con eyección y robo vehicular |
| `src/ai/traffic/signals.ts` | `createSignals`, `signalAt`, `controlsJunction` | Fases semafóricas e `InstancedMesh` de semáforos |
| `src/ai/traffic/traffic-visuals.ts` | `createTrafficVisuals` | Render instanciado de hasta 23 vehículos, daño visual y conductores |
| `src/ai/police/police-visuals.ts` | `createPoliceVisuals`, `PoliceVisualUnit` | Render instanciado (`4` `InstancedMesh`) para hasta 8 patrullas + oficiales a pie (`VB-005`) |
| `src/ai/police/police.ts` | `createPolice`, `clearLine`, `PatrolRole` | Patrullas, evitación de tráfico (`VB-004`), perímetros, cerco en tienda, oficiales a pie y `dispose()` |
| `src/ai/police/wanted.ts` | `createWantedSystem`, `responseLevels`, `SuspectDescription` | Estados de búsqueda, memoria descriptiva (`matchesSuspect`) y predicción |
| `src/world/district.ts` | `buildDistrict` | Ensamblado multi-distrito, puentes, manzanas, parques y tiendas |
| `src/world/stores.ts` | `createStores`, `getStoreInteriorLayout`, `StoreMapMarker` | Balizas, interiores (`StoreInteriorLayout`) y asaltos progresivos (`beginHeist`/`stepHeist`) |
| `src/world/destructibles.ts` | `createDestructibles`, `DestructibleProp`, `DestructibleKind` | Vidrieras fracturables, mobiliario físico destructible y escombros/chorros/humo (`InstancedMesh`) |
| `src/world/streaming.ts` | `createDistrictStreaming` | Sectores `64×64 m` con histéresis visual y 2 LODs |
| `src/world/generation/layout.ts` | `districtBounds`, `districtZones`, `bridges`, `storeSpecs`, `getDistrictAt`, `makeRandom`, `roadRectangles` | Trazado multi-isla, puentes, tiendas y PRNG determinista |
| `src/world/generation/geometry.ts` | `DistrictGeometry`, `DistrictResources`, `disposeInstances` | Batching `InstancedMesh` y textura grano XZ |
| `src/world/generation/buildings.ts` | `addBuilding`, `buildingCollider`, `buildingColliders` | Fachadas art déco/torre/porche y plantas bajas enterables con huecos de escaparate |
| `src/world/generation/streets.ts` | `addStreets`, `addLamppost`, `addBench` | Vías por isla, puentes, aceras, cebras, bordillos y mobiliario |
| `src/world/generation/coast.ts` | `addCoast` | Playa, paseo marítimo y shader de bahía/océano |
| `src/world/generation/vegetation.ts` | `addPalm`, `addPlanter` | Palmeras curvas y jardineras |
| `src/renderer/renderer.ts` | `createRenderer` | `WebGLRenderer`, perfiles `low`–`ultra` y sombras |
| `src/renderer/resolution.ts` | `createFrameBudget` | Escala dinámica `1.0 → 0.64` |
| `src/renderer/lighting/atmosphere.ts` | `createAtmosphere` | Ciclo solar/lunar, *texel snapping*, niebla y domo |
| `src/renderer/lighting/reflection.ts` | `createSkyReflection` | `DataTexture` IBL `128×64` |
| `src/renderer/postprocessing/contact-shadows.ts` | `createContactShadows` | Hasta 14 sombras de contacto instanciadas |
| `src/shaders/sky.ts` | `skyVertexShader`, `skyFragmentShader` | Cielo, nubes FBM, estrellas, sol y luna |
| `src/audio/audio.ts` | `createGameAudio` | Mezclador Web Audio, motor 5 marchas, cues de armas/botín/cristales/escombros y Doppler |
| `src/audio/synths/signals.ts` | `gain`, `filter`, `oscillator`, `noiseBuffer`, `sweep`, `burst` | Primitivas de síntesis Web Audio |
| `src/persistence/preferences.ts` | `loadQuality`, `saveQuality`, `loadAudioPreference`, `saveAudioPreference` | IndexedDB (`viceblock` v1) |
| `src/ui/ui.ts` | `createUI` | Portada, HUD (salud, botín, arma, retícula, teléfono), modales y gestión de modo |
| `src/ui/minimap.ts` | `createMinimap` | Canvas 2D multi-distrito, puentes, tiendas y flecha del jugador |
| `src/ui/*.css` | — | Estilos de menú, HUD/táctil/teléfono y diálogos |
| `src/debug/stats.ts` / `overlay.ts` / `inspector.ts` | `FrameStats`, `createDebugOverlay`, `formatSimulationInspector` | Métricas F3, wireframe+navegación+FOV F4 e inspector F5 |

## `tests/` (18 archivos, 49 pruebas)
`district.test.ts` (3), `stores.test.ts` (1), `events-and-entities.test.ts` (4), `perception-and-npc.test.ts` (2), `pedestrian-navigation.test.ts` (2), `urban-life.test.ts` (2), `combat-and-heists.test.ts` (3), `destructibles-and-accidents.test.ts` (3), `phone-system.test.ts` (2), `fixed-loop.test.ts` (2), `player.test.ts` (4), `vehicle.test.ts` (5), `traffic.test.ts` (4), `police.test.ts` (2), `police-investigation.test.ts` (4), `wanted.test.ts` (2), `world-streaming.test.ts` (2), `resolution.test.ts` (2).

