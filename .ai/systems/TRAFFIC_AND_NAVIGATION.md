---
document_id: SYSTEM-TRAFFIC-NAV
status: active
last_updated: 2026-11-20
verified_against: "248f8b44b7aebf77fc38a0d5c0bde996e680cec5"
verification_scope: "static-analysis-only"
related_systems: [WORLD_AND_STREAMING, POLICE_AND_WANTED, PHYSICS_AND_COLLISIONS]
related_files:
  - src/navigation/road-graph.ts
  - src/ai/traffic/traffic.ts
  - src/ai/traffic/signals.ts
  - src/ai/traffic/traffic-visuals.ts
---

# Sistema: Navegación Vial, Semáforos y Tráfico (`TRAFFIC_AND_NAVIGATION.md`)

1. **Propósito:** Construir el grafo dirigido de carriles, regular intersecciones mediante semáforos y simular vehículos civiles autónomos con renderizado instanciado.
2. **Estado de implementación:** Implementado y operativo (1 carril por sentido).
3. **Responsabilidades:** Derivar nodos/carriles por mano derecha desde `DistrictMap.roads`, calcular rutas por Dijkstra, controlar fases semafóricas, poblar/despoblar vehículos en torno al foco y renderizarlos con `InstancedMesh`.
4. **Archivos fuente relevantes:** `src/navigation/road-graph.ts`, `src/ai/traffic/traffic.ts`, `src/ai/traffic/signals.ts`, `src/ai/traffic/traffic-visuals.ts`.
5. **Clases y funciones principales:** `buildRoadGraph`, `closestRoadNode`, `findRoadRoute`, `createTraffic`, `createSignals`, `signalAt`, `controlsJunction`, `createTrafficVisuals`.
6. **Interfaces públicas:** `RoadGraph`, `RoadNode`, `RoadLane`, `TrafficObstacle`, `TrafficVisual`, `Signal`, `profiles`.
7. **Dependencias:** `three`, `makeRandom` y `DistrictMap` (`src/world/generation/layout.ts`).
8. **Sistemas dependientes:** `src/main.ts`, `src/ai/police/police.ts` (usa `RoadGraph`, `closestRoadNode`, `findRoadRoute`), `src/debug/overlay.ts`.
9. **Flujo de funcionamiento:** `buildRoadGraph` intersecta corredores `z` y `x` creando `146` nodos (88 en Isla Este, 55 en Tierra Firme Oeste y 3 en Isla Estrella) conectados por 3 puentes (`Puente Norte`, `Calzada Central`, `Puente Sur`) con carriles desplazados a la derecha. `createTraffic` mantiene hasta `19` vehículos de día (`12` noche; máx `23`) entre `16..130 m` del foco (despawn `> 180 m`). Cada coche sigue su carril, evalúa `scan()` con cadencia `0.09–0.24 s`, solicita reserva del cruce (`reserveJunction`) respetando `signalAt` (verde `7.5s`, ámbar `1.5s`, rojo `11s`, desfase `10s` entre ejes) y gira usando curvas Bézier cuadráticas. Si espera `> 3.9 s`, replanifica evitando el carril bloqueado.
10. **Estructuras de datos relevantes:** `profiles` (`prudente`, `normal`, `rápido`), `reserved: Map<string, TrafficVehicle>`, 3 `InstancedMesh` (`shells`, `wheels`, `lights` × 92 instancias) y 2 `InstancedMesh` de semáforos (hasta 24 cruces cercanos).
11. **Invariantes:** Determinismo total con la misma semilla y `obstacles`; `signals.update` y `traffic` comparten el mismo reloj acumulado `clock`.
12. **Restricciones:** 1 carril por sentido sin adelantamientos; movimiento puramente cinemático sin física Rapier bidireccional.
13. **Problemas conocidos:** `VB-007` (reserva exclusiva de cruce entero y Dijkstra `O(V²)`), `VB-004` (policías ignoran coches de tráfico), `VB-012` (radio reducido del jugador al conducir).
14. **Consideraciones de rendimiento:** Muy eficiente en GPU (`5` draw calls totales para todo el tráfico y semáforos). En CPU, `scan()` es `O(N²)` y `signals.update` ordena todos los nodos cada `0.2 s`.
15. **Métodos de verificación:** `tests/traffic.test.ts` (4 tests: grafo, rutas alternativas, fases semafóricas, determinismo, liberación de escena y frenado ante obstáculos).
16. **Riesgos de modificación:** Alterar los márgenes de `insetA/B` o `exitOccupied` puede provocar bloqueos permanentes o solapamientos en giros.
17. **Referencias relacionadas:** [WORLD_AND_STREAMING.md](WORLD_AND_STREAMING.md), [POLICE_AND_WANTED.md](POLICE_AND_WANTED.md).
18. **Última verificación:** 2026-11-20 (análisis estático sobre `248f8b4`).
