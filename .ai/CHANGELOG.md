---
document_id: CORE-CHANGELOG
status: active
last_updated: 2026-11-20
verified_against: "ef1f5d115168a40a89b767658274cc28ac17b8de"
verification_scope: "typecheck-tests-build-phase1"
---

# Historial Técnico Resumido (`CHANGELOG.md`)

> Para notas orientadas a jugador/entrega, ver [CHANGELOG.md](../CHANGELOG.md).

## 2026-11-20 · Fase 1 — Fundamentos de simulación del ecosistema urbano (cambios locales sobre `ef1f5d1`)
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
