---
document_id: CORE-CHANGELOG
status: active
last_updated: 2026-11-20
verified_against: "96ef8fc-dirty (Phases 4-5)"
verification_scope: "typecheck + vitest (45/45) + vite build + Chromium WebGL 2 live test"
---

# Historial Técnico Resumido (`CHANGELOG.md`)

> Para notas orientadas a jugador/entrega, ver [CHANGELOG.md](../CHANGELOG.md).

## 2026-11-20 · Fase 5 — Teléfono móvil integrado, viralización urbana y cierre de `VB-015` (working tree sobre `96ef8fc`)
- **Resumen:** Resolución del conflicto `ArrowUp` (`VB-015`) dejando `WASD` dedicado al movimiento/conducción y asignando `ArrowUp`/`KeyM`/`#touch-phone` al teléfono diegético `createPhoneSystem` (`camera`, `feed`, `emergency` 911, `alerts`). La cámara emite `'recording_started'` con percepción NPC directa (`perception.ts` + `npc-brain.ts`), detecta incidentes reales (`glass_broken`, `gunshot_fired`, `robbery_*`, `traffic_accident`) y publica clips en `'video_published'` con vistas crecientes.
- **Sistemas afectados:** Simulación (`simulation/phone.ts`, `simulation/engine.ts`), Entrada (`core/input.ts`), IA/Percepción (`ai/perception.ts`, `ai/npc/npc-brain.ts`), UI (`index.html`, `ui/hud.css`, `ui/ui.ts`, `main.ts`) y pruebas (`tests/phone-system.test.ts`).
- **Verificaciones:** `npm run typecheck` (`0` errores), `npm test` (`17` archivos, `45/45` verdes), `npm run build` (`64` módulos) y prueba viva en Chromium headless WebGL 2 (`ArrowUp` abre `#phone-device` con posición fija `-0.0, 0.0, 25.0`, `Enter` navega `Cámara` -> `● REC 0.1 s` -> `Social · 73 vistas`, `0` excepciones JS y `0` errores de consola).
- **Riesgos pendientes:** Policía avanzada/investigación en Fase 6; persisten `VB-002` (streaming físico Rapier), `VB-003`, `VB-004` y `VB-005`.

## 2026-11-20 · Fase 4 — Entorno dinámico y destructible: escaparates, mobiliario Rapier y accidentes con huida (working tree sobre `96ef8fc`)
- **Resumen:** Sistema destructible GPU-instanciado (`createDestructibles`) para `18` vidrieras fracturables de las 9 tiendas y mobiliario urbano con colisionadores Rapier (`hydrant` con chorro de agua, `bollard`, `crate`, `bench`), pool circular acotado de escombros (`96`) y humo/agua (`64`), cues sonoros (`glass`, `debris`), eventos `'glass_broken'`, `'object_destroyed'` y `'traffic_accident'`, daño mecánico y visual en `vehicle.ts` y `traffic.ts`/`traffic-visuals.ts`, y evacuación de ocupantes (`fromAccident`) con transeúntes acercándose al siniestro.
- **Sistemas afectados:** Mundo (`world/destructibles.ts`, `world/generation/buildings.ts`), Vehículos/Tráfico (`vehicles/vehicle.ts`, `ai/traffic/traffic*.ts`), NPC (`ai/npc/npc-population.ts`), Balística/Audio (`player/weapons.ts`, `audio/audio.ts`), Simulación (`simulation/engine.ts`) y pruebas (`tests/destructibles-and-accidents.test.ts`).
- **Verificaciones:** `npm run typecheck` (`0` errores), `npm test` (`16` archivos, `43/43` verdes), `npm run build` (`63` módulos) y prueba viva en Chromium headless WebGL 2 (`Digit3` -> `Carabina táctica · 24/72`, `F3`, `0` excepciones JS y `0` errores de consola).
- **Riesgos pendientes:** Teléfono móvil integrado (`VB-015`) en Fase 5; persisten `VB-002` (streaming físico), `VB-003`, `VB-004` y `VB-005`.

