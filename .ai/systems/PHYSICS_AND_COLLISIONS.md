---
document_id: SYSTEM-PHYSICS-COLLISIONS
status: active
last_updated: 2026-11-20
verified_against: "ef1f5d115168a40a89b767658274cc28ac17b8de"
verification_scope: "typecheck-tests-build-phase1"
related_systems: [PLAYER_AND_CAMERA, VEHICLES, WORLD_AND_STREAMING, TRAFFIC_AND_NAVIGATION, NPC_AND_PERCEPTION]
related_files:
  - src/physics/physics.ts
  - src/physics/spatial-index.ts
  - src/physics/vehicle-obstacles.ts
---

# Sistema: Física y Colisiones (`PHYSICS_AND_COLLISIONS.md`)

1. **Propósito:** Proveer simulación física rígida mediante Rapier3D WASM, índice espacial `SpatialBoxGrid`, controlador cinemático del personaje, consultas espaciales de cámara/salida y cuerpos cinemáticos para obstáculos vehiculares cercanos.
2. **Estado de implementación:** Implementado y operativo con `physics.step(dt)` centralizado (`VB-001` resuelto).
3. **Responsabilidades:** Inicializar WASM de Rapier una sola vez (`rapierReady`), crear el `World` (`gravity.y = -19.5`), poblar `StaticBox[]` e indexarlos en `SpatialBoxGrid`, ejecutar un único `world.step(dt)` por tick fijo en `physics.step(dt)`, gestionar el collider cápsula del jugador y sincronizar cuboides cinemáticos para tráfico/patrullas cercanos.
4. **Archivos fuente relevantes:** `src/physics/physics.ts`, `src/physics/spatial-index.ts`, `src/physics/vehicle-obstacles.ts`.
5. **Clases y funciones principales:** `createPhysics` (`step`, `spatial`), `createSpatialBoxGrid`, `SpatialBoxGrid` (`raycast`, `clearLine`, `queryRadius`), `createCharacterCollider` (`prepareMove`, `move`), `createCameraClearance`, `createExitClearance`, `createVehicleObstacles`.
6. **Interfaces públicas:** `StaticBox`, `Point3`, `Physics`, `SpatialBoxGrid`, `SpatialRaycastHit`, `RoadVehiclePosition`.
7. **Dependencias:** `@dimforge/rapier3d-compat`.
8. **Sistemas dependientes:** `src/main.ts`, `src/player/player.ts`, `src/vehicles/vehicle.ts`, `src/ai/police/police.ts`, `src/ai/perception.ts`.
9. **Flujo de funcionamiento:** `createPhysics` crea todos los `StaticBox` estáticos en Rapier, construye `physics.spatial` (`SpatialBoxGrid` con celdas `32 m`, omitiendo losas planas `y + halfY <= 0.05`) y ejecuta un `world.step()` inicial. En cada tick fijo de `main.ts`, `player.prepareStep()` y `vehicle.prepareStep()` preparan traslaciones/velocidades sin llamar a `world.step()`; después `physics.step(dt)` avanza el mundo una sola vez; finalmente `finishStep()` lee `grounded`, `speed` y poses sincronizadas. Se conservan `move()`/`step()` como envoltorios compatibles para pruebas aisladas. `createCameraClearance`, `createExitClearance` y `createVehicleObstacles` mantienen su comportamiento previo.
10. **Estructuras de datos relevantes:** `SpatialBoxGrid` (celdas `32×32 m`, sello `Uint32Array` para consultas sin asignaciones recurrentes); cápsula jugador (`radius = 0.32`, `halfHeight = 0.58`, `skin = 0.025`, `CENTER_FROM_FEET = 0.925`); `bodies: Map<string | number, RAPIER.RigidBody>`.
11. **Invariantes:** `physics.step(dt)` recibe `dt` fijo (`1/60 s`) exactamente una vez por tick en el bucle principal. Las consultas de raycast/shape excluyen sensores y el collider propio (`excluded`).
12. **Restricciones:** Sin streaming de colisionadores estáticos en Rapier todavía (`VB-002` parcial); los obstáculos de `vehicle-obstacles.ts` son unidireccionales.
13. **Problemas conocidos:** `VB-002` (colisionadores estáticos residentes en memoria Rapier aunque LOS ya es `O(celdas)`), `VB-009` (`new Set()` asignado por tick en `vehicle-obstacles.ts`).
14. **Consideraciones de rendimiento:** `SpatialBoxGrid` evita recorrer miles de cajas estáticas en consultas de línea de visión policial y percepción NPC; `vehicle-obstacles.ts` limita los cuerpos cinemáticos activos al radio de `36/46 m`.
15. **Métodos de verificación:** `tests/player.test.ts` (4 tests), `tests/vehicle.test.ts` (5 tests), `tests/events-and-entities.test.ts` (4 tests, incluye `SpatialBoxGrid` y `physics.step`).
16. **Riesgos de modificación:** Alterar el orden `prepareStep → physics.step → finishStep` en `main.ts` o modificar `CENTER_FROM_FEET` / `createExitClearance` puede causar lecturas con un tick de desfase o bloqueos al salir del vehículo.
17. **Referencias relacionadas:** [DECISIONS.md](../DECISIONS.md) (`ADR-0005`, `ADR-0006`).
18. **Última verificación:** 2026-11-20 (`typecheck`, Vitest y build tras Fase 1).

