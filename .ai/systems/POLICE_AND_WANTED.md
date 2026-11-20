---
document_id: SYSTEM-POLICE-WANTED
status: active
last_updated: 2026-11-20
verified_against: "45aefd3-dirty (Phase 3 working tree)"
verification_scope: "typecheck + vitest (40/40) + vite build (Phase 3)"
related_systems: [TRAFFIC_AND_NAVIGATION, WORLD_AND_STREAMING, VEHICLES, NPC_AND_PERCEPTION]
related_files:
  - src/ai/police/police.ts
  - src/ai/police/wanted.ts
  - src/physics/spatial-index.ts
---

# Sistema: Policía y Niveles de Búsqueda (`POLICE_AND_WANTED.md`)

1. **Propósito:** Gestionar el estado de búsqueda policial (0 a 5 estrellas), el despacho de patrullas terrestres no omnisciente, su navegación/detección/fuego recíproco y la detención del jugador.
2. **Estado de implementación:** Implementado para patrullas terrestres con `clearLine` acelerado por `SpatialBoxGrid`, disparo recíproco desde 2 estrellas y alertas activadas por testigos 911 o patrullas con visión real.
3. **Responsabilidades:** Registrar incidentes reportados (`report`), escalar/reducir estrellas según pérdida de contacto, spawnear patrullas fuera de línea de visión del jugador, planificar interceptación/cerco, disparar sobre el sospechoso cuando existe línea de visión limpia en persecución (`wanted.level >= 2`) y detectar captura. En `SimulationEngine`, el cambio de estrellas y estado dispara eventos `police_alerted`, `pursuit_started` y `pursuit_ended` en `WorldEventBus`.
4. **Archivos fuente relevantes:** `src/ai/police/police.ts`, `src/ai/police/wanted.ts`.
5. **Clases y funciones principales:** `createPolice`, `clearLine`, `createWantedSystem`, `responseLevels`.
6. **Interfaces públicas:** `Location`, `SearchState`, `responseLevels`, API de `createPolice` (`wanted`, `reportImpact`, `step`, `render`, `takeDetention`, `reset`, `units`, `routes`).
7. **Dependencias:** `three`, `src/navigation/road-graph.ts`, `src/vehicles/vehicle-model.ts`, `StaticBox` / `SpatialBoxGrid` (`src/physics/physics.ts`, `src/physics/spatial-index.ts`).
8. **Sistemas dependientes:** `src/simulation/engine.ts`, `src/main.ts`, `src/debug/overlay.ts`, `src/audio/audio.ts` (recibe `police.units`), `src/physics/vehicle-obstacles.ts`, `src/core/events.ts`.
9. **Flujo de funcionamiento:** `responseLevels` define unidades deseadas (`1` incluso en nivel 0 como patrulla ambiental, hasta `5` en nivel 5), rango de detección (`35..53 m`) y paciencia (`11..23 s`). Sin testigos, llamadas 911 completadas (`2.1 s`) o visión directa de una patrulla cercana (`clearLine`), los delitos aislados/tiros no alertan mágicamente a la policía. Cuando `wanted.level >= 2`, `wanted.state === 'Persecución'`, distancia `< 25 m` y `clearLine` real sin edificios de por medio, las unidades cercanas abren fuego con cadencia controlada (`combat.onFire`), emitiendo trazadores y daño (`8` HP por impacto) detenidos por cobertura sólida. Si en `'Persecución'` el jugador está `< 4.1 m` con `speed < 3.5` durante `1.6 s`, `takeDetention()` retorna `true`.
10. **Estructuras de datos relevantes:** `SearchState` (`'Patrullaje' | 'Investigación' | 'Persecución' | 'Búsqueda'`), `Patrol` (`fireCooldown`), `wanted` (`level`, `lastKnown`, `predicted`, `hasSight`).
11. **Invariantes:** Cooldown de `2.75 s` entre reportes automáticos no forzados; línea de visión bloqueada por edificios vía `clearLine` (`SpatialBoxGrid` en ejecución normal, `StaticBox[]` soportado por compatibilidad); cobertura sólida bloquea tanto la visión como los disparos policiales.
12. **Restricciones:** Solo unidades terrestres sobre `RoadGraph`; perímetros avanzados, unidades a pie y memoria descriptiva pertenecen a Fase 6.
13. **Problemas conocidos:** `VB-002` (streaming físico pendiente, aunque `clearLine` ya es `O(celdas)`), `VB-004` (patrullas ignoran `traffic.vehicles` y frenan ante edificios con margen `0.65m` menor al coche), `VB-005` (`createVehicleModel` sin instanciación), `VB-008` (carece de `dispose()` distinto a `reset()`).
14. **Consideraciones de rendimiento:** Gracias a `SpatialBoxGrid`, `clearLine()` dejó de recorrer miles de cajas estáticas por patrulla (`VB-002`); el principal coste gráfico remanente son los ~130+ draw calls no instanciados de hasta 5 patrullas (`VB-005`).
15. **Métodos de verificación:** `tests/police.test.ts` (2 tests), `tests/wanted.test.ts` (2 tests) y `tests/combat-and-heists.test.ts` (no omnisciencia sin testigos + disparo policial bloqueado tras cobertura vs línea limpia).
16. **Riesgos de modificación:** Modificar `clearLine` o `holding` puede hacer que las patrullas queden atascadas permanentemente en fachadas, pierdan persecución o disparen a través de paredes.
17. **Referencias relacionadas:** [TRAFFIC_AND_NAVIGATION.md](TRAFFIC_AND_NAVIGATION.md), [VEHICLES.md](VEHICLES.md), [PHYSICS_AND_COLLISIONS.md](PHYSICS_AND_COLLISIONS.md).
18. **Última verificación:** 2026-11-20 (`typecheck`, Vitest 40/40 y build tras Fase 3).

