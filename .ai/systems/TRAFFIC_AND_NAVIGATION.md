---
document_id: SYSTEM-TRAFFIC-NAV
status: active
last_updated: 2026-11-20
verified_against: "96ef8fc-dirty (Phase 4 working tree)"
verification_scope: "typecheck + vitest (43/43) + vite build (Phase 4)"
related_systems: [WORLD_AND_STREAMING, POLICE_AND_WANTED, PHYSICS_AND_COLLISIONS, NPC_AND_PERCEPTION, VEHICLES]
related_files:
  - src/navigation/road-graph.ts
  - src/ai/traffic/traffic.ts
  - src/ai/traffic/signals.ts
  - src/ai/traffic/traffic-visuals.ts
---

# Sistema: Navegación Vial, Semáforos y Tráfico (`TRAFFIC_AND_NAVIGATION.md`)

1. **Propósito:** Construir el grafo dirigido de carriles, regular intersecciones mediante semáforos y simular vehículos civiles autónomos con conductores reales instanciados, robo vehicular y accidentes con huida/reacción ciudadana.
2. **Estado de implementación:** **Implementado con conductores reales visibles (`InstancedMesh`), robo de vehículos (`hijackNearest`) y accidentes con daños e inmovilización (Fase 4)**.
3. **Responsabilidades:** Derivar nodos/carriles por mano derecha desde `DistrictMap.roads`, calcular rutas por Dijkstra, controlar fases semafóricas, poblar/despoblar vehículos con conductor `NpcIdentity`, permitir detección/secuestro cercano, resolver colisiones/impactos balísticos (`damageVehicle`, `resolveVehicleCrash`) con eyección del conductor (`driver_displaced`), y ceder el paso a peatones en `crosswalk`.
4. **Archivos fuente relevantes:** `src/navigation/road-graph.ts`, `src/ai/traffic/traffic.ts`, `src/ai/traffic/signals.ts`, `src/ai/traffic/traffic-visuals.ts`.
5. **Clases y funciones principales:** `buildRoadGraph`, `closestRoadNode`, `findRoadRoute`, `createTraffic` (`findHijackCandidate`, `hijackNearest`, `damageVehicle`, `resolveVehicleCrash`), `createSignals`, `signalAt`, `controlsJunction`, `createTrafficVisuals`.
6. **Interfaces públicas:** `RoadGraph`, `RoadNode`, `RoadLane`, `TrafficObstacle`, `HijackedTrafficVehicle`, `TrafficDamageResult`, `TrafficVisual`, `Signal`, `profiles`.
7. **Dependencias:** `three`, `makeRandom` y `DistrictMap` (`src/world/generation/layout.ts`), `createNpcIdentity` (`src/ai/npc/profiles.ts`).
8. **Sistemas dependientes:** `src/simulation/engine.ts`, `src/ai/police/police.ts`, `src/debug/overlay.ts`.
9. **Flujo de funcionamiento:** `buildRoadGraph` conecta `146` nodos por 3 puentes. `createTraffic` mantiene hasta `19` vehículos de día (`12` noche; máx `23`), cada uno con conductor determinista (`occupied: true`, `health: 100`). Si el jugador interactúa cerca de un coche no siniestrado (`<= 3.8 m`, velocidad `<= 12`), `hijackNearest` lo retira del tráfico liberando su cruce. Ante disparos o choques fuertes (`resolveVehicleCrash`), el vehículo sufre daño visual (`damage` tint oscuro y luces de emergencia traseras en `traffic-visuals.ts`); al caer de `health <= 45` queda `wrecked`, evacua a su conductor como NPC real a pie (`fromAccident: true`, estado `scared`/`calling_help`), emite `'traffic_accident'` en `WorldEventBus`, genera humo y atrae transeúntes cercanos (`inspectingAccident`).
10. **Estructuras de datos relevantes:** `profiles` (`prudente`, `normal`, `rápido`), `reserved: Map<string, TrafficVehicle>`, `4` `InstancedMesh` de vehículo (`shells`, `wheels`, `lights`, `drivers`) y `2` `InstancedMesh` de semáforos.
11. **Invariantes:** Determinismo total preservado en rutas/población (`driver` usa semilla aislada sin alterar `random()`); `signals.update` y `traffic` comparten `clock`; coches `wrecked` no pueden robarse y se reciclan tras expirar `accidentTimer` fuera de vista (`> 48 m`).
12. **Restricciones:** 1 carril por sentido sin adelantamientos; los vehículos de tráfico siguen cinemática hasta ser robados (entonces pasan a cuerpo físico Rapier en `VehicleManager`).
13. **Problemas conocidos:** `VB-007` (reserva exclusiva de cruce entero y Dijkstra `O(V²)`), `VB-004` (policías ignoran coches de tráfico), `VB-012` (radio reducido al conducir).
14. **Consideraciones de rendimiento:** `6` draw calls totales para tráfico completo (incluyendo conductores) y semáforos; en CPU, `scan()` es `O(N²)`.
15. **Métodos de verificación:** `tests/traffic.test.ts` (4 tests), `tests/urban-life.test.ts` (conductores reales, secuestro `hijackNearest` y expulsión del conductor como NPC) y `tests/destructibles-and-accidents.test.ts` (`traffic_accident`, eyección y humo).
16. **Riesgos de modificación:** Alterar los márgenes de `insetA/B` o `exitOccupied` puede provocar bloqueos permanentes o solapamientos en giros.
17. **Referencias relacionadas:** [WORLD_AND_STREAMING.md](WORLD_AND_STREAMING.md), [POLICE_AND_WANTED.md](POLICE_AND_WANTED.md), [VEHICLES.md](VEHICLES.md), [NPC_AND_PERCEPTION.md](NPC_AND_PERCEPTION.md).
18. **Última verificación:** 2026-11-20 (`typecheck`, Vitest 43/43 y build tras Fase 4).
