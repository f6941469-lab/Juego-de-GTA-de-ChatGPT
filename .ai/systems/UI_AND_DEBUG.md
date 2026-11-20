---
document_id: SYSTEM-UI-DEBUG
status: active
last_updated: 2026-11-20
verified_against: "45aefd3-dirty (Phase 3 working tree)"
verification_scope: "typecheck + vitest (40/40) + vite build (Phase 3)"
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

1. **Propósito:** Presentar la portada, el HUD de partida (distrito actual, reloj, botín `$`, arma/munición, retícula de apuntado, estrellas, salud, velocidad, prompts dinámicos, avisos de asalto, minimapa multi-isla y controles táctiles de combate/conducción), los diálogos modales de ajustes/pausa y las utilidades de diagnóstico F3/F4/F5.
2. **Estado de implementación:** Implementado y operativo (Fase 3: `#cash-display`, `#weapon-display`, `#aim-reticle`, `#touch-weapon`, `#touch-fire` y `#combat-hint`).
3. **Responsabilidades:** Gestionar transiciones visuales según `GameMode`, actualizar distrito activo, botín (`$`) y arma/munición, mostrar retícula al apuntar a pie, avisos temporales, enlazar formularios de calidad/hora/audio, dibujar el minimapa 2D con islas/puentes/tiendas, muestrear estadísticas de render + conteo real de entidades (`F3`), dibujar wireframes de colisionadores, rutas viales/peatonales y conos FOV (`F4`), y formatear el inspector de simulación (`F5`).
4. **Archivos fuente relevantes:** `index.html`, `src/ui/{ui,minimap}.ts`, `src/ui/*.css`, `src/debug/{stats,overlay,inspector}.ts`.
5. **Clases y funciones principales:** `createUI`, `createMinimap`, `FrameStats`, `createDebugOverlay` (con `dispose()`), `formatSimulationInspector`.
6. **Interfaces públicas:** `GameMode`, `UIActions`, `HudState` (`cash`, `weaponLabel`, `aiming`, `armed`), `PlayerMapPosition`, `DebugObserverCone`, `SimulationInspectorSnapshot`.
7. **Dependencias:** `@fontsource/archivo-black`, `@fontsource/barlow-condensed`, `three` (`overlay.ts`, `stats.ts`), tipos de `layout.ts` / `stores.ts` / `physics.ts` / `road-graph.ts` / `pedestrian-graph.ts` / `entities.ts` / `events.ts`.
8. **Sistemas dependientes:** `src/main.ts`, `src/core/input.ts` (enlaza selectores `[data-move]`/`[data-action]` del DOM y atajos `F3`/`F4`/`F5`).
9. **Flujo de funcionamiento:** `ui.ts` cachea elementos DOM por ID y actualiza texto/atributos solo cuando cambian de valor (`displayedTime`, `displayedDistrict`, `displayedDriving`, `displayedWanted`, `displayedCash`, `displayedWeapon`). `minimap.ts` pre-renderiza islas, puentes, agua, calles y pines en canvas offscreen conservando proporción real y superpone tiendas + jugador. `stats.ts` (`F3`) muestrea FPS/drawcalls y recibe el conteo real de entidades del `EntityRegistry`. `overlay.ts` (`F4`) dibuja cada `0.25 s` cajas, rutas viales, enlaces peatonales (`pedestrianGraph`) y conos de percepción (`DebugObserverCone[]`). `inspector.ts` (`F5`) formatea tiers, eventos recientes y resumen espacial.
10. **Estructuras de datos relevantes:** Buffer `Float32Array(6 * 1800)` en `overlay.ts` (máx. 1.800 segmentos); canvas minimapa `288×252 px`; panel `<pre id="debug-inspector">` en `index.html`.
11. **Invariantes:** Sin lógica de juego/física en `src/ui/` ni cálculos autónomos en `debug/`. Controles táctiles visibles automáticamente bajo `@media (pointer: coarse)`.
12. **Restricciones:** Acoplamiento nominal estricto con IDs DOM de `index.html`; `overlay.ts` descarta silenciosamente segmentos si supera 1.800 líneas.
13. **Problemas conocidos:** `VB-013` (minimapa sin zoom dinámico ni iconos de policía/coche propio; botón reiniciar en pausa no cierra el modal), `VB-014` (0 tests automatizados unitarios de UI).
14. **Consideraciones de rendimiento:** `minimap.ts` evita redibujos innecesarios con cache offscreen y firma de estado; `stats.ts` muestrea cada `0.3 s`; `overlay.ts` e `inspector.ts` no asignan geometrías nuevas por frame y `overlay.ts` expone `dispose()`.
15. **Métodos de verificación:** Smoke test en navegador Chromium headless WebGL 2 (`#cash-display`, `#weapon-display`, `F3`, `F5` inspeccionados en runtime). Sin pruebas unitarias DOM todavía (`VB-014`).
16. **Riesgos de modificación:** Renombrar IDs (`#hud-district`, `#cash-display`, `#weapon-display`, `#aim-reticle`, `#debug-inspector`, etc.) o atributos `data-move`/`data-action` en `index.html` rompe `ui.ts`, `inspector` o `input.ts` en arranque.
17. **Referencias relacionadas:** [CORE_AND_INPUT.md](CORE_AND_INPUT.md), [NPC_AND_PERCEPTION.md](NPC_AND_PERCEPTION.md), [DATA_FLOW.md](../architecture/DATA_FLOW.md).
18. **Última verificación:** 2026-11-20 (`typecheck`, Vitest 40/40, build y Chromium tras Fase 3).

