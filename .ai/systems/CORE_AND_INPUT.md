---
document_id: SYSTEM-CORE-INPUT
status: active
last_updated: 2026-11-20
verified_against: "96ef8fc-dirty (Phase 5 working tree)"
verification_scope: "typecheck + vitest (45/45) + vite build (Phase 5)"
related_systems: [UI_AND_DEBUG, PLAYER_AND_CAMERA, VEHICLES, NPC_AND_PERCEPTION]
related_files:
  - src/config/game.ts
  - src/core/fixed-loop.ts
  - src/core/events.ts
  - src/core/input.ts
  - src/persistence/preferences.ts
---

# Sistema: Core, Entrada y Persistencia (`CORE_AND_INPUT.md`)

1. **Propósito:** Proveer configuración global, reloj de paso fijo, bus central de eventos del mundo (`WorldEventBus`), captura unificada de teclado/ratón/táctil y persistencia local de preferencias.
2. **Estado de implementación:** Implementado y operativo (Fase 5: controles de teléfono móvil con `↑`/`M`/flechas y resolución de `VB-015`).
3. **Responsabilidades:** Acumular tiempo de simulación (`FixedLoop`), propagar eventos localizados con expiración temporal (`createWorldEventBus`), traducir eventos DOM en entradas discretas/continuas (`createInput`) y leer/guardar perfil gráfico y audio en IndexedDB.
4. **Archivos fuente relevantes:** `src/config/game.ts`, `src/core/fixed-loop.ts`, `src/core/events.ts`, `src/core/input.ts`, `src/persistence/preferences.ts`.
5. **Clases y funciones principales:** `FixedLoop` (`advance`, `reset`), `createWorldEventBus` (`advance`, `emit`, `queryNear`, `recent`, `subscribe`, `reset`), `createInput` (`setActive`, `setPhoneOpen`, `capture`, `read`), `loadQuality`/`saveQuality`, `loadAudioPreference`/`saveAudioPreference`.
6. **Interfaces públicas:** `Quality` (`'low'|'medium'|'high'|'ultra'`), `gameConfig`, `WorldEvent`, `WorldEventType`, `WorldEventBus`, `AudioPreference`, retorno de `createInput` (`aim`, `fire`, `reload`, `cycleWeapon`, `weaponSlot`, `phoneCommand`).
7. **Dependencias:** APIs web estándar (`window`, `document`, `indexedDB`).
8. **Sistemas dependientes:** `src/simulation/engine.ts`, `src/main.ts`, `src/renderer/renderer.ts`, `src/ui/ui.ts`, `src/player/player.ts`, `src/vehicles/vehicle.ts`, `src/simulation/entities.ts`, `src/debug/inspector.ts`.
9. **Flujo de funcionamiento:** `FixedLoop.advance(dt, step)` acota el frame a `0.1s`, ejecuta `step(1/60)` mientras haya tiempo acumulado y retorna `alpha`. `WorldEventBus` registra eventos tipados (`recording_started`, `video_published`, `glass_broken`, `object_destroyed`, `traffic_accident`, `weapon_visible`, `weapon_aimed`, `gunshot_fired`, `npc_injured`, `witness_detected`, `crime_reported`, `robbery_started`, `robbery_finished`, `vehicle_hijacked`, `police_alerted`, `pursuit_started`, `pursuit_ended`, etc.) en anillo/lista acotada (`maxHistory = 256`, `ttlSeconds = 30`). `createInput` separa movimiento/conducción (`WASD`) de teléfono móvil (`M` o `↑` cuando está cerrado; flechas/`Enter`/`Backspace`/`Esc` cuando está abierto, además de `#touch-phone`).
10. **Estructuras de datos relevantes:** `heldKeys` (`Set<string>`), `heldPointers` (`Map<number, Control>`), `queuedActions` (`Set<Action>`), `weaponSlot`, `phoneCommand`, `phoneOpen`, lista acotada `events` + listeners en `WorldEventBus`.
11. **Invariantes:** `stepSeconds > 0` y `maxFrameSeconds > 0` finitos; `F3`/`F4`/`F5` funcionan incluso con `active === false`; pérdida de foco (`blur`/`visibilitychange`) limpia teclas/punteros retenidos; abrir o navegar el teléfono nunca mueve al personaje ni al coche (`VB-015` resuelto); fallo de IndexedDB no bloquea la aplicación.
12. **Restricciones:** Pointer Lock solo se solicita con `any-pointer: fine`; algunos iframes rechazan Pointer Lock (fallback automático a arrastre sobre el canvas y disparo con `G` o botón derecho+izquierdo).
13. **Problemas conocidos:** `createInput` no expone `dispose()` (`VB-008`); falta cobertura de tests DOM directos en `input.ts` y `preferences.ts` (`VB-014`). (`VB-015` resuelto en Fase 5).
14. **Consideraciones de rendimiento:** `WorldEventBus` mantiene un máximo de 256 eventos y limpia expirados en `advance(dt)`; `isHeld()` recorre conjuntos pequeños.
15. **Métodos de verificación:** `tests/fixed-loop.test.ts` (2 tests), `tests/events-and-entities.test.ts` (4 tests), `tests/combat-and-heists.test.ts` (3 tests), `tests/phone-system.test.ts` (2 tests) y navegador Chromium.
16. **Riesgos de modificación:** Alterar `PointerLock` rompe la pausa automática con `Esc`; cambiar el aislamiento `setPhoneOpen` reintroduciría el conflicto de movimiento con las flechas (`VB-015`).
17. **Referencias relacionadas:** [EXECUTION_FLOW.md](../architecture/EXECUTION_FLOW.md), [DATA_FLOW.md](../architecture/DATA_FLOW.md), [NPC_AND_PERCEPTION.md](NPC_AND_PERCEPTION.md).
18. **Última verificación:** 2026-11-20 (`typecheck`, Vitest 45/45 y build tras Fase 5).


### Integración Mercado Palma

Los botones del ratón usan mousedown/mouseup para admitir apuntar+disparar. El drag táctil no dispara. setPhoneOpen limpia entradas y libera el cursor; Escape vuelve, blur/visibility pausan. El mismo aislamiento se aplica al comercio. Regresión directa en tests/input.test.ts.

Las órdenes del teléfono usan una cola FIFO acotada a 16 entradas para no perder dos Escape o Enter consecutivos entre ticks. Abrir/cerrar panel limpia el movimiento y conserva esa cola.
