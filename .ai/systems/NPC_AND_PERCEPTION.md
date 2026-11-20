---
document_id: SYSTEM-NPC-PERCEPTION
status: active
last_updated: 2026-11-20
verified_against: "e2288b5"
verification_scope: "typecheck + vitest (37/37) + vite build (Phase 2)"
related_systems: [CORE_AND_INPUT, PHYSICS_AND_COLLISIONS, TRAFFIC_AND_NAVIGATION, POLICE_AND_WANTED, WORLD_AND_STREAMING]
related_files:
  - src/core/events.ts
  - src/simulation/entities.ts
  - src/simulation/engine.ts
  - src/ai/perception.ts
  - src/ai/npc/profiles.ts
  - src/ai/npc/npc-brain.ts
  - src/ai/npc/npc-visuals.ts
  - src/ai/npc/npc-population.ts
  - src/navigation/pedestrian-graph.ts
---

# Sistema: Fundamentos de Simulación, Eventos, Percepción y NPC (`NPC_AND_PERCEPTION.md`)

1. **Propósito:** Proveer tanto la infraestructura de simulación (`WorldEventBus`, `EntityRegistry`, `PerceptionSystem`, `NpcBrain`, `PedestrianGraph`) como la población NPC viva instanciada en escena (`npc-population.ts`, `npc-visuals.ts`) integrada con `SimulationEngine`.
2. **Estado de implementación:** **Fases 1 y 2 completadas y verificadas**. Los ciudadanos autónomos instanciados recorren aceras/cruces/puentes, los dependientes atienden en las 9 tiendas y los conductores reales circulan y reaccionan si se les roba el vehículo.
3. **Responsabilidades:** Emitir y acotar eventos del mundo; indexar entidades por celda y tier (`high`/`medium`/`low`); evaluar FOV + LOS (`SpatialBoxGrid` a altura ocular `minY = 1.15 m`) + reconocimiento + atenuación sonora por muros; poblar y animar hasta 72 NPCs en 7 `InstancedMesh`; gestionar dependientes de tiendas, ex-conductores expulsados, atropellos/esquivas y reportes reales de testigos al 911.
4. **Archivos fuente relevantes:** `src/core/events.ts`, `src/simulation/{entities,engine}.ts`, `src/ai/perception.ts`, `src/ai/npc/{profiles,npc-brain,npc-visuals,npc-population}.ts`, `src/navigation/pedestrian-graph.ts`.
5. **Clases y funciones principales:** `WorldEventBus`, `EntityRegistry`, `createSimulationEngine`, `evaluatePerception`, `inFieldOfView`, `createNpcIdentity`, `createNpcBrain`, `stepNpcBrain`, `createNpcVisuals`, `createNpcPopulation`, `buildPedestrianGraph`, `findPedestrianRoute`, `findEscapeNode`, `steerPedestrian`.
6. **Interfaces públicas:** `WorldEvent`, `WorldEventType`, `WorldEntity`, `SimulationTier`, `PerceptionFrame`, `ObserverState`, `NpcRole`, `NpcIdentity`, `NpcEmotionalState`, `NpcIntent`, `NpcBrainState`, `NpcAgent`, `NpcVisualAgent`, `PedestrianGraph`, `PedestrianNode`.
7. **Dependencias:** `three`, `src/physics/spatial-index.ts`, `src/world/generation/layout.ts`, `src/world/stores.ts`.
8. **Sistemas dependientes:** `src/simulation/engine.ts`, `src/main.ts`, `src/debug/overlay.ts`, `src/debug/inspector.ts`.
9. **Flujo de funcionamiento:** Cada tick, `SimulationEngine` avanza `WorldEventBus`, sincroniza jugador/vehículos/tráfico/policía y ejecuta `npcPopulation.step()`. Los dependientes (`merchant`) atienden detrás del mostrador de cada tienda; los peatones navegan `PedestrianGraph` con densidad según hora (`~42%` noche, `100%` día) y roles por distrito. La percepción se escalona en tier `high` (`~12 Hz`) usando `evaluatePerception` (`minY = 1.15 m` para ver por encima de mostradores y malecones sin atravesar muros). Testigos en `call_help` emiten `crime_reported` tras `2.1 s` y alertan a policía sin omniscencia inmediata.
10. **Estructuras de datos relevantes:** `10` roles (`calm_civilian`..`police`), `17` estados emocionales, `7` `InstancedMesh` compartidos (`72` instancias máx.), cubetas espaciales `32 m`.
11. **Invariantes:** `WorldEventBus` nunca entrega eventos fuera de radio; muros bloquean visión y atenúan sonido (`×0.42`); mostradores (`1.04 m`) no bloquean la visión de dependientes (`minY = 1.15 m`); `dispose()` libera todos los `InstancedMesh`.
12. **Restricciones:** Armas/tiroteos/intimidación detallada y viralización por teléfono pertenecen a Fases 3–5.
13. **Problemas conocidos:** Conflicto futuro `ArrowUp` en `input.ts` para el teléfono en Fase 5 (`VB-015`).
14. **Consideraciones de rendimiento:** Toda la multitud (hasta 72 ciudadanos) consume únicamente `7` draw calls mediante `InstancedMesh`; percepción escalonada por tiers (`high` vs `medium`/`low`).
15. **Métodos de verificación:** `tests/events-and-entities.test.ts` (4 tests), `tests/perception-and-npc.test.ts` (2 tests), `tests/pedestrian-navigation.test.ts` (2 tests), `tests/urban-life.test.ts` (2 tests).
16. **Riesgos de modificación:** Cambiar `minY` en `perception.ts` por debajo de `1.04 m` haría que los mostradores bloqueen la vista de los dependientes dentro de tiendas.
17. **Referencias relacionadas:** [PHYSICS_AND_COLLISIONS.md](PHYSICS_AND_COLLISIONS.md), [TRAFFIC_AND_NAVIGATION.md](TRAFFIC_AND_NAVIGATION.md), [WORLD_AND_STREAMING.md](WORLD_AND_STREAMING.md).
18. **Última verificación:** 2026-11-20 (`typecheck`, `vitest` 37/37 y `vite build` tras Fase 2).