## 2026-11-20 · Fase 3 — Armas, balística, testigos 911, asaltos completos y combate policial · Commit `96ef8fc`
- **Resumen:** Sistema completo de armas (`unarmed`, `pistol`, `carbine`) con munición/recarga, apuntado y disparo en teclado/ratón/táctil, trazadores instanciados y raycast detenido por muros en `SpatialBoxGrid`, malla armada en el avatar, cues procedurales (`shot`, `reload`, `empty`, `cash`), amenazas perceptibles (`weapon_drawn`, `weapon_aimed`, `shot_fired`, `npc_injured`, `witness_detected`, `robbery_finished`), testigos no omniscientes interrumpibles antes de completar su llamada al 911 (`2.1 s`), asaltos progresivos de tienda con cooperación/intimidación del dependiente y pago de botín (`$`), combate cuerpo a cuerpo NPC y fuego policial recíproco desde 2 estrellas respetando cobertura.
- **Sistemas afectados:** Jugador/Armas/Avatar (`player/weapons.ts`, `player/player.ts`, `characters/avatar.ts`), Entrada (`core/input.ts`), Mundo/Asaltos (`world/stores.ts`), NPC/Policía (`ai/npc/npc-population.ts`, `ai/police/police.ts`), Simulación (`simulation/engine.ts`), Audio/UI (`audio/audio.ts`, `ui/ui.ts`, `ui/hud.css`, `index.html`, `main.ts`) y pruebas (`tests/combat-and-heists.test.ts`, `tests/urban-life.test.ts`).
- **Verificaciones:** `npm run typecheck` (`0` errores), `npm test` (`15` archivos, `40/40` verdes), `npm run build` (`62` módulos) y prueba viva en Chromium headless WebGL 2 (`#cash-display: "$0"`, `Digit2` -> `Pistola 9mm · 12/48`, `F3`, `0` excepciones JS y `0` errores de consola).
- **Riesgos pendientes:** Destructibilidad de entorno/cristales en Fase 4; persisten `VB-002` (streaming físico), `VB-003`, `VB-004`, `VB-005` y `VB-015` (`ArrowUp`).

## 2026-11-20 · Fase 2 — Vida urbana: población NPC instanciada, conductores reales, robo multi-vehículo e interiores · Commit `45aefd3`
- **Resumen:** Población de la ciudad con ciudadanos instanciados (7 `InstancedMesh`, hasta 72 NPCs) sobre `PedestrianGraph` por distrito y horario, dependientes reales (`merchant`) dentro de los 9 comercios ya transitables físicamente en planta baja, conductores visibles en `traffic.ts` con robo de vehículos (`hijackNearest` + `VehicleManager` multi-vehículo + ex-conductor NPC en calle), altura ocular de percepción `1.15 m` y extracción de `SimulationEngine` desde `main.ts`.
- **Sistemas afectados:** Simulación (`simulation/engine.ts`), NPC/Percepción (`ai/npc/npc-visuals.ts`, `ai/npc/npc-population.ts`, `ai/perception.ts`), Tráfico/Vehículos (`ai/traffic/traffic*.ts`, `vehicles/vehicle.ts`, `vehicles/vehicle-manager.ts`), Mundo (`world/generation/buildings.ts`, `world/generation/layout.ts`, `world/district.ts`, `world/stores.ts`), Eventos (`core/events.ts`), `main.ts` y pruebas (`tests/urban-life.test.ts`).
- **Verificaciones:** `npm run typecheck` (`0` errores), `npm test` (`14` archivos, `37/37` verdes), `npm run build` (`61` módulos) y prueba en Chromium headless WebGL 2 (`Costa Palmera`, `F3`: `17 entidades · 514 colisionadores · 3 tráfico · 11 NPC · 1 patrullas`, `0` excepciones JS).
- **Riesgos pendientes:** Armas/combate/testigos 911 completos en Fase 3; persisten `VB-002` (streaming físico), `VB-003`, `VB-004`, `VB-005` y `VB-015` (`ArrowUp`).

## 2026-11-20 · Fase 1 — Fundamentos de simulación del ecosistema urbano · Commit `e2288b5`
- **Resumen:** Implementación de la arquitectura base de simulación sin poblar aún multitudes visibles: centralización de `physics.step(dt)` (`VB-001`), índice espacial `SpatialBoxGrid` (`VB-002` LOS), bus `WorldEventBus`, registro dinámico `EntityRegistry` por niveles de simulación (`high`/`medium`/`low`), `PerceptionSystem` visual/auditivo realista, perfiles deterministas + `NpcBrain` híbrido Utilidad/FSM, `PedestrianGraph` (A* MinHeap sobre aceras/cruces/puentes/tiendas + steering local) e inspector `F5`.
- **Sistemas afectados:** Física (`physics.ts`, `spatial-index.ts`), Jugador/Vehículo (`player.ts`, `vehicle.ts`), Core/Simulación (`events.ts`, `entities.ts`, `input.ts`), IA/Navegación (`perception.ts`, `npc/profiles.ts`, `npc/npc-brain.ts`, `police/police.ts`, `navigation/pedestrian-graph.ts`), Mundo (`district.ts`), Orquestador/Debug (`main.ts`, `inspector.ts`, `overlay.ts`, `stats.ts`, `index.html`) y pruebas (`events-and-entities.test.ts`, `perception-and-npc.test.ts`, `pedestrian-navigation.test.ts`).
- **Verificaciones:** `npm run typecheck` (`0` errores), `npm test` (`13` archivos, `35/35` verdes), `npm run build` (`54` módulos) y smoke test Chromium WebGL 2 (`F5` inspector operativo, `0` errores).
- **Riesgos pendientes:** Falta poblar peatones/conductores/dependientes en Fase 2; persisten `VB-002` (streaming físico Rapier), `VB-003`, `VB-004`, `VB-005` y nuevo aviso `VB-015` (`ArrowUp` en `input.ts`).

