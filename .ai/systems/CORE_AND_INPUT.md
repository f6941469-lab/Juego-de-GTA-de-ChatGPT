---
document_id: SYSTEM-CORE-INPUT
status: active
last_updated: 2026-11-20
verified_against: "248f8b44b7aebf77fc38a0d5c0bde996e680cec5"
verification_scope: "static-analysis-only"
related_systems: [UI_AND_DEBUG, PLAYER_AND_CAMERA, VEHICLES]
related_files:
  - src/config/game.ts
  - src/core/fixed-loop.ts
  - src/core/input.ts
  - src/persistence/preferences.ts
---

# Sistema: Core, Entrada y Persistencia (`CORE_AND_INPUT.md`)

1. **Propósito:** Proveer configuración global, reloj de paso fijo, captura unificada de teclado/ratón/táctil y persistencia local de preferencias.
2. **Estado de implementación:** Implementado y operativo.
3. **Responsabilidades:** Acumular tiempo de simulación (`FixedLoop`), traducir eventos DOM en entradas discretas/continuas (`createInput`) y leer/guardar perfil gráfico y audio en IndexedDB.
4. **Archivos fuente relevantes:** `src/config/game.ts`, `src/core/fixed-loop.ts`, `src/core/input.ts`, `src/persistence/preferences.ts`.
5. **Clases y funciones principales:** `FixedLoop` (`advance`, `reset`), `createInput` (`setActive`, `capture`, `read`), `loadQuality`/`saveQuality`, `loadAudioPreference`/`saveAudioPreference`.
6. **Interfaces públicas:** `Quality` (`'low'|'medium'|'high'|'ultra'`), `gameConfig`, `AudioPreference`, retorno de `createInput`.
7. **Dependencias:** APIs web estándar (`window`, `document`, `indexedDB`).
8. **Sistemas dependientes:** `src/main.ts`, `src/renderer/renderer.ts`, `src/ui/ui.ts`, `src/player/player.ts`, `src/vehicles/vehicle.ts`.
9. **Flujo de funcionamiento:** `FixedLoop.advance(dt, step)` acota el frame a `0.1s`, ejecuta `step(1/60)` mientras haya tiempo acumulado y retorna `alpha`. `createInput` escucha `keydown`/`keyup`, `pointerlockchange`, `mousemove`, arrastre por puntero y `[data-move]`/`[data-action]`. `read()` devuelve ejes y limpia acciones de un pulso (`jumpQueued`, `queuedActions`).
10. **Estructuras de datos relevantes:** `heldKeys` (`Set<string>`), `heldPointers` (`Map<number, Control>`), `queuedActions` (`Set<Action>`).
11. **Invariantes:** `stepSeconds > 0` y `maxFrameSeconds > 0` finitos; `F3`/`F4` funcionan incluso con `active === false`; pérdida de foco (`blur`/`visibilitychange`) limpia todas las teclas/punteros retenidos; fallo de IndexedDB no bloquea la aplicación.
12. **Restricciones:** Pointer Lock solo se solicita con `any-pointer: fine`; algunos iframes rechazan Pointer Lock (fallback automático a arrastre sobre el canvas).
13. **Problemas conocidos:** `createInput` no expone `dispose()` para remover listeners globales (`VB-008`); falta cobertura de tests en `input.ts` y `preferences.ts` (`VB-014`).
14. **Consideraciones de rendimiento:** `isHeld()` recorre `heldKeys`/`heldPointers` (muy pequeños); IndexedDB abre y cierra conexión en cada lectura/escritura puntual.
15. **Métodos de verificación:** `tests/fixed-loop.test.ts` (2 tests). `input.ts` y `preferences.ts` requieren verificación manual en navegador o nuevas pruebas DOM.
16. **Riesgos de modificación:** Alterar `PointerLock` rompe la pausa automática con `Esc`; cambiar claves IndexedDB rompe preferencias guardadas en usuarios previos.
17. **Referencias relacionadas:** [EXECUTION_FLOW.md](../architecture/EXECUTION_FLOW.md), [DATA_FLOW.md](../architecture/DATA_FLOW.md).
18. **Última verificación:** 2026-11-20 (análisis estático sobre `248f8b4`; tests Vitest pendientes de ejecutar).
