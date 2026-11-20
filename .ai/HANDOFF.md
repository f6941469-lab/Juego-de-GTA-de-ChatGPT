---
document_id: CORE-HANDOFF
status: active
last_updated: 2026-11-20
verified_against: "0f54f650e29eb488de880fc89e15e7d63744eaf8 (dirty working tree)"
verification_scope: "typecheck + vitest (27/27) + vite build + Chromium WebGL 2 SwiftShader smoke test"
---

# Transferencia entre Sesiones (`HANDOFF.md`)

- **Última tarea trabajada:** Creación del mapa conectado multi-distrito estilo Vice City y tiendas interactuables iniciales para asalto básico.
- **Objetivo:** Conectar Isla Este, Isla Estrella y Tierra Firme Oeste con puentes transitables por jugador/tráfico/policía y distribuir tiendas interactuables por todos los distritos antes de implementar el sistema completo de asalto y policía.
- **Estado actual:** Implementado, compilado y verificado con `typecheck`, `27/27` tests, `vite build` y smoke test en Chromium WebGL 2. Pendiente de commit/push por el propietario.
- **Rama y commit base de referencia:** `main` @ `0f54f650e29eb488de880fc89e15e7d63744eaf8`.
- **Trabajo completado:**
  - `src/world/generation/layout.ts`, `streets.ts`, `coast.ts`, `buildings.ts`, `district.ts`: 6 distritos conectados, 3 puentes con parapetos y pilares, bahía/océano expandidos, `146` nodos viales conectados y `9` tiendas en aceras despejadas.
  - `src/world/stores.ts`: balizas `InstancedMesh`, proximidad a pie (`2.75 m`), robo básico y cooldown (`90 s`).
  - `src/ui/minimap.ts`, `ui.ts`, `hud.css`, `index.html`, `src/main.ts`: minimapa con proporción real, islas, puentes y marcadores de tiendas; distrito dinámico y aviso de asalto en HUD.
  - `tests/district.test.ts` y `tests/stores.test.ts`: pruebas de conectividad por puentes, suelo de puentes, despeje de tiendas y ciclo de asalto.
- **Trabajo pendiente:**
  - Prueba interactiva manual en navegador recorriendo los 3 puentes y asaltando tiendas.
  - Futura fase: implementar el sistema completo de asalto y policía (pedido explícitamente para después).
- **Cambios no confirmados en Git:** Modificaciones en `index.html`, `src/main.ts`, `src/ui/*`, `src/world/*`, `tests/district.test.ts`, creación de `src/world/stores.ts` y `tests/stores.test.ts`, y sincronización de `.ai/*`.
- **Bloqueos:** Ninguno técnico (`node_modules/` ya instalado localmente mediante `npm ci` sin modificar lockfile).
- **Próxima acción recomendada:** Revisar `git diff` y confirmar/publicar si apruebas; luego planificar el sistema completo de asalto y policía (idealmente abordando `VB-001` / `VB-004`).
- **Documentos clave para el siguiente agente:** `AGENTS.md` -> `.ai/INDEX.md` -> `.ai/CURRENT_STATE.md` -> `.ai/systems/WORLD_AND_STREAMING.md` -> `.ai/systems/POLICE_AND_WANTED.md`.
