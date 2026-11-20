---
document_id: SYSTEM-POLICE-WANTED
status: archived
last_updated: 2026-11-20
verified_against: "3a830a4-dirty (Phase 6 working tree)"
verification_scope: "typecheck + vitest (49/49) + vite build + Chromium WebGL 2 (Phase 6)"
related_systems: [TRAFFIC_AND_NAVIGATION, WORLD_AND_STREAMING, VEHICLES, NPC_AND_PERCEPTION]
related_files:
  - src/ai/police/police.ts
  - src/ai/police/police-visuals.ts
  - src/ai/police/wanted.ts
  - src/physics/spatial-index.ts
---


> ARCHIVO HISTÓRICO DEL SISTEMA ANTERIOR (hasta `d565cdc`). Desde 0.3.0 estos contratos no describen el código activo. Consulta [.ai/CURRENT_STATE.md](../CURRENT_STATE.md) y `.ai/SIMULATION.md` para la versión Mercado Palma.

# Sistema: Policía y Niveles de Búsqueda (`POLICE_AND_WANTED.md`)

1. **Propósito:** Gestionar el estado de búsqueda policial (0 a 5 estrellas), el despacho de patrullas terrestres y oficiales a pie no omniscientes, la memoria descriptiva del sospechoso/vehículo, perímetros/cercos en tiendas, evasión de tráfico civil y detención del jugador.
2. **Estado de implementación:** Fase 6 implementada: patrullas GPU-instanciadas (`createPoliceVisuals`, `VB-005` resuelto), evitación de tráfico civil y sonda física real (`VB-004` resuelto), memoria descriptiva (`SuspectDescription` + `matchesSuspect`), perímetros, cerco en tienda (`storeSiege`), despliegue de oficiales a pie y `dispose()` completo.
3. **Responsabilidades:** Registrar incidentes clasificados (`IncidentKind`, `ReportMetadata`), escalar/reducir estrellas según pérdida de contacto, mantener la descripción conocida del sospechoso/vehículo observada realmente por testigos o agentes, spawnear patrullas fuera de línea de visión, planificar interceptación o perímetros, aparcar patrullas y desplegar oficiales a pie en búsquedas/cercos de tienda, disparar con `clearLine` real desde `wanted.level >= 2` y detectar captura.
4. **Archivos fuente relevantes:** `src/ai/police/police.ts`, `src/ai/police/police-visuals.ts`, `src/ai/police/wanted.ts`.
5. **Clases y funciones principales:** `createPolice`, `clearLine`, `createPoliceVisuals`, `createWantedSystem`, `responseLevels`.
6. **Interfaces públicas:** `Location`, `SearchState`, `IncidentKind`, `SuspectDescription`, `ReportMetadata`, `PoliceTarget`, `PoliceObstacle`, `PatrolRole`, `PoliceVisualUnit`, API de `createPolice` (`wanted`, `reportImpact`, `step`, `render`, `takeDetention`, `reset`, `dispose`, `units`, `routes`, `statusLabel`).
7. **Dependencias:** `three`, `src/navigation/road-graph.ts`, `StaticBox` / `SpatialBoxGrid` (`src/physics/physics.ts`, `src/physics/spatial-index.ts`).
8. **Sistemas dependientes:** `src/simulation/engine.ts`, `src/main.ts`, `src/debug/overlay.ts`, `src/audio/audio.ts`, `src/physics/vehicle-obstacles.ts`, `src/core/events.ts`.
9. **Flujo de funcionamiento:** `responseLevels` define unidades (`1..5`), rango base (`35..53 m`) y paciencia (`11..23 s`). Sin testigos, llamadas 911 o visión directa real (`clearLine`), los delitos no alertan mágicamente a la policía. Si el sospechoso cambia de vehículo o sale a pie sin armas fuera de línea de visión policial, `wanted.matchesSuspect(target)` reduce el radio efectivo de reconocimiento (`<= 16 m`, estado `'Búsqueda · Vehículo distinto'`) hasta ser re-identificado de cerca. En `'Investigación'`, `'Búsqueda'` o `'storeSiege'`, unidades cercanas aparcan al aproximarse a `lastKnown` y despliegan un oficial a pie (`foot_search`) con su propio cono visual (`clearLine`). Durante la conducción, las patrullas evitan obstáculos de `traffic.vehicles` (`VB-004`) y validan la huella del chasis contra `SpatialBoxGrid`.
10. **Estructuras de datos relevantes:** `SearchState`, `IncidentKind`, `SuspectDescription`, `Patrol` (`role`, `dismounted`, `officer`, `braking`), `wanted` (`level`, `hasSight`, `lastKnown`, `predicted`, `suspectDescription`, `storeSiege`).
11. **Invariantes:** Cooldown de `2.75 s` entre reportes automáticos no forzados (permitiendo enriquecer descripción/cerco); línea de visión bloqueada por edificios vía `clearLine`; `createPoliceVisuals` usa `4` `InstancedMesh` compartidos y los libera en `police.dispose()`.
12. **Restricciones:** Patroles motorizados sobre `RoadGraph`; agentes a pie exploran en torno a `lastKnown` con sonda lateral sobre `SpatialBoxGrid` hasta `~26 m` de distancia de la patrulla estacionada.
13. **Problemas conocidos:** `VB-004` y `VB-005` resueltos en Fase 6; persiste únicamente `VB-002` (streaming físico Rapier pendiente para Fase 7).
14. **Consideraciones de rendimiento:** `createPoliceVisuals(scene, 8)` reduce hasta 8 patrullas + sus oficiales a pie a `4` draw calls instanciados constantes.
15. **Métodos de verificación:** `tests/police.test.ts` (2 tests), `tests/wanted.test.ts` (2 tests), `tests/combat-and-heists.test.ts` (no omnisciencia y cobertura) y `tests/police-investigation.test.ts` (4 tests: `InstancedMesh` + `dispose()`, evitación de tráfico `VB-004`, memoria descriptiva y cerco en tienda a pie).
16. **Riesgos de modificación:** Alterar `shouldSearchOnFoot` o `matchesSuspect` puede hacer que patrullas sigan de largo sin aparcar o ignoren vehículos fichados.
17. **Referencias relacionadas:** [TRAFFIC_AND_NAVIGATION.md](TRAFFIC_AND_NAVIGATION.md), [VEHICLES.md](VEHICLES.md), [PHYSICS_AND_COLLISIONS.md](PHYSICS_AND_COLLISIONS.md).
18. **Última verificación:** 2026-11-20 (`typecheck`, Vitest `49/49`, `vite build` y Chromium WebGL 2 tras Fase 6).
