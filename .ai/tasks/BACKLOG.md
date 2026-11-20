---
document_id: TASKS-BACKLOG
status: active
last_updated: 2026-11-20
verified_against: "248f8b44b7aebf77fc38a0d5c0bde996e680cec5"
verification_scope: "static-analysis-only"
---

# Backlog Técnico (`BACKLOG.md`)

> Ninguna tarea debe ejecutarse sin aprobación del propietario (estado `Aprobada`).

| ID | Título | Prioridad | Estado | Origen | Dependencias | Sistemas afectados | Criterio de aceptación clave |
| :--- | :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| `TASK-0001` | Verificación limpia y línea base de rendimiento | P1 | Pendiente | `AUDIT-0001` | Autorización | Build / Tests / Render | `npm ci`, `typecheck`, `test` (25/25), `build` y captura de métricas base en navegador |
| `TASK-0002` | Centralizar `world.step(dt)` en `PhysicsService` | P1 | Propuesta | `VB-001`, `ADR-0005` | `TASK-0001` | `physics`, `player`, `vehicles`, `main` | `world.step()` ejecutado 1 vez por tick fijo; tests jugador/vehículo verdes |
| `TASK-0003` | Corregir aceras/sombras, `dispose()` completos y colliders de costa/parques | P2 | Propuesta | `VB-006`, `VB-008`, `VB-010`, `VB-012` | `TASK-0002` | `world`, `renderer`, `police`, `input` | Pies y sombras sobre aceras; `dispose()` sin fugas; radio vehicular y orden de cámara consistentes |
| `TASK-0004` | Evitación mutua policía-tráfico y huella real en `steer()` | P1 | Propuesta | `VB-004` | `TASK-0002` | `police`, `traffic`, `main` | Patrullas consideran coches civiles y no penetran esquinas de edificios |
| `TASK-0005` | Instanciar patrullas, presupuesto de streaming y reducir GC en loop | P1 | Propuesta | `VB-003`, `VB-005`, `VB-009`, `VB-011` | `TASK-0001` | `police`, `vehicles`, `streaming`, `renderer`, `main` | Draw calls constantes por patrulla; máx 1 sector reconstruido/frame; sin falsas bajas a 30 Hz |
| `TASK-0006` | Índice espacial `64×64 m` para `StaticBox` y extracción de `SimulationEngine` | P1 | Propuesta | `VB-002`, `ADR-0006` | `TASK-0002` | `world`, `physics`, `police`, `main` | `clearLine` consulta solo celdas intersectadas; `main.ts` desacoplado de reglas de gameplay |
| `TASK-0007` | Pulido de audio (`grounded`), minimapa dinámico y UI de pausa | P3 | Propuesta | `VB-013` | `TASK-0002` | `audio`, `player`, `ui` | Sonido de salto/pasos ligado a `grounded`; minimapa sigue al jugador y muestra coche/patrullas |
| `TASK-0008` | A* con min-heap y reservas parciales de cruces en tráfico | P2 | Propuesta | `VB-007` | `TASK-0006` | `navigation`, `traffic` | Cruce simultáneo de sentidos compatibles en verde; rutas `O((V+E) log V)` |
| `TASK-0009` | Ampliar pruebas automatizadas (UI, entrada, audio, persistencia, E2E) | P3 | Propuesta | `VB-014` | `TASK-0001` | `tests`, `.github/workflows` | Tests unitarios de módulos faltantes + smoke test navegador en CI |
| `TASK-0010` | Streaming físico Rapier y soporte multi-vehículo / NPCs | P4 | Propuesta | `ROADMAP` Et. 5–6 | `TASK-0006`, `TASK-0008` | `physics`, `world`, `vehicles`, `ai` | Carga/descarga de colisionadores estáticos por radio y múltiples coches conducibles |

- Integración Mercado Palma: conservar un único motor; medir fluidez en GPU física y ampliar la cobertura gráfica de NPC/policía/replay. La verificación de software no acredita 60 FPS.
