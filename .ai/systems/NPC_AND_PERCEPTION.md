---
document_id: SYSTEM-NPC-PERCEPTION
status: active
last_updated: 2026-11-20
verified_against: "96ef8fc-dirty (Phase 5 working tree)"
verification_scope: "typecheck + vitest (45/45) + vite build (Phase 5)"
related_systems: [CORE_AND_INPUT, PHYSICS_AND_COLLISIONS, TRAFFIC_AND_NAVIGATION, POLICE_AND_WANTED, WORLD_AND_STREAMING]
related_files:
  - src/core/events.ts
  - src/simulation/entities.ts
  - src/simulation/engine.ts
  - src/simulation/phone.ts
  - src/ai/perception.ts
  - src/ai/npc/profiles.ts
  - src/ai/npc/npc-brain.ts
  - src/ai/npc/npc-visuals.ts
  - src/ai/npc/npc-population.ts
  - src/navigation/pedestrian-graph.ts
---

# Sistema: Fundamentos de Simulación, Eventos, Percepción y NPC (`NPC_AND_PERCEPTION.md`)

1. **Propósito:** Proveer tanto la infraestructura de simulación (`WorldEventBus`, `EntityRegistry`, `PerceptionSystem`, `NpcBrain`, `PedestrianGraph`) como la población NPC viva instanciada en escena (`npc-population.ts`, `npc-visuals.ts`) integrada con `SimulationEngine`.
2. **Estado de implementación:** **Fases 1 a 5 completadas y verificadas**. Los ciudadanos autónomos perciben amenazas armadas, destrozos, accidentes (`inspectingAccident`) y grabaciones en vivo (`recording_started`), reaccionando según personalidad y reportando delitos tras `2.1 s` sin omnisciencia.
3. **Responsabilidades:** Emitir y acotar eventos del mundo; indexar entidades por celda y tier (`high`/`medium`/`low`); evaluar FOV + LOS (`SpatialBoxGrid` a altura ocular `minY = 1.15 m`, con confirmación directa de estímulos visuales cercanos `<= 14 m`); poblar y animar hasta 72 NPCs en 7 `InstancedMesh`; gestionar salud/daño (`applyDamage`), intimidación, confrontación, reacción a cámaras/accidentes, ex-conductores y testigos 911 interrumpibles.
4. **Archivos fuente relevantes:** `src/core/events.ts`, `src/simulation/{entities,engine,phone}.ts`, `src/ai/perception.ts`, `src/ai/npc/{profiles,npc-brain,npc-visuals,npc-population}.ts`, `src/navigation/pedestrian-graph.ts`.
5. **Clases y funciones principales:** `WorldEventBus`, `EntityRegistry`, `createSimulationEngine`, `createPhoneSystem`, `evaluatePerception`, `inFieldOfView`, `createNpcIdentity`, `createNpcBrain`, `stepNpcBrain`, `createNpcVisuals`, `createNpcPopulation`, `buildPedestrianGraph`, `findPedestrianRoute`, `findEscapeNode`, `steerPedestrian`.
6. **Interfaces públicas:** `WorldEvent`, `WorldEventType`, `WorldEntity`, `SimulationTier`, `PerceptionFrame`, `ObserverState`, `NpcRole`, `NpcIdentity`, `NpcEmotionalState`, `NpcIntent`, `NpcBrainState`, `NpcAgent`, `NpcVisualAgent`, `PedestrianGraph`, `PedestrianNode`.
7. **Dependencias:** `three`, `src/physics/spatial-index.ts`, `src/world/generation/layout.ts`, `src/world/stores.ts`.
8. **Sistemas dependientes:** `src/simulation/engine.ts`, `src/main.ts`, `src/debug/overlay.ts`, `src/debug/inspector.ts`.
9. **Flujo de funcionamiento:** Cada tick, `SimulationEngine` avanza `WorldEventBus`, teléfono móvil, destructibles, armas, vehículos/tráfico/policía y ejecuta `npcPopulation.step()`. Los dependientes atienden tras mostrador y cooperan ante intimidación o rotura de escaparates. Al emitir `recording_started` cerca de un peatón dentro de su FOV + LOS, `stepNpcBrain` eleva alerta/curiosidad (o incomodidad en roles nerviosos/agresivos). Testigos en `call_help` emiten `crime_reported` tras `2.1 s` salvo intimidación previa.
10. **Estructuras de datos relevantes:** `10` roles (`calm_civilian`..`police`), `17` estados emocionales, `7` `InstancedMesh` compartidos (`72` instancias máx.), cubetas espaciales `32 m`.
11. **Invariantes:** `WorldEventBus` nunca entrega eventos fuera de radio; muros bloquean visión y atenúan sonido (`×0.42`); mostradores (`1.04 m`) no bloquean la visión de dependientes (`minY = 1.15 m`); intimidar/derribar a un testigo en `< 2.1 s` evita `crime_reported`; `dispose()` libera todos los `InstancedMesh`.
12. **Restricciones:** Policía avanzada con perímetros y memoria descriptiva pertenecen a Fase 6.
13. **Problemas conocidos:** Ninguno abierto crítico en percepción (`VB-015` resuelto en Fase 5).
14. **Consideraciones de rendimiento:** Toda la multitud (hasta 72 ciudadanos) consume únicamente `7` draw calls mediante `InstancedMesh`; percepción escalonada por tiers (`high` vs `medium`/`low`).
15. **Métodos de verificación:** `tests/events-and-entities.test.ts` (4), `tests/perception-and-npc.test.ts` (2), `tests/pedestrian-navigation.test.ts` (2), `tests/urban-life.test.ts` (2), `tests/combat-and-heists.test.ts` (3), `tests/destructibles-and-accidents.test.ts` (3) y `tests/phone-system.test.ts` (2).
16. **Riesgos de modificación:** Cambiar `minY` en `perception.ts` por debajo de `1.04 m` haría que los mostradores bloqueen la vista de los dependientes dentro de tiendas; alterar `distance <= 14` en `evaluatePerception` afecta la captura de eventos visuales breves.
17. **Referencias relacionadas:** [PHYSICS_AND_COLLISIONS.md](PHYSICS_AND_COLLISIONS.md), [TRAFFIC_AND_NAVIGATION.md](TRAFFIC_AND_NAVIGATION.md), [WORLD_AND_STREAMING.md](WORLD_AND_STREAMING.md).
18. **Última verificación:** 2026-11-20 (`typecheck`, `vitest` 45/45 y `vite build` tras Fase 5).