## 2026-11-20 · Mapa multi-distrito conectado y tiendas interactuables (cambios sobre `0f54f65`, commit `ef1f5d1`)
- **Resumen:** Reconstrucción del trazado urbano estilo Vice City con Isla Este (`Costa Palmera`, `Punta Palmera`), `Isla Estrella` y Tierra Firme Oeste (`Centro Financiero`, `Pequeña Palmera`, `Puerto y Muelles`) conectadas por 3 puentes (`Puente Norte`, `Calzada Central`, `Puente Sur`) sobre Bahía Central; incorporación de 9 tiendas repartidas por el mapa (`src/world/stores.ts`) con balizas instanciadas e interacción básica de asalto (`E` / táctil) que notifica al HUD y alerta a la policía.
- **Sistemas afectados:** Mundo (`layout.ts`, `district.ts`, `streets.ts`, `coast.ts`, `buildings.ts`, `stores.ts`), UI (`minimap.ts`, `ui.ts`, `hud.css`, `index.html`), Orquestador (`main.ts`) y pruebas (`district.test.ts`, `stores.test.ts`).
- **Verificaciones:** `npm run typecheck`, `npm test` (`10` archivos, `27/27`), `npm run build` y smoke test en Chromium headless WebGL 2 (SwiftShader).
- **Riesgos pendientes:** Sigue pendiente el sistema completo de asalto/policía, pruebas manuales de recorrido completo en navegador real y los hallazgos P1 previos (`VB-001`..`VB-005`).

## 2026-11-20 · `DOC-MEMORY-INIT` · Commit `0f54f650e29eb488de880fc89e15e7d63744eaf8`
- **Resumen:** Auditoría técnica integral (`AUDIT-0001`) e implantación del Sistema de Memoria Técnica Persistente en `AGENTS.md` y `.ai/`.
- **Motivación:** Preservar arquitectura, contratos, hallazgos verificados (`VB-001`..`VB-014`), decisiones y protocolo de trabajo entre sesiones de IA sin pérdida de contexto.
- **Sistemas afectados:** Exclusivamente documentación (`AGENTS.md`, `.ai/**`). Cero modificaciones en `src/`, `tests/` o configuración.
- **Verificaciones:** Análisis estático completo de los 71 archivos rastreados y pruebas de recuperación documental en 3 escenarios. Ejecución de build/tests pendiente de `npm ci` autorizado.
- **Riesgos pendientes:** Requiere sincronizar verificación de runtime tras autorizar `TASK-0001`.

## 2026-11-18 · `0.2.0` · Commit `248f8b44b7aebf77fc38a0d5c0bde996e680cec5`
- **Resumen:** Integración jugable de conducción (`Rayo GT`), grafo vial y tráfico con semáforos, policía con sistema de búsqueda de 5 estrellas, audio procedural Web Audio, expansión del distrito por sectores (`64 m`), sombras de contacto y resolución adaptativa.
- **Archivos relevantes:** 49 archivos cambiados (`+3215 / -234`), añadiendo `src/ai/**`, `src/audio/**`, `src/navigation/**`, `src/vehicles/**`, `src/world/streaming.ts`, `src/renderer/resolution.ts`, `src/renderer/postprocessing/contact-shadows.ts`, `.github/workflows/ci.yml` y 6 suites de tests.
- **Verificaciones reportadas en entrega (`PROJECT_STATE.md`):** Build y 25 pruebas pasaron en entrega original; pendiente re-verificar en checkout actual sin `node_modules`.

## 2026-11-18 · `0.1.0` · Commit `2ee553f08532ebd18ea48597eb7c1db879bcf2ad`
- **Resumen:** Base modular Vite + TypeScript + Three.js + Rapier + Vitest; primer distrito costero Costa Palmera, personaje cúbico en tercera persona, ciclo solar/cielo/agua, HUD/minimapa, persistencia IndexedDB de calidad gráfica y 3 suites iniciales (8 pruebas).
