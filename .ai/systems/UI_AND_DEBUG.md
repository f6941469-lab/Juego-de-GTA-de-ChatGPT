---
document_id: SYSTEM-UI-DEBUG
status: active
last_updated: 2026-11-20
verified_against: "96ef8fc-dirty (Phase 5 working tree)"
verification_scope: "typecheck + vitest (45/45) + vite build (Phase 5)"
related_systems: [CORE_AND_INPUT, RENDERING, WORLD_AND_STREAMING, NPC_AND_PERCEPTION]
related_files:
  - index.html
  - src/ui/ui.ts
  - src/ui/minimap.ts
  - src/ui/menu.css
  - src/ui/hud.css
  - src/ui/dialog.css
  - src/debug/stats.ts
  - src/debug/overlay.ts
  - src/debug/inspector.ts
---

# Sistema: Interfaz de Usuario, Minimapa y Depuración (`UI_AND_DEBUG.md`)

1. **Propósito:** Presentar la portada, el HUD de partida (distrito actual, reloj, botín `$`, arma/munición, retícula de apuntado, teléfono móvil diegético, estrellas, salud, velocidad, prompts dinámicos, avisos de asalto, minimapa multi-isla y controles táctiles), los diálogos modales de ajustes/pausa y las utilidades de diagnóstico F3/F4/F5.
2. **Estado de implementación:** Implementado y operativo (Fase 5: `#phone-device`, `#touch-phone` y vistas DOM sin lógica de juego).
3. **Responsabilidades:** Gestionar transiciones visuales según `GameMode`, actualizar distrito activo, botín (`$`) y arma/munición, mostrar retícula al apuntar a pie, renderizar `PhoneSnapshot` (`home`, `camera`, `feed`, `emergency`, `alerts`) delegando acciones a `onPhoneCommand`, enlazar formularios de calidad/hora/audio, dibujar el minimapa 2D, muestrear `F3`, renderizar wireframes `F4` e inspector `F5`.
4. **Archivos fuente relevantes:** `index.html`, `src/ui/{ui,minimap}.ts`, `src/ui/*.css`, `src/debug/{stats,overlay,inspector}.ts`.
5. **Clases y funciones principales:** `createUI`, `createMinimap`, `FrameStats`, `createDebugOverlay` (con `dispose()`), `formatSimulationInspector`.
6. **Interfaces públicas:** `GameMode`, `UIActions` (`onPhoneCommand`), `HudState` (`cash`, `weaponLabel`, `aiming`, `armed`, `phone`), `PlayerMapPosition`, `DebugObserverCone`, `SimulationInspectorSnapshot`.
7. **Dependencias:** `@fontsource/archivo-black`, `@fontsource/barlow-condensed`, `three` (`overlay.ts`, `stats.ts`), tipos de `layout.ts` / `stores.ts` / `physics.ts` / `road-graph.ts` / `pedestrian-graph.ts` / `entities.ts` / `events.ts` / `phone.ts`.
8. **Sistemas dependientes:** `src/main.ts`, `src/core/input.ts` (enlaza selectores `[data-move]`/`[data-action]` del DOM y atajos `F3`/`F4`/`F5`).
9. **Flujo de funcionamiento:** `ui.ts` cachea elementos DOM por ID y actualiza texto/atributos solo cuando cambian de valor (`displayedTime`, `displayedDistrict`, `displayedDriving`, `displayedWanted`, `displayedCash`, `displayedWeapon`, `displayedPhoneSig`). La vista de teléfono usa nodos DOM seguros (`replaceChildren` + `textContent`) sin almacenar ni calcular lógica de simulación. `minimap.ts` usa cache offscreen; `stats.ts` (`F3`), `overlay.ts` (`F4`) e `inspector.ts` (`F5`) completan diagnóstico.
10. **Estructuras de datos relevantes:** Buffer `Float32Array(6 * 1800)` en `overlay.ts` (máx. 1.800 segmentos); canvas minimapa `288×252 px`; panel `<pre id="debug-panel">` y `<aside id="phone-device">` en `index.html`.
11. **Invariantes:** Sin lógica de juego/física en `src/ui/` ni cálculos autónomos en `debug/`. Controles táctiles visibles automáticamente bajo `@media (pointer: coarse)`.
12. **Restricciones:** Acoplamiento nominal estricto con IDs DOM de `index.html`; `overlay.ts` descarta silenciosamente segmentos si supera 1.800 líneas.
13. **Problemas conocidos:** `VB-013` (minimapa sin zoom dinámico ni iconos de policía/coche propio; botón reiniciar en pausa no cierra el modal), `VB-014` (0 tests automatizados unitarios de UI).
14. **Consideraciones de rendimiento:** `minimap.ts` evita redibujos innecesarios con cache offscreen; `#phone-screen` solo actualiza el DOM cuando cambia `displayedPhoneSig`; `stats.ts` muestrea cada `0.3 s`.
15. **Métodos de verificación:** Smoke test en navegador Chromium headless WebGL 2 (`#phone-device`, `ArrowUp`/`KeyM`, `#weapon-display`, `F3` inspeccionados en runtime). Sin pruebas unitarias DOM todavía (`VB-014`).
16. **Riesgos de modificación:** Renombrar IDs (`#hud-district`, `#cash-display`, `#weapon-display`, `#aim-reticle`, `#phone-device`, `#debug-panel`, etc.) o atributos `data-move`/`data-action`/`data-phone-cmd` en `index.html` rompe `ui.ts` o `input.ts`.
17. **Referencias relacionadas:** [CORE_AND_INPUT.md](CORE_AND_INPUT.md), [NPC_AND_PERCEPTION.md](NPC_AND_PERCEPTION.md), [DATA_FLOW.md](../architecture/DATA_FLOW.md).
18. **Última verificación:** 2026-11-20 (`typecheck`, Vitest 45/45, build y Chromium tras Fase 5).


### Integración Mercado Palma

TradeSnapshot presenta catálogo/saldo/existencias; las compras y consumos se validan en SimulationEngine/Economy. La app Mochila comparte navegación nativa del teléfono. La interfaz no aplica dinero, munición ni salud directamente.
