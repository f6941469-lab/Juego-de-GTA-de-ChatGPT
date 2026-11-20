---
document_id: SYSTEM-CORE-INPUT
status: active
last_updated: 2026-11-20
verified_against: "ef1f5d115168a40a89b767658274cc28ac17b8de"
verification_scope: "typecheck-tests-build-phase1"
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
2. **Estado de implementación:** Implementado y operativo.
3. **Responsabilidades:** Acumular tiempo de simulación (`FixedLoop`), propagar eventos localizados con expiración temporal (`createWorldEventBus`), traducir eventos DOM en entradas discretas/continuas (`createInput`) y leer/guardar perfil gráfico y audio en IndexedDB.
4. **Archivos fuente relevantes:** `src/config/game.ts`, `src/core/fixed-loop.ts`, `src/core/events.ts`, `src/core/input.ts`, `src/persistence/preferences.ts`.
5. **Clases y funciones principales:** `FixedLoop` (`advance`, `reset`), `createWorldEventBus` (`advance`, `emit`, `queryNear`, `recent`, `subscribe`, `reset`), `createInput` (`setActive`, `capture`, `read`), `loadQuality`/`saveQuality`, `loadAudioPreference`/`saveAudioPreference`.
6. **Interfaces públicas:** `Quality` (`'low'|'medium'|'high'|'ultra'`), `gameConfig`, `WorldEvent`, `WorldEventType`, `WorldEventBus`, `AudioPreference`, retorno de `createInput`.
7. **Dependencias:** APIs web estándar (`window`, `document`, `indexedDB`).
8. **Sistemas dependientes:** `src/main.ts`, `src/renderer/renderer.ts`, `src/ui/ui.ts`, `src/player/player.ts`, `src/vehicles/vehicle.ts`, `src/simulation/entities.ts`, `src/debug/inspector.ts`.
9. **Flujo de funcionamiento:** `FixedLoop.advance(dt, step)` acota el frame a `0.1s`, ejecuta `step(1/60)` mientras haya tiempo acumulado y retorna `alpha`. `WorldEventBus` registra eventos tipados (`robbery_started`, `horn_honked`, `vehicle_collision`, `police_alerted`, `pursuit_started`, `pursuit_ended`, etc.) en anillo/lista acotada (`maxHistory = 256`, `ttlSeconds = 30`) filtrables por distancia e intensidad en `queryNear()`. `createInput` escucha `keydown`/`keyup`, `pointerlockchange`, `mousemove`, arrastre por puntero y `[data-move]`/`[data-action]`, e incluye `F3`/`F4`/`F5`.
10. **Estructuras de datos relevantes:** `heldKeys` (`Set<string>`), `heldPointers` (`Map<number, Control>`), `queuedActions` (`Set<Action>`), lista acotada `events` + listeners en `WorldEventBus`.
11. **Invariantes:** `stepSeconds > 0` y `maxFrameSeconds > 0` finitos; `F3`/`F4`/`F5` funcionan incluso con `active === false`; pérdida de foco (`blur`/`visibilitychange`) limpia todas las teclas/punteros retenidos; fallo de IndexedDB no bloquea la aplicación.
12. **Restricciones:** Pointer Lock solo se solicita con `any-pointer: fine`; algunos iframes rechazan Pointer Lock (fallback automático a arrastre sobre el canvas).
13. **Problemas conocidos:** `createInput` no expone `dispose()` (`VB-008`); falta cobertura de tests en `input.ts` y `preferences.ts` (`VB-014`); `ArrowUp` está mapeado actualmente a movimiento `'forward'`, lo que generará conflicto al abrir el teléfono móvil en Fase 5 (`VB-015`).
14. **Consideraciones de rendimiento:** `WorldEventBus` mantiene un máximo de 256 eventos y limpia expirados en `advance(dt)`; `isHeld()` recorre conjuntos pequeños.
15. **Métodos de verificación:** `tests/fixed-loop.test.ts` (2 tests), `tests/events-and-entities.test.ts` (4 tests, incluye `WorldEventBus`). `input.ts` y `preferences.ts` requieren verificación manual en navegador o nuevas pruebas DOM.
16. **Riesgos de modificación:** Alterar `PointerLock` rompe la pausa automática con `Esc`; cambiar claves IndexedDB rompe preferencias guardadas; reasignar `ArrowUp` requiere preservar compatibilidad con conducción/navegación mediante modo contextual.
17. **Referencias relacionadas:** [EXECUTION_FLOW.md](../architecture/EXECUTION_FLOW.md), [DATA_FLOW.md](../architecture/DATA_FLOW.md), [NPC_AND_PERCEPTION.md](NPC_AND_PERCEPTION.md).
18. **Última verificación:** 2026-11-20 (`typecheck`, Vitest y build tras Fase 1).

