---
document_id: SYSTEM-POLICE-WANTED
status: active
last_updated: 2026-11-20
verified_against: "248f8b44b7aebf77fc38a0d5c0bde996e680cec5"
verification_scope: "static-analysis-only"
related_systems: [TRAFFIC_AND_NAVIGATION, WORLD_AND_STREAMING, VEHICLES]
related_files:
  - src/ai/police/police.ts
  - src/ai/police/wanted.ts
---

# Sistema: Policía y Niveles de Búsqueda (`POLICE_AND_WANTED.md`)

1. **Propósito:** Gestionar el estado de búsqueda policial (0 a 5 estrellas), el despacho de patrullas terrestres, su navegación/detección y la detención del jugador.
2. **Estado de implementación:** Implementado para patrullas terrestres; sin apoyo aéreo ni unidades especiales.
3. **Responsabilidades:** Registrar incidentes (`report`), escalar/reducir estrellas según pérdida de contacto, spawnear patrullas fuera de línea de visión del jugador, planificar interceptación/cerco y detectar captura.
4. **Archivos fuente relevantes:** `src/ai/police/police.ts`, `src/ai/police/wanted.ts`.
5. **Clases y funciones principales:** `createPolice`, `clearLine`, `createWantedSystem`, `responseLevels`.
6. **Interfaces públicas:** `Location`, `SearchState`, `responseLevels`, API de `createPolice` (`wanted`, `reportImpact`, `step`, `render`, `takeDetention`, `reset`, `units`, `routes`).
7. **Dependencias:** `three`, `src/navigation/road-graph.ts`, `src/vehicles/vehicle-model.ts`, `StaticBox` (`src/physics/physics.ts`).
8. **Sistemas dependientes:** `src/main.ts`, `src/debug/overlay.ts`, `src/audio/audio.ts` (recibe `police.units`), `src/physics/vehicle-obstacles.ts`.
9. **Flujo de funcionamiento:** `responseLevels` define unidades deseadas (`1` incluso en nivel 0 como patrulla ambiental, hasta `5` en nivel 5), rango de detección (`35..53 m`) y paciencia (`11..23 s`). Cada `0.24 s` despawnea patrullas a `> 175 m` o sobrantes, spawnea en nodos a `44..145 m` ocultos al jugador, comprueba visión (`viewing` + `clearLine` contra `StaticBox` con `y ∈ (1,2)`) y replanifica rutas hacia `lastKnown` o `predicted` (en nivel `≥ 4`, unidades `≥ 3` bloquean cruces por delante). Si en estado `'Persecución'` el jugador está `< 4.1 m` con `speed < 3.5` durante `1.6 s`, `takeDetention()` retorna `true`.
10. **Estructuras de datos relevantes:** `SearchState` (`'Patrullaje' | 'Investigación' | 'Persecución' | 'Búsqueda'`), `Patrol`, `wanted` (`level`, `lastKnown`, `predicted`, `hasSight`).
11. **Invariantes:** Cooldown de `2.75 s` entre reportes automáticos no forzados; línea de visión bloqueada por edificios vía intersección rayo-AABB 2D (`clearLine`).
12. **Restricciones:** Solo unidades terrestres sobre `RoadGraph`; sin lógica de disparo ni combate.
13. **Problemas conocidos:** `VB-002` (`clearLine` `O(N)` sobre todas las cajas del distrito), `VB-004` (patrullas ignoran `traffic.vehicles` y frenan ante edificios con margen `0.65m` menor al coche), `VB-005` (`createVehicleModel` sin instanciación), `VB-008` (carece de `dispose()` distinto a `reset()`).
14. **Consideraciones de rendimiento:** En cada replanificación y en cada paso `steer()` de cada patrulla se ejecuta `clearLine()` recorriendo todas las cajas estáticas; además 5 patrullas añaden ~130+ draw calls no instanciados.
15. **Métodos de verificación:** `tests/police.test.ts` (2 tests) y `tests/wanted.test.ts` (2 tests).
16. **Riesgos de modificación:** Modificar `clearLine` o `holding` puede hacer que las patrullas queden atascadas permanentemente en fachadas o pierdan persecución inmediatamente.
17. **Referencias relacionadas:** [TRAFFIC_AND_NAVIGATION.md](TRAFFIC_AND_NAVIGATION.md), [VEHICLES.md](VEHICLES.md).
18. **Última verificación:** 2026-11-20 (análisis estático sobre `248f8b4`).
