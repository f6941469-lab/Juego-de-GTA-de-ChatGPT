---
document_id: CORE-HANDOFF
status: active
last_updated: 2026-11-20
verified_against: "ef1f5d115168a40a89b767658274cc28ac17b8de (dirty working tree)"
verification_scope: "typecheck + vitest (35/35) + vite build + Chromium WebGL 2 SwiftShader F5 smoke test"
---

# Transferencia entre Sesiones (`HANDOFF.md`)

- **Última tarea trabajada:** Diagnóstico arquitectónico integral y **Fase 1 (Fundamentos de simulación)** de la iniciativa "Ecosistema Urbano Inteligente, Dinámico, Interactivo y Destructible".
- **Objetivo:** Resolver las barreras estructurales previas (`VB-001`, LOS `O(celdas)` de `VB-002`) y construir los cimientos reales y testeables de simulación (eventos localizados, registro de entidades LOD, percepción sensorial, perfiles/cerebro NPC, grafo peatonal multi-isla e inspector `F5`) antes de poblar NPCs y conductores en Fase 2.
- **Estado actual:** Fase 1 implementada, compilada y verificada (`typecheck`, `13` archivos / `35/35` tests, `vite build` y smoke test en Chromium WebGL 2 con tecla `F5`). Pendiente de autorización del usuario para commit/push y para iniciar Fase 2.
- **Rama y commit base de referencia:** `main` @ `ef1f5d115168a40a89b767658274cc28ac17b8de`.
- **Trabajo completado:**
  - `src/physics/spatial-index.ts`, `src/physics/physics.ts`, `src/player/player.ts`, `src/vehicles/vehicle.ts`, `src/ai/police/police.ts`: `physics.step(dt)` único (`VB-001`), `SpatialBoxGrid` (`32 m`) usado en policía y percepción, y exposición de `player.grounded`.
  - `src/core/events.ts`, `src/simulation/entities.ts`: `WorldEventBus` no omnisciente (`TTL = 30 s`, máx. `256` eventos, `queryNear`) y `EntityRegistry` por cubetas `32 m` con cálculo de tier `high`/`medium`/`low`.
  - `src/ai/perception.ts`, `src/ai/npc/profiles.ts`, `src/ai/npc/npc-brain.ts`: percepción visual (FOV + LOS + reconocimiento `0.35 s`) y auditiva (atenuación por muros `0.42`), 10 roles deterministas y cerebro híbrido Utilidad/FSM (17 estados emocionales, 9 intenciones, memoria 8 entradas / `26 s`).
  - `src/navigation/pedestrian-graph.ts`, `src/world/district.ts`: grafo peatonal por aceras, cruces, 3 puentes y 9 tiendas con A* MinHeap + `steerPedestrian`, y ajuste menor de `cafe-estrella` (`14 -> 12`) para paso peatonal en Isla Estrella.
  - `src/debug/inspector.ts`, `overlay.ts`, `stats.ts`, `src/core/input.ts`, `index.html`, `src/main.ts`: atajo `F5`, grafo peatonal/conos FOV + `dispose()` en `F4`, conteo real de entidades en `F3` y emisión de eventos reales desde `main.ts`.
  - `tests/events-and-entities.test.ts`, `tests/perception-and-npc.test.ts`, `tests/pedestrian-navigation.test.ts`: `+8` pruebas nuevas (`35/35` totales).
- **Trabajo pendiente:**
  - **Fase 2 (Vida urbana):** Instanciar peatones sobre `PedestrianGraph`, asignar conductores reales a `traffic.ts` (permitiendo robo de vehículos), convertir tiendas en establecimientos con interior/dependientes y extraer `SimulationEngine` desde `main.ts`.
  - **Fases 3–7:** Armas/combate/testigos/asalto completo, destructibilidad, teléfono móvil (`VB-015`), policía avanzada y optimización final.
- **Cambios no confirmados en Git:** Ver `git status` (archivos modificados en `src/**`, `index.html`, `.ai/**` y nuevos archivos de Fase 1 + `tests/`).
- **Bloqueos:** Ninguno técnico (`node_modules/` disponible localmente mediante `npm ci` sin alterar lockfile).
- **Próxima acción recomendada:** Revisar el resumen y autorizar commit/push de la Fase 1 y/o el arranque de Fase 2.
- **Documentos clave para el siguiente agente:** `AGENTS.md` -> `.ai/INDEX.md` -> `.ai/CURRENT_STATE.md` -> `.ai/systems/NPC_AND_PERCEPTION.md` -> `.ai/ROADMAP.md`.
