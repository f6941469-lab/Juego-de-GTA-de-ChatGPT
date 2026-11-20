---
document_id: SYSTEM-PHYSICS-COLLISIONS
status: active
last_updated: 2026-11-20
verified_against: "248f8b44b7aebf77fc38a0d5c0bde996e680cec5"
verification_scope: "static-analysis-only"
related_systems: [PLAYER_AND_CAMERA, VEHICLES, WORLD_AND_STREAMING, TRAFFIC_AND_NAVIGATION]
related_files:
  - src/physics/physics.ts
  - src/physics/vehicle-obstacles.ts
---

# Sistema: Física y Colisiones (`PHYSICS_AND_COLLISIONS.md`)

1. **Propósito:** Proveer simulación física rígida mediante Rapier3D WASM, controlador cinemático del personaje, consultas espaciales de cámara/salida y cuerpos cinemáticos para obstáculos vehiculares cercanos.
2. **Estado de implementación:** Implementado y operativo (con acoplamiento de `world.step()`).
3. **Responsabilidades:** Inicializar WASM de Rapier una sola vez (`rapierReady`), crear el `World` (`gravity.y = -19.5`), poblar `StaticBox[]`, gestionar el collider cápsula del jugador y sincronizar cuboides cinemáticos para tráfico/patrullas cercanos.
4. **Archivos fuente relevantes:** `src/physics/physics.ts`, `src/physics/vehicle-obstacles.ts`.
5. **Clases y funciones principales:** `createPhysics`, `createCharacterCollider`, `createCameraClearance`, `createExitClearance`, `createVehicleObstacles`.
6. **Interfaces públicas:** `StaticBox`, `Point3`, `Physics`, `RoadVehiclePosition`.
7. **Dependencias:** `@dimforge/rapier3d-compat`.
8. **Sistemas dependientes:** `src/main.ts`, `src/player/player.ts`, `src/vehicles/vehicle.ts`.
9. **Flujo de funcionamiento:** `createPhysics` crea todos los `StaticBox` estáticos y ejecuta un `world.step()` inicial para poblar el broad-phase. El jugador usa un `KinematicPositionBased` + `CharacterController` (`autostep 0.23m`, `snapToGround 0.19m`). `createCameraClearance` lanza `world.castShape` con esfera `0.23 m`. `createExitClearance` verifica suelo (`normal.y >= 0.65`), cápsula libre y rayo puerta-destino. `createVehicleObstacles` crea/mueve cuboides cinemáticos (`0.87×0.48×1.72`) para tráfico/patrullas dentro de `36 m` (retira a `> 46 m`).
10. **Estructuras de datos relevantes:** Cápsula jugador (`radius = 0.32`, `halfHeight = 0.58`, `skin = 0.025`, `CENTER_FROM_FEET = 0.925`); `bodies: Map<string | number, RAPIER.RigidBody>`.
11. **Invariantes:** `world.step()` recibe `dt` fijo (`1/60 s`). Las consultas de raycast/shape excluyen sensores y el collider propio (`excluded`).
12. **Restricciones:** Sin streaming de colisionadores estáticos; los obstáculos de `vehicle-obstacles.ts` son unidireccionales (empujan al jugador/coche, pero la IA de tráfico/policía no lee fuerzas de Rapier).
13. **Problemas conocidos:** `VB-001` (`character.move()` llama a `world.step()` al igual que `vehicle.step()`), `VB-002` (colisionadores estáticos permanentes), `VB-009` (`new Set()` asignado por tick en `vehicle-obstacles.ts`).
14. **Consideraciones de rendimiento:** `vehicle-obstacles.ts` limita los cuerpos cinemáticos activos al radio de `36/46 m` alrededor del foco; el coste principal futuro vendrá de mantener miles de `StaticBox` en el broad-phase de Rapier.
15. **Métodos de verificación:** `tests/player.test.ts` (4 tests), `tests/vehicle.test.ts` (5 tests).
16. **Riesgos de modificación:** Cambiar `CENTER_FROM_FEET`, `CAPSULE_*` o reglas de `createExitClearance` puede provocar bloqueos al salir del vehículo o atravesamiento de suelos.
17. **Referencias relacionadas:** [DECISIONS.md](../DECISIONS.md) (`ADR-0005`, `ADR-0006`).
18. **Última verificación:** 2026-11-20 (análisis estático sobre `248f8b4`).
