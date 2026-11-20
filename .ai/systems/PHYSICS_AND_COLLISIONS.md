---
document_id: SYSTEM-PHYSICS-COLLISIONS
status: active
last_updated: 2026-11-20
verified_against: "173aa01-dirty (Phase 7 working tree)"
verification_scope: "typecheck + vitest (53/53) + vite build + Chromium WebGL 2 (Phase 7)"
related_systems: [PLAYER_AND_CAMERA, VEHICLES, WORLD_AND_STREAMING, TRAFFIC_AND_NAVIGATION, NPC_AND_PERCEPTION]
related_files:
  - src/physics/physics.ts
  - src/physics/spatial-index.ts
  - src/physics/vehicle-obstacles.ts
---

# Sistema: Física y Colisiones (`PHYSICS_AND_COLLISIONS.md`)

1. **Propósito:** Proveer simulación física rígida mediante Rapier3D WASM, streaming físico de colisionadores estáticos, índice espacial `SpatialBoxGrid`, controlador cinemático del personaje, consultas espaciales de cámara/salida y cuerpos cinemáticos para obstáculos vehiculares cercanos.
2. **Estado de implementación:** Fase 7 completada: `physics.step(dt)` centralizado (`VB-001`), streaming espacial de colisionadores en Rapier (`streamFocus`, `VB-002` resuelto) y reutilización de estructuras en `vehicle-obstacles.ts` (`VB-009` resuelto).
3. **Responsabilidades:** Inicializar WASM de Rapier (`rapierReady`), crear el `World` (`gravity.y = -19.5`), gestionar colisionadores estáticos activos dentro de `streamingRadius` (`112 m` en `main.ts`, histéresis `+16 m`), mantener `SpatialBoxGrid` completo en memoria, ejecutar un único `world.step(dt)` por tick fijo y sincronizar obstáculos vehiculares cercanos sin asignaciones recurrentes.
4. **Archivos fuente relevantes:** `src/physics/physics.ts`, `src/physics/spatial-index.ts`, `src/physics/vehicle-obstacles.ts`.
5. **Clases y funciones principales:** `createPhysics` (`step`, `streamFocus`, `spatial`, `activeStaticColliders`, `totalStaticColliders`, `dispose`), `createSpatialBoxGrid`, `SpatialBoxGrid`, `createCharacterCollider`, `createCameraClearance`, `createExitClearance`, `createVehicleObstacles`.
6. **Interfaces públicas:** `StaticBox`, `Point3`, `PhysicsOptions`, `Physics`, `SpatialBoxGrid`, `SpatialRaycastHit`, `RoadVehiclePosition`.
7. **Dependencias:** `@dimforge/rapier3d-compat`.
8. **Sistemas dependientes:** `src/main.ts`, `src/simulation/engine.ts`, `src/player/player.ts`, `src/vehicles/vehicle.ts`, `src/ai/police/police.ts`, `src/ai/perception.ts`.
9. **Flujo de funcionamiento:** Cuando se pasa `{ streamingRadius, initialFocus }`, `createPhysics` solo monta en Rapier las cajas cuya distancia AABB 2D al foco es `<= streamingRadius` y `engine.ts` invoca `physics.streamFocus(position.x, position.z)` al avanzar (`>= 8 m` de umbral), reduciendo en Costa Palmera de `514` a `131` colisionadores activos en el arranque. Sin `streamingRadius`, monta todas las cajas por compatibilidad con pruebas aisladas. `physics.spatial` (`SpatialBoxGrid`) conserva todo el mapa para LOS/balística sin omnisciencia.
10. **Estructuras de datos relevantes:** `ManagedBox[]` + `SpatialBoxGrid` (celdas `32×32 m`, sello `Uint32Array`); `present`/`position`/`rotation` preasignados en `vehicle-obstacles.ts`.
11. **Invariantes:** `physics.step(dt)` recibe `dt` fijo (`1/60 s`) exactamente una vez por tick; `streamFocus(..., true)` restaura la ventana física en `SimulationEngine.reset()`.
12. **Restricciones:** Los obstáculos de `vehicle-obstacles.ts` son cinemáticos unidireccionales.
13. **Problemas conocidos:** `VB-001`, `VB-002` y `VB-009` resueltos en Fases 1 y 7.
14. **Consideraciones de rendimiento:** Streaming físico con umbral `8 m` e histéresis `+16 m` evita thrashing; `vehicle-obstacles.ts` limita cuerpos activos al radio `36/46 m` con cero asignaciones de `Set`/pose por tick.
15. **Métodos de verificación:** `tests/player.test.ts` (4), `tests/vehicle.test.ts` (5), `tests/events-and-entities.test.ts` (4), `tests/optimization-and-streaming.test.ts` (streaming Rapier + E2E) y F3 en Chromium (`131 colisionadores`).
16. **Riesgos de modificación:** Alterar el orden `prepareStep → physics.step → finishStep` o la histéresis de `streamFocus` puede causar caídas o desajustes al entrar en edificios/coches.
17. **Referencias relacionadas:** [DECISIONS.md](../DECISIONS.md) (`ADR-0005`, `ADR-0006`, `ADR-0014`).
18. **Última verificación:** 2026-11-20 (`typecheck`, Vitest `53/53`, build y Chromium WebGL 2 tras Fase 7).


