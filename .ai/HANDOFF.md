---
document_id: CORE-HANDOFF
status: active
last_updated: 2026-11-20
verified_against: "e2288b5 (dirty working tree)"
verification_scope: "typecheck + vitest (37/37) + vite build + Chromium WebGL 2 SwiftShader F3/F5 live test"
---

# Transferencia entre Sesiones (`HANDOFF.md`)

- **Última tarea trabajada:** **Fase 2 (Vida urbana)** de la iniciativa "Ecosistema Urbano Inteligente, Dinámico, Interactivo y Destructible" (tras confirmar Fase 1 en `e2288b5`).
- **Objetivo:** Dar vida autónoma visible a Costa Palmera, Isla Estrella y Tierra Firme Oeste con multitud NPC instanciada, conductores reales y robo de coches, 9 establecimientos con interiores accesibles/dependientes, y extracción de `SimulationEngine`.
- **Estado actual:** Fase 2 implementada, compilada y verificada (`typecheck`, `14` archivos / `37/37` tests, `vite build` y prueba viva en Chromium WebGL 2 con `F3`/`F5`). Pendiente de autorización del usuario para commit/push y para iniciar Fase 3.
- **Rama y commit base de referencia:** `main` @ `e2288b5`.
- **Trabajo completado:**
  - `src/ai/npc/npc-visuals.ts` y `src/ai/npc/npc-population.ts`: renderizado instanciado (`7` `InstancedMesh` compartidos, máx. `72` NPCs), dependientes fijos en las 9 tiendas, peatones dinámicos por horario/distrito con evitación/esquiva/colisiones vehiculares, ex-conductores NPC (`spawnDisplacedDriver`) y reportes reales de testigos al 911 tras `2.1 s`.
  - `src/ai/traffic/traffic.ts`, `traffic-visuals.ts`, `src/vehicles/vehicle.ts`, `vehicle-manager.ts`: conductores deterministas en cabinas (`occupied: true`), robo cercano (`hijackNearest`), herencia de velocidad al abordar (`boardImmediate`), pool físico de hasta `4` vehículos conducibles persistentes y nuevo evento `vehicle_hijacked`.
  - `src/world/generation/buildings.ts`, `layout.ts`, `district.ts`, `stores.ts`: `buildingColliders` para planta baja hueca enterable en las 9 tiendas (puerta abierta `~2.0–2.6 m`, suelo, luz, mostrador físico y estanterías), `StoreInteriorLayout` y visión ocular `minY = 1.15 m` en `perception.ts`.
  - `src/simulation/engine.ts` y `src/main.ts`: extracción completa del bucle de simulación física/IA a `createSimulationEngine` y reducción de `main.ts` a shell de arranque/rAF/UI/audio/debug.
  - `tests/urban-life.test.ts`: recorrido físico en Rapier por puerta hasta mostrador de las 9 tiendas, robo de tráfico multi-vehículo con ex-conductor NPC y limpieza completa (`dispose()`).
- **Trabajo pendiente:**
  - **Fase 3 (Armas, combate y delitos complejos):** Armas, apuntado y amenazas perceptibles, testigos/llamadas 911 completas, asalto complejo con rehenes/caja/intimidación y combate/salud.
  - **Fases 4–7:** Destructibilidad de cristales/objetos, teléfono móvil (`VB-015`), policía avanzada y optimización final.
- **Cambios no confirmados en Git:** Ver `git status` (cambios de Fase 2 sobre `e2288b5` en `src/**`, `tests/urban-life.test.ts` y `.ai/**`).
- **Bloqueos:** Ninguno técnico.
- **Próxima acción recomendada:** Revisar resumen y autorizar commit (y push) de Fase 2 y arranque de Fase 3.
- **Documentos clave para el siguiente agente:** `AGENTS.md` -> `.ai/INDEX.md` -> `.ai/CURRENT_STATE.md` -> `.ai/systems/NPC_AND_PERCEPTION.md` -> `.ai/ROADMAP.md`.
