---
document_id: CORE-HANDOFF
status: active
last_updated: 2026-11-20
verified_against: "96ef8fc-dirty (Phases 4-5)"
verification_scope: "typecheck + vitest (45/45) + vite build + Chromium WebGL 2 live test"
---

# Transferencia entre Sesiones (`HANDOFF.md`)

- **Última tarea trabajada:** **Fase 5 (Teléfono móvil integrado)** completada sobre la Fase 4 de la iniciativa "Ecosistema Urbano Inteligente, Dinámico, Interactivo y Destructible" (working tree sobre `96ef8fc` de Fase 3).
- **Objetivo:** Resolver `VB-015` (`ArrowUp`), dotar al jugador de un smartphone diegético desacoplado en simulación (`camera`, `feed`, `emergency` 911, `alerts`) conectado a `WorldEventBus`, viralizar incidentes reales y provocar reacciones NPC ante grabaciones en vivo.
- **Estado actual:** Fases 4 y 5 implementadas, compiladas y verificadas (`typecheck`, `17` archivos / `45/45` tests, `vite build` `64` módulos y prueba viva en Chromium WebGL 2). Pendiente de autorización expresa del usuario para `commit`/`push` y arranque de la Fase 6.
- **Rama y commit base de referencia:** `main` @ `96ef8fc`.
- **Trabajo completado en Fases 4 y 5 (working tree):**
  - **Fase 4:** `src/world/destructibles.ts`, `buildings.ts`, `weapons.ts`, `vehicle.ts`, `traffic.ts`/`traffic-visuals.ts`, `npc-population.ts`, `audio.ts`, `tests/destructibles-and-accidents.test.ts` (escaparates fracturables, mobiliario Rapier destructible, escombros/agua/humo, daño vehicular y accidentes con huida).
  - **Fase 5:** `src/simulation/phone.ts` (`createPhoneSystem`, grabaciones `'recording_started'`, clips `'video_published'` con vistas dinámicas, llamadas 911 policial/médica y ticker urbano), `src/core/input.ts` (resolución de `VB-015` reservando `WASD` al movimiento y `ArrowUp`/`KeyM`/`#touch-phone` + navegación contextual al teléfono), `src/ai/perception.ts` + `src/ai/npc/npc-brain.ts` (confirmación visual cercana `<= 14 m` y reacción `filmedRecently` según rol NPC), `src/simulation/engine.ts`, `index.html`, `src/ui/hud.css`, `src/ui/ui.ts`, `src/main.ts` y `tests/phone-system.test.ts`.
- **Trabajo pendiente:**
  - **Fase 6 (Policía avanzada e investigación criminal):** Respuesta escalonada, perímetros, unidades instanciadas (`VB-005`), cerco en tiendas, evitación de tráfico (`VB-004`) y memoria de descripción del sospechoso/vehículo.
  - **Fase 7 (Pulido y optimización final):** Streaming físico Rapier (`VB-002`), presupuesto en `streaming.ts` (`VB-003`), reducción GC (`VB-009`), `resolution.ts` (`VB-011`) y `dispose()` completo (`VB-008`).
- **Cambios en Git:** Cambios locales de Fases 4 y 5 sin confirmar sobre `96ef8fc`.
- **Bloqueos:** Ninguno técnico.
- **Próxima acción recomendada:** Autorizar `git commit` y `git push` de Fases 4 y 5 y el inicio de la **Fase 6 (Policía avanzada e investigación criminal)**.
- **Documentos clave para el siguiente agente:** `AGENTS.md` -> `.ai/INDEX.md` -> `.ai/CURRENT_STATE.md` -> `.ai/ROADMAP.md` -> `.ai/architecture/CODEBASE_MAP.md`.

