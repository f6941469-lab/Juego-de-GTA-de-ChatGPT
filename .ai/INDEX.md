---
document_id: CORE-INDEX
status: active
last_updated: 2026-11-20
verified_against: "96ef8fc-dirty (Phases 4-5)"
verification_scope: "typecheck + vitest (45/45) + vite build + Chromium WebGL 2 live test"
---

# Índice Inteligente de Conocimiento (`.ai/INDEX.md`)

Enrutador documental para recuperación selectiva (Nivel 1). Carga únicamente los documentos pertinentes a tu tarea.

## 1. Documentos maestros y de gestión

| Ruta | Propósito | Cuándo consultarlo | Estado |
| :--- | :--- | :--- | :--- |
| [AGENTS.md](../AGENTS.md) | Punto de entrada obligatorio y protocolos | Al iniciar cualquier sesión (Nivel 0) | Vigente |
| [.ai/CONTEXT.md](CONTEXT.md) | Visión, stack, comandos y convenciones clave | Primera incorporación o dudas transversales (Nivel 1) | Vigente |
| [.ai/CURRENT_STATE.md](CURRENT_STATE.md) | Estado operativo real, bloqueos y prioridades | Al iniciar cualquier tarea (Nivel 1) | Vigente |
| [.ai/HANDOFF.md](HANDOFF.md) | Transferencia de la última sesión | Al continuar trabajo reciente (Nivel 1) | Vigente |
| [.ai/RULES.md](RULES.md) | Reglas técnicas, nomenclatura y autorizaciones | Antes de diseñar o modificar código | Vigente |
| [.ai/DECISIONS.md](DECISIONS.md) | Registro ADR de decisiones arquitectónicas | Antes de proponer cambios de diseño | Vigente |
| [.ai/KNOWN_ISSUES.md](KNOWN_ISSUES.md) | Fallos, deuda y limitaciones verificadas (`VB-*`) | Al depurar o evaluar riesgos | Vigente |
| [.ai/ROADMAP.md](ROADMAP.md) | Fases pasadas y etapas futuras propuestas | Para priorización y contexto evolutivo | Vigente |
| [.ai/CHANGELOG.md](CHANGELOG.md) | Historial técnico resumido | Para rastrear cambios entre entregas | Vigente |
| [.ai/tasks/BACKLOG.md](tasks/BACKLOG.md) | Tareas pendientes y trazabilidad (`TASK-*`) | Al seleccionar o planificar una tarea | Vigente |
| [.ai/audits/AUDIT-0001-v0.2.0.md](audits/AUDIT-0001-v0.2.0.md) | Auditoría integral de referencia (`0.2.0`) | Análisis arquitectónico o de rendimiento | Vigente |

> **Documentos raíz de resumen humano (no duplicados):** [README.md](../README.md), [DESIGN.md](../DESIGN.md), [PROJECT_STATE.md](../PROJECT_STATE.md), [ARCHITECTURE.md](../ARCHITECTURE.md), [TASKS.md](../TASKS.md). Consúltalos si modificas entregas públicas.

## 2. Arquitectura transversal (`.ai/architecture/`)

| Documento | Propósito | Código relacionado | Cuándo consultarlo |
| :--- | :--- | :--- | :--- |
| [OVERVIEW.md](architecture/OVERVIEW.md) | Mapa de capas, módulos y límites | `src/main.ts`, `src/simulation/engine.ts`, `src/*` | Cambios multi-módulo o diseño |
| [CODEBASE_MAP.md](architecture/CODEBASE_MAP.md) | Inventario de archivos y símbolos clave | `src/**`, `tests/**` | Localizar archivos sin explorar todo |
| [EXECUTION_FLOW.md](architecture/EXECUTION_FLOW.md) | Bootstrap, `FixedLoop` 60 Hz y ciclo `frame()` | `src/main.ts`, `src/core/fixed-loop.ts` | Problemas de ciclo, tiempos o cierre |
| [DEPENDENCIES.md](architecture/DEPENDENCIES.md) | Dependencias npm/WASM y grafo interno | `package.json`, `package-lock.json`, `src/**` | Licencias, acoplamiento o paquetes |
| [DATA_FLOW.md](architecture/DATA_FLOW.md) | Contratos de datos entre subsistemas | `StaticBox`, `DistrictMap`, `AudioFrame`, `HudState` | Cambiar contratos o eventos |

## 3. Sistemas modulares (`.ai/systems/`)

