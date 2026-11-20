---
document_id: SYSTEM-UI-DEBUG
status: active
last_updated: 2026-11-20
verified_against: "248f8b44b7aebf77fc38a0d5c0bde996e680cec5"
verification_scope: "static-analysis-only"
related_systems: [CORE_AND_INPUT, RENDERING, WORLD_AND_STREAMING]
related_files:
  - index.html
  - src/ui/ui.ts
  - src/ui/minimap.ts
  - src/ui/menu.css
  - src/ui/hud.css
  - src/ui/dialog.css
  - src/debug/stats.ts
  - src/debug/overlay.ts
---

# Sistema: Interfaz de Usuario, Minimapa y Depuración (`UI_AND_DEBUG.md`)

1. **Propósito:** Presentar la portada, el HUD de partida (reloj, estrellas, salud, velocidad, prompts, minimapa y controles táctiles), los diálogos modales de ajustes/pausa y las utilidades de diagnóstico F3/F4.
2. **Estado de implementación:** Implementado y operativo.
3. **Responsabilidades:** Gestionar transiciones visuales según `GameMode`, enlazar formularios de calidad/hora/audio, dibujar el minimapa 2D en canvas, muestrear estadísticas de render (F3) y dibujar wireframes de colisionadores/rutas (F4).
4. **Archivos fuente relevantes:** `index.html`, `src/ui/{ui,minimap}.ts`, `src/ui/*.css`, `src/debug/{stats,overlay}.ts`.
5. **Clases y funciones principales:** `createUI`, `createMinimap`, `FrameStats`, `createDebugOverlay`.
6. **Interfaces públicas:** `GameMode`, `UIActions`, `HudState`, `PlayerMapPosition`.
7. **Dependencias:** `@fontsource/archivo-black`, `@fontsource/barlow-condensed`, `three` (`overlay.ts`, `stats.ts`), tipos de `layout.ts` / `physics.ts` / `road-graph.ts`.
8. **Sistemas dependientes:** `src/main.ts`, `src/core/input.ts` (enlaza selectores `[data-move]`/`[data-action]` del DOM).
9. **Flujo de funcionamiento:** `ui.ts` cachea elementos DOM por ID y actualiza texto/atributos solo cuando cambian de valor (`displayedTime`, `displayedDriving`, `displayedWanted`) para minimizar mutaciones DOM. `minimap.ts` pre-renderiza el mapa del distrito en un canvas offscreen en `setWorld()` y redibuja la flecha amarilla del jugador cuando se mueve `>= 0.5 px` o gira `>= 0.01 rad`. `overlay.ts` (F4) actualiza cada `0.25 s` cajas y rutas dentro de `±40 m`.
10. **Estructuras de datos relevantes:** Buffer `Float32Array(6 * 1800)` en `overlay.ts` (máx. 1.800 segmentos); canvas minimapa `288×252 px`.
11. **Invariantes:** Sin lógica de juego/física en `src/ui/`. Controles táctiles visibles automáticamente bajo `@media (pointer: coarse)`.
12. **Restricciones:** Acoplamiento nominal estricto con 28 IDs DOM de `index.html`; `overlay.ts` descarta silenciosamente segmentos si supera 1.800 líneas.
13. **Problemas conocidos:** `VB-008` (`overlay.ts` sin `dispose()`), `VB-013` (minimapa estático sin zoom ni iconos de coche/policía; botón reiniciar en pausa no cierra el modal; `stats.ts` imprime `'1 personaje'` fijo), `VB-014` (0 tests automatizados).
14. **Consideraciones de rendimiento:** `minimap.ts` evita redibujos innecesarios con cache offscreen y umbral de cambio; `stats.ts` muestrea cada `0.3 s`.
15. **Métodos de verificación:** **0 pruebas automatizadas** (`VB-014`). Verificación manual en navegador desktop y emulación táctil.
16. **Riesgos de modificación:** Renombrar IDs o atributos `data-move`/`data-action` en `index.html` rompe `ui.ts` o `input.ts` en arranque.
17. **Referencias relacionadas:** [CORE_AND_INPUT.md](CORE_AND_INPUT.md), [DATA_FLOW.md](../architecture/DATA_FLOW.md).
18. **Última verificación:** 2026-11-20 (análisis estático sobre `248f8b4`).
