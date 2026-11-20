---
document_id: SYSTEM-VEHICLES
status: active
last_updated: 2026-11-20
verified_against: "96ef8fc-dirty (Phase 4 working tree)"
verification_scope: "typecheck + vitest (43/43) + vite build (Phase 4)"
related_systems: [PHYSICS_AND_COLLISIONS, PLAYER_AND_CAMERA, POLICE_AND_WANTED, TRAFFIC_AND_NAVIGATION]
related_files:
  - src/vehicles/vehicle.ts
  - src/vehicles/vehicle-manager.ts
  - src/vehicles/vehicle-model.ts
---

# Sistema: Vehículos y Conducción (`VEHICLES.md`)

1. **Propósito:** Simular vehículos conducibles del jugador (`Rayo GT` y vehículos robados al tráfico) y generar los modelos 3D procedurales reutilizados también por las patrullas policiales.
2. **Estado de implementación:** **Implementado con multi-vehículo (`vehicle-manager.ts`) y modelo real de salud/daño mecánico (Fase 4)**.
3. **Responsabilidades:** Gestionar hasta `4` vehículos conducibles persistentes en escena (`Rayo GT` + últimos vehículos secuestrados), embarque/desembarque con comprobación de espacio, herencia de velocidad en `boardImmediate`, dinámica de aceleración/freno/reversa/dirección/derrape lateral, degradación de velocidad máxima y humo tras daños/impactos (`health`, `damage`, `wrecked`, `applyDamage`), y representación visual (ruedas, faros, freno, sirena).
4. **Archivos fuente relevantes:** `src/vehicles/vehicle.ts`, `src/vehicles/vehicle-manager.ts`, `src/vehicles/vehicle-model.ts`.
5. **Clases y funciones principales:** `createVehicle`, `createVehicleManager`, `createVehicleModel`, `hullGeometry`, `vehicleDimensions`.
6. **Interfaces públicas:** `VehicleSpawn`, `DrivableVehicle`, `vehicleDimensions`, API de `createVehicle` (`health`, `damage`, `wrecked`, `applyDamage`, `canInteract`, `interact`, `boardImmediate`, `prepareStep`, `finishStep`, `step`, `render`, `setLights`, `reset`, `dispose`), API de `createVehicleManager`.
7. **Dependencias:** `@dimforge/rapier3d-compat`, `three`, `src/physics/physics.ts`.
8. **Sistemas dependientes:** `src/simulation/engine.ts`, `src/main.ts`, `src/ai/police/police.ts` (usa `createVehicleModel`).
9. **Flujo de funcionamiento:** Aparcado, cada cuerpo Rapier es `Fixed` (`0` coste dinámico). Al embarcar (`interact` o `boardImmediate` tras secuestrar un coche de tráfico), cambia a `Dynamic` con rotación bloqueada en X/Z (`setEnabledRotations(false, true, false, true)`), desactiva al jugador y entrega `cameraTarget`. `prepareStep` prepara velocidades antes del `physics.step(dt)` centralizado escalando la punta (`25 -> 15.5 m/s`) según daño y frenando si `wrecked`; `finishStep` lee pose e `impact` después. `SimulationEngine` emite humo instanciado cuando `damage > 0.35`. `createVehicleManager` mantiene el `Rayo GT` inicial y recicla vehículos robados antiguos cuando el pool supera `4`.
10. **Estructuras de datos relevantes:** `vehicleDimensions` (`halfWidth: 0.94`, `halfLength: 1.96`, `hullHeight: 1.04`), `TOP_FORWARD_SPEED = 25`, `TOP_REVERSE_SPEED = 7.5`, `WHEELBASE = 2.44`.
11. **Invariantes:** `exitVehicle` solo ocurre si `speed <= STOP_SPEED` (o `health <= 0`) y `findExit() !== null`; masa `1160 kg`, CCD activado (`setCcdEnabled(true)`).
12. **Restricciones:** Sin inclinación/suspensión física X/Z; rotación puramente plana en `Y`.
13. **Problemas conocidos:** `VB-005` (`createVehicleModel` crea geometrías/materiales nuevos por instancia, afectando sobre todo patrullas), `VB-012` (radio reducido al conducir y dependencia de orden `render()`). (`VB-001` resuelto).
14. **Consideraciones de rendimiento:** Solo el vehículo actualmente conducido es `Dynamic` en Rapier; los vehículos aparcados permanecen `Fixed`.
15. **Métodos de verificación:** `tests/vehicle.test.ts` (5 tests), `tests/events-and-entities.test.ts` (paso simultáneo jugador+vehículo), `tests/urban-life.test.ts` (coexistencia multi-vehículo tras robo de tráfico) y `tests/destructibles-and-accidents.test.ts`.
16. **Riesgos de modificación:** Cambiar fricción (`0.08`, `Min`) o `setLinvel` altera la sensibilidad de `impact` (usado para salud, daños vehiculares, `vehicle_collision` y alerta policial).
17. **Referencias relacionadas:** [PHYSICS_AND_COLLISIONS.md](PHYSICS_AND_COLLISIONS.md), [PLAYER_AND_CAMERA.md](PLAYER_AND_CAMERA.md), [TRAFFIC_AND_NAVIGATION.md](TRAFFIC_AND_NAVIGATION.md).
18. **Última verificación:** 2026-11-20 (`typecheck`, Vitest 43/43 y build tras Fase 4).

