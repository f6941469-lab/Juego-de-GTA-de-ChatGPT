---
document_id: SYSTEM-NPC-PERCEPTION
status: active
last_updated: 2026-11-20
verified_against: "ef1f5d115168a40a89b767658274cc28ac17b8de-dirty"
verification_scope: "typecheck + vitest (35/35) + vite build + Chromium smoke test"
related_systems: [CORE_AND_INPUT, PHYSICS_AND_COLLISIONS, TRAFFIC_AND_NAVIGATION, POLICE_AND_WANTED]
related_files:
  - src/core/events.ts
  - src/simulation/entities.ts
  - src/ai/perception.ts
  - src/ai/npc/profiles.ts
  - src/ai/npc/npc-brain.ts
  - src/navigation/pedestrian-graph.ts
---

# Sistema: Fundamentos de Simulación, Eventos, Percepción y NPC (`NPC_AND_PERCEPTION.md`)

1. **Propósito:** Proveer la infraestructura reutilizable de simulación urbana viva: bus de eventos no omnisciente (`WorldEventBus`), registro espacial de entidades con niveles de fidelidad (`EntityRegistry`), percepción visual/auditiva realista, personalidades/estados emocionales de NPC y navegación peatonal por aceras/puentes.
2. **Estado de implementación:** **Fase 1 completada (fundamentos verificados)**. Los NPC autónomos con mallas animadas en calle y rutinas cotidianas se integrarán en Fase 2 sobre esta base.
3. **Responsabilidades:** Emitir y acotar temporal/espacialmente eventos del mundo; indexar entidades dinámicas por celda y distancia (`high`/`medium`/`low`); evaluar FOV + LOS (`SpatialBoxGrid`) + tiempo de reconocimiento + atenuación sonora por muros; decidir estados emocionales e intenciones con histéresis; calcular rutas peatonales A* y esquiva local.
4. **Archivos fuente relevantes:** `src/core/events.ts`, `src/simulation/entities.ts`, `src/ai/perception.ts`, `src/ai/npc/{profiles,npc-brain}.ts`, `src/navigation/pedestrian-graph.ts`.
5. **Clases y funciones principales:** `WorldEventBus`, `EntityRegistry`, `computeSimulationTier`, `evaluatePerception`, `inFieldOfView`, `createNpcIdentity`, `createNpcBrain`, `stepNpcBrain`, `buildPedestrianGraph`, `findPedestrianRoute`, `findEscapeNode`, `steerPedestrian`.
6. **Interfaces públicas:** `WorldEvent`, `WorldEventType`, `WorldEntity`, `SimulationTier`, `PerceptionFrame`, `ObserverState`, `NpcRole`, `NpcIdentity`, `NpcEmotionalState`, `NpcIntent`, `NpcBrainState`, `PedestrianGraph`, `PedestrianNode`.
7. **Dependencias:** `src/physics/spatial-index.ts`, `src/world/generation/layout.ts` (`makeRandom`, trazado vial y `storeSpecs`).
8. **Sistemas dependientes:** `src/main.ts` (emite eventos y sincroniza `EntityRegistry` + `PedestrianGraph`), `src/debug/overlay.ts`, `src/debug/inspector.ts`.
9. **Flujo de funcionamiento:** Cada tick, `eventBus.advance(dt)` purga eventos expirados (`ttl = 30s`). Las acciones de mundo (`robbery_started`, `vehicle_collision`, `horn_honked`, `police_alerted`, `pursuit_started`/`ended`) emiten eventos con radio y gravedad. `EntityRegistry.updateSpatialAndTiers` clasifica entidades en `high` (`≤65m`), `medium` (`≤135m`) y `low` (`>135m`). `evaluatePerception` filtra entidades y eventos dentro de alcance sensorial y acumula reconocimiento visual antes de confirmar amenaza; `stepNpcBrain` actualiza memoria limitada (`8` entradas, TTL `26s`), emociones continuas e intención con histéresis (`minHoldSeconds`). `PedestrianGraph` conecta aceras, pasos de cebra, 3 puentes y 9 puertas de tiendas con A* (`MinHeap`).
10. **Estructuras de datos relevantes:** `10` roles (`calm_civilian`, `nervous_civilian`, `curious_civilian`, `brave_civilian`, `aggressive_civilian`, `merchant`, `customer`, `driver`, `worker`, `police`); `17` estados emocionales/conductuales (`normal`, `calm`, `curious`, `confused`, `suspicious`, `nervous`, `alarmed`, `scared`, `panicking`, `aggressive`, `injured`, `disoriented`, `seeking_cover`, `fleeing`, `calling_help`, `recording`, `cooperating`).
11. **Invariantes:** `WorldEventBus` nunca entrega eventos fuera de radio; un muro en `SpatialBoxGrid` bloquea visión (`clearLine`) y atenúa sonido (`×0.42`); reconocimiento visual requiere persistencia temporal; los troncos estrechos (`≤0.25m`) no rompen el grafo macro de aceras pero sí activan evasión en `steerPedestrian`.
12. **Restricciones:** Los NPC físicos completos y sus modelos instanciados en escena pertenecen a Fase 2.
13. **Problemas conocidos:** Ninguno crítico abierto en Fase 1. En Fase 5 habrá que resolver el conflicto de `ArrowUp` en `input.ts` (`VB-015`).
14. **Consideraciones de rendimiento:** `EntityRegistry` reutiliza buckets en pool; `PedestrianGraph` usa A* con `MinHeap`; `SpatialBoxGrid` usa stamps `Uint32Array` sin asignaciones por rayo.
15. **Métodos de verificación:** `tests/events-and-entities.test.ts` (4 tests), `tests/perception-and-npc.test.ts` (2 tests), `tests/pedestrian-navigation.test.ts` (2 tests).
16. **Riesgos de modificación:** Cambiar `threatLevel` o umbrales de `stepNpcBrain` afecta todas las reacciones emergentes futuras (asaltos, grabación, testigos).
17. **Referencias relacionadas:** [PHYSICS_AND_COLLISIONS.md](PHYSICS_AND_COLLISIONS.md), [TRAFFIC_AND_NAVIGATION.md](TRAFFIC_AND_NAVIGATION.md).
18. **Última verificación:** 2026-11-20 (`typecheck`, `vitest` 35/35, `vite build`, Chromium smoke test).
