---
document_id: SYSTEM-VEHICLES
status: active
last_updated: 2026-11-20
verified_against: "248f8b44b7aebf77fc38a0d5c0bde996e680cec5"
verification_scope: "static-analysis-only"
related_systems: [PHYSICS_AND_COLLISIONS, PLAYER_AND_CAMERA, POLICE_AND_WANTED]
related_files:
  - src/vehicles/vehicle.ts
  - src/vehicles/vehicle-model.ts
---

# Sistema: Vehículos y Conducción (`VEHICLES.md`)

1. **Propósito:** Simular el vehículo conducible del jugador (`Rayo GT`) y generar los modelos 3D procedurales reutilizados también por las patrullas policiales.
2. **Estado de implementación:** Implementado para un único vehículo del jugador (`Rayo GT`); múltiples vehículos conducibles o robo de tráfico no implementados.
3. **Responsabilidades:** Gestionar embarque/desembarque con comprobación de espacio, dinámica de aceleración/freno/reversa/dirección/derrape lateral, detección de magnitud de impacto y representación visual (ruedas, faros, freno, sirena).
4. **Archivos fuente relevantes:** `src/vehicles/vehicle.ts`, `src/vehicles/vehicle-model.ts`.
5. **Clases y funciones principales:** `createVehicle`, `createVehicleModel`, `hullGeometry`, `vehicleDimensions`.
6. **Interfaces públicas:** `vehicleDimensions`, API de `createVehicle` (`canInteract`, `interact`, `step`, `render`, `setLights`, `reset`, `dispose`), API de `createVehicleModel`.
7. **Dependencias:** `@dimforge/rapier3d-compat`, `three`, `src/physics/physics.ts`.
8. **Sistemas dependientes:** `src/main.ts`, `src/ai/police/police.ts` (usa `createVehicleModel`).
9. **Flujo de funcionamiento:** Aparcado, el cuerpo Rapier es `Fixed`. Al embarcar (`interact`), cambia a `Dynamic` con rotación bloqueada en X/Z (`setEnabledRotations(false, true, false, true)`), desactiva al jugador y entrega `cameraTarget`. En `step(dt, input)`, calcula velocidad longitudinal/lateral, dirección Ackermann simplificada (`tan(steering)/WHEELBASE`), decae deslizamiento lateral (`exp(-9.5*dt)`, o `-2.6*dt` con freno de mano), aplica `setLinvel`/`setAngvel`, llama `world.step()` y mide `impact` como diferencia entre velocidad comandada y velocidad resultante post-colisión. Al salir (`speed <= 1.1`), prueba puertas izquierda/derecha con `exitClearance`.
10. **Estructuras de datos relevantes:** `vehicleDimensions` (`halfWidth: 0.94`, `halfLength: 1.96`, `hullHeight: 1.04`), `TOP_FORWARD_SPEED = 25`, `TOP_REVERSE_SPEED = 7.5`, `WHEELBASE = 2.44`.
11. **Invariantes:** `exitVehicle` solo ocurre si `speed <= STOP_SPEED` y `findExit() !== null`; masa `1160 kg`, CCD activado (`setCcdEnabled(true)`).
12. **Restricciones:** Sin inclinación/suspensión física X/Z; rotación puramente plana en `Y`.
13. **Problemas conocidos:** `VB-001` (`step()` llama `world.step()`), `VB-005` (`createVehicleModel` crea geometrías y materiales nuevos en cada llamada, afectando a patrullas), `VB-012` (radio reducido en `main.ts` al conducir y dependencia de orden `vehicle.render()` -> `player.render()`).
14. **Consideraciones de rendimiento:** Aceptable para 1 coche de jugador; costoso si se instancia por cada patrulla sin compartir geometrías/materiales.
15. **Métodos de verificación:** `tests/vehicle.test.ts` (5 tests: conducción, cámara, reversa, reset, colisión con muro, validación de salida por puerta libre/bloqueada y colisión con tráfico cinemático).
16. **Riesgos de modificación:** Cambiar fricción (`0.08`, `Min`) o `setLinvel` altera la sensibilidad de `impact` (usado para salud y alerta policial).
17. **Referencias relacionadas:** [PHYSICS_AND_COLLISIONS.md](PHYSICS_AND_COLLISIONS.md), [PLAYER_AND_CAMERA.md](PLAYER_AND_CAMERA.md).
18. **Última verificación:** 2026-11-20 (análisis estático sobre `248f8b4`).
