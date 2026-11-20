---
document_id: SYSTEM-PLAYER-CAMERA
status: active
last_updated: 2026-11-20
verified_against: "248f8b44b7aebf77fc38a0d5c0bde996e680cec5"
verification_scope: "static-analysis-only"
related_systems: [PHYSICS_AND_COLLISIONS, VEHICLES, CORE_AND_INPUT]
related_files:
  - src/player/player.ts
  - src/player/follow-camera.ts
  - src/characters/avatar.ts
---

# Sistema: Jugador, Avatar y Cámara (`PLAYER_AND_CAMERA.md`)

1. **Propósito:** Controlar el desplazamiento a pie del jugador, la transición dentro/fuera de vehículos, el avatar cúbico articulado y la cámara en tercera persona.
2. **Estado de implementación:** Implementado y operativo.
3. **Responsabilidades:** Integrar movimiento horizontal amortiguado, salto con *jump buffer* y *coyote time*, interpolar posición/rumbo visual, animar extremidades y mantener la cámara libre de obstrucciones.
4. **Archivos fuente relevantes:** `src/player/player.ts`, `src/player/follow-camera.ts`, `src/characters/avatar.ts`.
5. **Clases y funciones principales:** `createPlayer`, `createFollowCamera`, `createAvatar`.
6. **Interfaces públicas:** `MovementInput`, `CameraClearFraction`, `VehicleCamera`, `AvatarPose`.
7. **Dependencias:** `three`, `src/physics/physics.ts`.
8. **Sistemas dependientes:** `src/main.ts`, `src/vehicles/vehicle.ts`.
9. **Flujo de funcionamiento:** En `step(dt, input)`, si `ride` está definido retorna inmediatamente; a pie proyecta `input.(x, z)` respecto a `follow.yaw`, aplica aceleración (`17` en suelo, `7.5` aire), gravedad y `character.move()`. Si `position.y < -16` resetea al spawn. En `render(alpha, dt)`, si conduce actualiza `follow.update(ride.position, dt, ride)`; si va a pie interpola `position`/`heading`, oculta el avatar si `cameraDistance <= 0.75` y anima `hips/torso/head/arms/legs`.
10. **Estructuras de datos relevantes:** `WALK_SPEED = 4.4`, `RUN_SPEED = 7.25`, `JUMP_SPEED = 6.1`, `JUMP_BUFFER = 0.125`, `COYOTE_TIME = 0.09`, `CAMERA_DISTANCE = 5.15` (`8.25` en coche).
11. **Invariantes:** Interpolación angular siempre por el arco más corto (`turnDelta`); `character.setEnabled(false)` al subir a un coche; `avatar` oculto mientras conduce.
12. **Restricciones:** Diseñado para un único jugador local y una única cámara activa.
13. **Problemas conocidos:** `VB-006` (pies a `y = 0` se hunden `4.9 cm` en acera visual), `VB-012` (`player.render()` depende de que `vehicle.render()` corra antes), `VB-013` (`player` no expone `grounded` hacia `main.ts` para audio de salto/pasos).
14. **Consideraciones de rendimiento:** `avatar.ts` reutiliza un único `BoxGeometry` y 12 `MeshStandardMaterial`s propios por instancia (no instanciado porque solo hay 1 jugador).
15. **Métodos de verificación:** `tests/player.test.ts` (4 tests que validan caminar, correr, reset, salto, colisión con muro y cámara tras obstáculo).
16. **Riesgos de modificación:** Cambiar `follow.yaw` o signos de `turnDelta` rompe la alineación movimiento-cámara (`0 = -Z`, `+θ -> +X`).
17. **Referencias relacionadas:** [VEHICLES.md](VEHICLES.md), [PHYSICS_AND_COLLISIONS.md](PHYSICS_AND_COLLISIONS.md).
18. **Última verificación:** 2026-11-20 (análisis estático sobre `248f8b4`).
