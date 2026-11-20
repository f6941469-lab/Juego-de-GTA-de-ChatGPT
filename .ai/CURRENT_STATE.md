---
document_id: CORE-CURRENT-STATE
status: active
last_updated: 2026-11-20
verified_against: "96ef8fc-dirty (Phases 4-5 working tree)"
verification_scope: "typecheck + vitest (45/45) + vite build + Chromium WebGL 2 live test"
---

# Estado Operativo Actual (`CURRENT_STATE.md`)

- **Rama actual:** `main` (sobre commit `96ef8fc` de Fase 3, con cambios locales de **Fase 4** y **Fase 5** listos para revisar/confirmar).
- **Estado general:** Completada la **Fase 5 (Teléfono móvil integrado)** sobre la Fase 4. Se resolvió `VB-015` separando `WASD` (movimiento/conducción) de `ArrowUp`/`KeyM` (teléfono), se implementó `createPhoneSystem` (`src/simulation/phone.ts`) conectado bidireccionalmente a `WorldEventBus`, se añadió interfaz diegética `#phone-device` + botón `#touch-phone` en `src/ui/ui.ts`/`index.html` y reacciones reales de NPCs cuando los graban de cerca (`perception.ts` + `npc-brain.ts`).

## Estado de los sistemas (verificado en código y compilación)

| Categoría | Sistemas |
| :--- | :--- |
| **Operativos** | `SimulationEngine` (`engine.ts`), loop fijo `60 Hz`, `physics.step(dt)` único, `SpatialBoxGrid` (LOS + raycast balístico), `WorldEventBus` (`recording_started`, `video_published`, `glass_broken`, `object_destroyed`, `traffic_accident`, `weapon_*`, `gunshot_fired`, `robbery_*`, `witness_*`, `crime_reported`), **teléfono móvil diegético (`createPhoneSystem` con apps `camera`/`feed`/`emergency`/`alerts`, grabación en vivo, publicación viral y llamadas 911)**, `createDestructibles` (`18` escaparates `store_glass` + `hydrant`/`bollard`/`crate`/`bench` con colisionadores Rapier removibles + escombros/agua/humo), daños mecánicos en `vehicle.ts` y `traffic.ts`/`traffic-visuals.ts`, `EntityRegistry`, `PerceptionSystem` (incluye confirmación directa visual `<= 14 m` y reacción NPC ante grabaciones), sistema de armas y trazadores (`weapons.ts`), multitud NPC (`7` `InstancedMesh`, hasta `72` NPCs) + dependientes en 9 tiendas, policía 5 estrellas con fuego recíproco, Web Audio procedural (`ui`, `glass`, `debris`, `shot`, etc.), HUD/minimapa/teléfono `#phone-device` y debug `F3`/`F4`/`F5`. |
| **Parciales / Con fricción** | `VB-002` (streaming físico Rapier pendiente), `VB-004` (evitación policial frente a tráfico), `VB-005` (instanciación de patrullas). |
| **No implementados** | Policía avanzada con perímetros/descripción (Fase 6), optimización final Rapier/GC/streaming (Fase 7). |

## Estado de las verificaciones
- `npm run typecheck`: **Pasado** (`0` errores).
- `npm test`: **Pasado** (`17` archivos, `45/45` pruebas verdes; `tests/phone-system.test.ts` verifica apertura con `ArrowUp` sin mover al jugador (`VB-015`), grabación en directo + captura de `glass_broken` + publicación `video_published` con vistas crecientes, reacción NPC a `recording_started`, despacho 911 y `reset`/`dispose`).
- `npm run build`: **Pasado** (`vite build`, `64` módulos transformados en `dist/`).
- **Navegador (Chromium headless + ANGLE SwiftShader WebGL 2 sobre `vite preview`):** `ArrowUp` abrió `#phone-device` sin variar la posición (`-0.0, 0.0, 25.0`), `Enter` recorrió `Home` → `Cámara` (`Visor en directo`) → `● REC 0.1 s` → publicación en `Social` (`73 vistas`), con `0` excepciones JS y `0` errores de consola.

## Prioridades y bloqueos actuales
1. **Siguiente paso funcional:** Revisar/confirmar **Fases 4–5**, autorizar `commit`/`push` y el arranque de la **Fase 6: Policía avanzada e investigación criminal**.
2. **Deuda técnica P1/P2 abierta relevante:** `VB-002` (streaming físico Rapier), `VB-003` (presupuesto por frame en `streaming.ts`), `VB-004`/`VB-005` (patrullas).

## Próximos pasos recomendados
1. Autorizar `git commit` y `git push` de las Fases 4 y 5.
2. Iniciar **Fase 6 (Policía avanzada e investigación criminal)** tras autorización expresa.

