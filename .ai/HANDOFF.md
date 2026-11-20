---
document_id: CORE-HANDOFF
status: active
last_updated: 2026-11-20
verified_against: "45aefd3-dirty (Phase 3)"
verification_scope: "typecheck + vitest (40/40) + vite build + Chromium WebGL 2 live test"
---

# Transferencia entre Sesiones (`HANDOFF.md`)

- **Última tarea trabajada:** **Fase 3 (Armas, combate y delitos complejos)** de la iniciativa "Ecosistema Urbano Inteligente, Dinámico, Interactivo y Destructible" (tras confirmar y publicar Fase 2 en `45aefd3`).
- **Objetivo:** Dotar al jugador, NPCs, tiendas y policía de armas, balística detenida por muros, percepción real de amenazas sin omnisciencia, llamadas al 911 interrumpibles por intimidación, asaltos progresivos con botín y tiroteo policial con cobertura.
- **Estado actual:** Fase 3 implementada, compilada, verificada (`typecheck`, `15` archivos / `40/40` tests, `vite build` `62` módulos y prueba viva en Chromium WebGL 2) y lista para publicar en `main`.
- **Rama y commit base de referencia:** `main` @ `45aefd3`.
- **Trabajo completado:**
  - `src/player/weapons.ts`, `src/player/player.ts`, `src/characters/avatar.ts`, `src/core/input.ts`: 3 ranuras (`unarmed`, `pistol`, `carbine`), apuntado (`Clic der.` / `F`), disparo (`Clic izq.` / `G` / táctil), recarga (`R`), trazadores `InstancedMesh`, raycast detenido por `SpatialBoxGrid` y brazo/arma visibles en el avatar.
  - `src/ai/npc/npc-population.ts`: detección realista de testigos (`witness_detected`), llamadas al 911 de `2.1 s` interrumpibles por intimidación/disparo, salud/daño (`applyDamage`) y combate cuerpo a cuerpo NPC (`8` HP).
  - `src/world/stores.ts` y `src/simulation/engine.ts`: asalto progresivo en tienda (`beginHeist` / `stepHeist`), intimidación de dependientes (`cooperating` / alerta diferida), cobro de botín (`cash` + `robbery_finished`), cues procedurales (`shot`, `reload`, `empty`, `cash` en `audio.ts`) y HUD de combate (`#cash-display`, `#weapon-display`, `#aim-reticle`, controles táctiles).
  - `src/ai/police/police.ts`: fuego recíproco policial (`wanted.level >= 2`, `< 25 m`, `clearLine` real respetando cobertura arquitectónica).
  - `tests/combat-and-heists.test.ts`: balística con muro bloqueante, testigo no omnisciente interrumpible, asalto completo con botín y combate policial con cobertura.
- **Trabajo pendiente:**
  - **Fase 4 (Entorno dinámico y destructible):** Cristales/vidrieras fracturables, objetos destructibles (`glass_shattered`, `object_destroyed`), daños en vehículos/mobiliario y accidentes con escape.
  - **Fases 5–7:** Teléfono móvil (`VB-015`), policía avanzada e investigación, y optimización final (`VB-002`–`VB-005`).
- **Cambios en Git:** Publicación de Fase 3 en curso sobre `45aefd3`.
- **Bloqueos:** Ninguno técnico.
- **Próxima acción recomendada:** Solicitar autorización expresa al usuario para iniciar **Fase 4 (Entorno dinámico y destructible)**.
- **Documentos clave para el siguiente agente:** `AGENTS.md` -> `.ai/INDEX.md` -> `.ai/CURRENT_STATE.md` -> `.ai/ROADMAP.md` -> `.ai/architecture/CODEBASE_MAP.md`.
