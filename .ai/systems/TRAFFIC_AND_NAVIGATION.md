---
document_id: SYSTEM-TRAFFIC-NAV
status: active
last_updated: 2026-11-20
verified_against: "e2288b5"
verification_scope: "typecheck + vitest (37/37) + vite build (Phase 2)"
related_systems: [WORLD_AND_STREAMING, POLICE_AND_WANTED, PHYSICS_AND_COLLISIONS, NPC_AND_PERCEPTION, VEHICLES]
related_files:
  - src/navigation/road-graph.ts
  - src/ai/traffic/traffic.ts
  - src/ai/traffic/signals.ts
  - src/ai/traffic/traffic-visuals.ts
---

# Sistema: Navegación Vial, Semáforos y Tráfico (`TRAFFIC_AND_NAVIGATION.md`)

1. **Propósito:** Construir el grafo dirigido de carriles, regular intersecciones mediante semáforos y simular vehículos civiles autónomos con conductores reales instanciados y posibilidad de robo.
2. **Estado de implementación:** **Implementado con conductores reales visibles (`InstancedMesh`) y robo de vehículos (`hijackNearest`)**.
3. **Responsabilidades:** Derivar nodos/carriles por mano derecha desde `DistrictMap.roads`, calcular rutas por Dijkstra, controlar fases semafóricas, poblar/despoblar vehículos con conductor `NpcIdentity`, permitir detección/secuestro cercano y ceder el paso a peatones en `crosswalk`.
4. **Archivos fuente relevantes:** `src/navigation/road-graph.ts`, `src/ai/traffic/traffic.ts`, `src/ai/traffic/signals.ts`, `src/ai/traffic/traffic-visuals.ts`.
5. **Clases y funciones principales:** `buildRoadGraph`, `closestRoadNode`, `findRoadRoute`, `createTraffic` (`findHijackCandidate`, `hijackNearest`), `createSignals`, `signalAt`, `controlsJunction`, `createTrafficVisuals`.
6. **Interfaces públicas:** `RoadGraph`, `RoadNode`, `RoadLane`, `TrafficObstacle`, `HijackedTrafficVehicle`, `TrafficVisual`, `Signal`, `profiles`.
7. **Dependencias:** `three`, `makeRandom` y `DistrictMap` (`src/world/generation/layout.ts`), `createNpcIdentity` (`src/ai/npc/profiles.ts`).
8. **Sistemas dependientes:** `src/simulation/engine.ts`, `src/ai/police/police.ts`, `src/debug/overlay.ts`.
9. **Flujo de funcionamiento:** `buildRoadGraph` conecta `146` nodos por 3 puentes. `createTraffic` mantiene hasta `19` vehículos de día (`12` noche; máx `23`), cada uno con conductor determinista (`occupied: true`, silueta torso+cabeza en cabina). Si el jugador interactúa cerca de un coche (`<= 3.8 m`, velocidad `<= 12`), `hijackNearest` lo retira del tráfico liberando su cruce y lo entrega a `SimulationEngine`, que instancia el vehículo físico equivalente y expulsa al ex-conductor como NPC real a pie (`driver_displaced`).
10. **Estructuras de datos relevantes:** `profiles` (`prudente`, `normal`, `rápido`), `reserved: Map<string, TrafficVehicle>`, `4` `InstancedMesh` de vehículo (`shells`, `wheels`, `lights`, `drivers`) y `2` `InstancedMesh` de semáforos.
11. **Invariantes:** Determinismo total preservado en rutas/población (`driver` usa semilla aislada sin alterar `random()`); `signals.update` y `traffic` comparten `clock`.
12. **Restricciones:** 1 carril por sentido sin adelantamientos; los vehículos de tráfico siguen cinemática hasta ser robados (entonces pasan a cuerpo físico Rapier en `VehicleManager`).
13. **Problemas conocidos:** `VB-007` (reserva exclusiva de cruce entero y Dijkstra `O(V²)`), `VB-004` (policías ignoran coches de tráfico), `VB-012` (radio reducido al conducir).
14. **Consideraciones de rendimiento:** `6` draw calls totales para tráfico completo (incluyendo conductores) y semáforos; en CPU, `scan()` es `O(N²)`.
15. **Métodos de verificación:** `tests/traffic.test.ts` (4 tests), `tests/urban-life.test.ts` (conductores reales, secuestro `hijackNearest` y expulsión del conductor como NPC).
16. **Riesgos de modificación:** Alterar los márgenes de `insetA/B` o `exitOccupied` puede provocar bloqueos permanentes o solapamientos en giros.
17. **Referencias relacionadas:** [WORLD_AND_STREAMING.md](WORLD_AND_STREAMING.md), [POLICE_AND_WANTED.md](POLICE_AND_WANTED.md), [VEHICLES.md](VEHICLES.md), [NPC_AND_PERCEPTION.md](NPC_AND_PERCEPTION.md).
18. **Última verificación:** 2026-11-20 (`typecheck`, Vitest 37/37 y build tras Fase 2).