| Documento | Sistema | Archivos de código principales | Dependencias documentales |
| :--- | :--- | :--- | :--- |
| [CORE_AND_INPUT.md](systems/CORE_AND_INPUT.md) | Ciclo fijo, entrada (`WASD` + teléfono), config y persistencia | `src/core/*`, `src/config/game.ts`, `src/persistence/preferences.ts` | `EXECUTION_FLOW.md`, `UI_AND_DEBUG.md` |
| [RENDERING.md](systems/RENDERING.md) | Render WebGL 2, resolución, cielo, sombras | `src/renderer/**`, `src/shaders/sky.ts` | `DATA_FLOW.md`, `WORLD_AND_STREAMING.md` |
| [WORLD_AND_STREAMING.md](systems/WORLD_AND_STREAMING.md) | Costa Palmera, destructibles, tiendas y sectores | `src/world/**` | `PHYSICS_AND_COLLISIONS.md`, `RENDERING.md` |
| [PHYSICS_AND_COLLISIONS.md](systems/PHYSICS_AND_COLLISIONS.md) | Rapier WASM, cajas estáticas, tráfico cinemático | `src/physics/*` | `EXECUTION_FLOW.md`, `PLAYER_AND_CAMERA.md`, `VEHICLES.md` |
| [PLAYER_AND_CAMERA.md](systems/PLAYER_AND_CAMERA.md) | Jugador a pie, armas/balística, avatar cúbico y cámara | `src/player/*`, `src/characters/avatar.ts` | `PHYSICS_AND_COLLISIONS.md`, `CORE_AND_INPUT.md` |
| [VEHICLES.md](systems/VEHICLES.md) | Vehículo conducible (`Rayo GT`), daños y multi-vehículo | `src/vehicles/*` | `PHYSICS_AND_COLLISIONS.md`, `PLAYER_AND_CAMERA.md` |
| [TRAFFIC_AND_NAVIGATION.md](systems/TRAFFIC_AND_NAVIGATION.md) | Grafo vial, Dijkstra, semáforos, tráfico y accidentes | `src/navigation/road-graph.ts`, `src/ai/traffic/*` | `WORLD_AND_STREAMING.md`, `PHYSICS_AND_COLLISIONS.md` |
| [POLICE_AND_WANTED.md](systems/POLICE_AND_WANTED.md) | Patrullas, LOS (`clearLine`), fuego recíproco y búsqueda | `src/ai/police/*` | `TRAFFIC_AND_NAVIGATION.md`, `PHYSICS_AND_COLLISIONS.md` |
| [NPC_AND_PERCEPTION.md](systems/NPC_AND_PERCEPTION.md) | Eventos, entidades, percepción, teléfono, testigos, combate NPC y grafo peatonal | `src/core/events.ts`, `src/simulation/*`, `src/ai/perception.ts`, `src/ai/npc/*`, `src/navigation/pedestrian-graph.ts` | `PHYSICS_AND_COLLISIONS.md`, `CORE_AND_INPUT.md` |
| [AUDIO.md](systems/AUDIO.md) | Mezclador y síntesis procedural Web Audio Doppler | `src/audio/**` | `DATA_FLOW.md`, `CORE_AND_INPUT.md` |
| [UI_AND_DEBUG.md](systems/UI_AND_DEBUG.md) | Portada, HUD, teléfono `#phone-device`, minimapa, táctil y debug F3/F4/F5 | `index.html`, `src/ui/*`, `src/debug/*` | `DATA_FLOW.md`, `CORE_AND_INPUT.md` |

## 4. Plantillas (`.ai/templates/`)
- [TASK_TEMPLATE.md](templates/TASK_TEMPLATE.md) · [ADR_TEMPLATE.md](templates/ADR_TEMPLATE.md) · [ISSUE_TEMPLATE.md](templates/ISSUE_TEMPLATE.md) · [SYSTEM_TEMPLATE.md](templates/SYSTEM_TEMPLATE.md)

## 5. Matriz de recuperación contextual

| Tipo de tarea | Documentación a cargar (Nivel 2) |
| :--- | :--- |
| **Renderizado, shaders o FPS** | `systems/RENDERING.md`, `architecture/EXECUTION_FLOW.md`, `KNOWN_ISSUES.md` (`VB-005`, `VB-006`, `VB-008`, `VB-011`) |
| **Movimiento a pie, armas o cámara** | `systems/PLAYER_AND_CAMERA.md`, `systems/PHYSICS_AND_COLLISIONS.md`, `systems/CORE_AND_INPUT.md`, `KNOWN_ISSUES.md` (`VB-006`) |
| **Vehículos, daños o conducción** | `systems/VEHICLES.md`, `systems/PHYSICS_AND_COLLISIONS.md`, `systems/PLAYER_AND_CAMERA.md`, `KNOWN_ISSUES.md` (`VB-012`) |
| **Generación de mundo, destructibles, asaltos o streaming** | `systems/WORLD_AND_STREAMING.md`, `systems/PHYSICS_AND_COLLISIONS.md`, `DECISIONS.md` (`ADR-0011`), `KNOWN_ISSUES.md` (`VB-002`, `VB-003`, `VB-010`) |
| **Tráfico, accidentes o navegación vial** | `systems/TRAFFIC_AND_NAVIGATION.md`, `systems/WORLD_AND_STREAMING.md`, `KNOWN_ISSUES.md` (`VB-004`, `VB-007`) |
| **Policía o búsqueda (Wanted)** | `systems/POLICE_AND_WANTED.md`, `systems/TRAFFIC_AND_NAVIGATION.md`, `systems/NPC_AND_PERCEPTION.md`, `KNOWN_ISSUES.md` (`VB-002`, `VB-004`, `VB-005`) |
| **NPC, percepción, teléfono, testigos o navegación peatonal** | `systems/NPC_AND_PERCEPTION.md`, `systems/PHYSICS_AND_COLLISIONS.md`, `systems/WORLD_AND_STREAMING.md`, `DECISIONS.md` (`ADR-0007`, `ADR-0008`, `ADR-0010`, `ADR-0012`) |
| **Audio procedural** | `systems/AUDIO.md`, `architecture/DATA_FLOW.md`, `KNOWN_ISSUES.md` (`VB-013`) |
| **UI, HUD, teléfono, minimapa o controles** | `systems/UI_AND_DEBUG.md`, `systems/CORE_AND_INPUT.md`, `DECISIONS.md` (`ADR-0012`), `KNOWN_ISSUES.md` (`VB-013`, `VB-014`) |
| **Optimización o refactor arquitectónico** | `architecture/OVERVIEW.md`, `architecture/EXECUTION_FLOW.md`, `audits/AUDIT-0001-v0.2.0.md`, `KNOWN_ISSUES.md` |

