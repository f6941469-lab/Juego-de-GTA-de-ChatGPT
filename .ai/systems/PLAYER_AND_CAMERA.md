---
document_id: SYSTEM-PLAYER-CAMERA
status: archived
last_updated: 2026-11-20
verified_against: "45aefd3-dirty (Phase 3 working tree)"
verification_scope: "typecheck + vitest (40/40) + vite build (Phase 3)"
related_systems: [PHYSICS_AND_COLLISIONS, VEHICLES, CORE_AND_INPUT]
related_files:
  - src/player/player.ts
  - src/player/follow-camera.ts
  - src/player/weapons.ts
  - src/characters/avatar.ts
---


> ARCHIVO HISTÓRICO DEL SISTEMA ANTERIOR (hasta `d565cdc`). Desde 0.3.0 estos contratos no describen el código activo. Consulta [.ai/CURRENT_STATE.md](../CURRENT_STATE.md) y `.ai/SIMULATION.md` para la versión Mercado Palma.

# Sistema: Jugador, Avatar y Cámara (`PLAYER_AND_CAMERA.md`)

1. **Propósito:** Controlar el desplazamiento a pie del jugador, el apuntado/armamento en mano, la transición dentro/fuera de vehículos, el avatar cúbico articulado y la cámara en tercera persona.
2. **Estado de implementación:** Implementado y operativo (Fase 3: soporte completo de armas, apuntado, recarga, trazadores balísticos y pose de tiro).
3. **Responsabilidades:** Integrar movimiento horizontal amortiguado, salto con *jump buffer* y *coyote time*, interpolar posición/rumbo visual (orientándose hacia `aimYaw` al apuntar), animar extremidades/brazos con arma visible, evaluar balística contra `SpatialBoxGrid`/entidades y mantener la cámara libre de obstrucciones.
4. **Archivos fuente relevantes:** `src/player/player.ts`, `src/player/follow-camera.ts`, `src/player/weapons.ts`, `src/characters/avatar.ts`.
5. **Clases y funciones principales:** `createPlayer`, `createFollowCamera`, `createWeaponSystem`, `weaponSpecs`, `createAvatar`.
6. **Interfaces públicas:** `MovementInput`, `CameraClearFraction`, `VehicleCamera`, `AvatarPose`, `WeaponId`, `WeaponSpec`, `WeaponHudSnapshot`, `WeaponShotResult`, `WeaponImpactTarget`.
7. **Dependencias:** `three`, `src/physics/physics.ts`, `src/physics/spatial-index.ts`.
8. **Sistemas dependientes:** `src/simulation/engine.ts`, `src/main.ts`, `src/vehicles/vehicle.ts`.
9. **Flujo de funcionamiento:** En `step(dt, input)`, si `ride` está definido retorna inmediatamente; a pie proyecta `input.(x, z)` respecto a `follow.yaw`, aplica aceleración (`17` en suelo, `7.5` aire), gravedad y `character.move()`. Al llamar a `setAimPose(true, weapon)`, el rumbo se alinea suavemente con `follow.yaw` (`aimYaw`). `createWeaponSystem` gestiona 3 ranuras (`unarmed`, `pistol`, `carbine`), cargador/reserva, retraso de desenfundado (`0.14 s`), recarga, raycast contra muros (`SpatialBoxGrid` con `minY: 1.15, maxY: 1.8`) e impactos 2D sobre NPCs/tráfico más trazadores instanciados (`InstancedMesh`). En `render(alpha, dt)`, si conduce actualiza `follow.update(ride.position, dt, ride)`; si va a pie interpola `position`/`heading`, oculta el avatar si `cameraDistance <= 0.75` y anima `hips/torso/head/arms/legs` + malla de arma en mano derecha (`carbineBarrel`).
10. **Estructuras de datos relevantes:** `WALK_SPEED = 4.4`, `RUN_SPEED = 7.25`, `JUMP_SPEED = 6.1`, `JUMP_BUFFER = 0.125`, `COYOTE_TIME = 0.09`, `CAMERA_DISTANCE = 5.15` (`8.25` en coche); `weaponSpecs` (`pistol`: `12/48`, `28` daño, `56 m`; `carbine`: `24/96`, `22` daño, `76 m`).
11. **Invariantes:** Interpolación angular siempre por el arco más corto (`turnDelta`); `character.setEnabled(false)` al subir a un coche; `avatar` oculto mientras conduce; un muro bloquea cualquier rayo balístico más allá de su fracción de impacto.
12. **Restricciones:** Diseñado para un único jugador local y una única cámara activa; balas policiales también renderizan trazadores compartidos vía `weapons.addTracer()`.
13. **Problemas conocidos:** `VB-006` (pies a `y = 0` se hunden `4.9 cm` en acera visual), `VB-012` (`player.render()` depende de que `vehicle.render()` corra antes), `VB-013` (`player` no expone `grounded` hacia sistemas externos de audio).
14. **Consideraciones de rendimiento:** `avatar.ts` reutiliza un único `BoxGeometry` y materiales propios por instancia; `weapons.ts` dibuja hasta `28` trazadores activos con un único `InstancedMesh` y dispone geometría/material en `dispose()`.
15. **Métodos de verificación:** `tests/player.test.ts` (4 tests) y `tests/combat-and-heists.test.ts` (balística detenida por muros, daño NPC y trazadores).
16. **Riesgos de modificación:** Cambiar `follow.yaw` o signos de `turnDelta` rompe la alineación movimiento-cámara (`0 = -Z`, `+θ -> +X`) y la dirección de disparo (`aimYaw`).
17. **Referencias relacionadas:** [VEHICLES.md](VEHICLES.md), [PHYSICS_AND_COLLISIONS.md](PHYSICS_AND_COLLISIONS.md).
18. **Última verificación:** 2026-11-20 (`typecheck`, Vitest 40/40 y build tras Fase 3).

### Integración Mercado Palma

El rumbo de control usa la cámara interpolada; apuntar reduce velocidad, distancia y FOV. El retroceso procede de disparos reales. Reset restaura arma/zoom. El avatar agrupa por articulación y acabado, conservando visibilidad independiente del cañón de carabina. Se mantienen los contratos de conducción.
