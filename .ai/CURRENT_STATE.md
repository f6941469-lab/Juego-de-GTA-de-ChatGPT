---
document_id: CORE-CURRENT-STATE
status: active
last_updated: 2026-11-20
verified_against: "ef1f5d115168a40a89b767658274cc28ac17b8de-dirty (working tree on ef1f5d115168a40a89b767658274cc28ac17b8de)"
verification_scope: "typecheck + vitest (35/35) + vite build + Chromium WebGL 2 SwiftShader F5 smoke test"
---

# Estado Operativo Actual (`CURRENT_STATE.md`)

- **Rama actual:** `main` (sobre commit `ef1f5d115168a40a89b767658274cc28ac17b8de`, con cambios locales de la Fase 1 sin confirmar).
- **Estado general:** Completada la **Fase 1 (Fundamentos de simulación)** del ecosistema urbano inteligente sobre el mapa conectado de 6 distritos y 9 tiendas. El motor cuenta ahora con paso físico único (`physics.step`), índice espacial `SpatialBoxGrid`, `WorldEventBus`, `EntityRegistry` por tiers LOD, `PerceptionSystem`, perfiles + `NpcBrain` (Utilidad/FSM), `PedestrianGraph` (A* MinHeap + evitación local) e inspector `F5`.

## Estado de los sistemas (verificado en código y compilación)

| Categoría | Sistemas |
| :--- | :--- |
| **Operativos** | Loop fijo `60 Hz`, `physics.step(dt)` único (`VB-001` resuelto), `SpatialBoxGrid` (`VB-002` LOS `O(celdas)`), `WorldEventBus` (`events.ts`), `EntityRegistry` por cubetas `32 m` (`entities.ts`), `PerceptionSystem` (`perception.ts`), perfiles + `NpcBrain` (`profiles.ts`, `npc-brain.ts`), `PedestrianGraph` conectado por aceras/cruces/puentes/tiendas (`pedestrian-graph.ts`), jugador (`grounded` expuesto), `Rayo GT`, tráfico conectado (`146` nodos viales), policía + búsqueda 5 estrellas usando `SpatialBoxGrid`, mapa multi-isla de 6 distritos y 9 tiendas, renderizado WebGL 2, audio procedural (salto ligado a `player.grounded`), HUD + minimapa, IndexedDB, debug `F3`/`F4` (con grafo peatonal, conos FOV y `dispose()`) + `F5` (`inspector.ts`). |
| **Parciales / Con fricción** | Sistema de asalto (interacción básica + evento `robbery_started`; sin rehenes/interiores todavía), `VB-002` (streaming físico Rapier pendiente aunque LOS es `O(celdas)`), `VB-004` (evitación policial frente a tráfico), `VB-005` (instanciación de patrullas), `VB-015` (`ArrowUp` atado a `'forward'` antes del futuro teléfono en Fase 5). |
| **Base lista sin población visible aún** | Los motores de `PerceptionSystem`, `NpcBrain` y `PedestrianGraph` están implementados, integrados y probados unitariamente, listos para poblar peatones instanciados, conductores reales y dependientes en **Fase 2**. |
| **No implementados** | Multitud de NPCs instanciados y conductores en tráfico (Fase 2), armas/combate/testigos 911/asalto completo (Fase 3), destrucción de entorno y cristales (Fase 4), teléfono móvil integrado (Fase 5), policía sin omniscencia por descripción/perímetros (Fase 6). |

## Estado de las verificaciones
- `npm run typecheck`: **Pasado** (`0` errores).
- `npm test`: **Pasado** (`13` archivos, `35/35` pruebas verdes; +8 pruebas nuevas de `WorldEventBus`, `EntityRegistry`, `SpatialBoxGrid`, `physics.step`, `PerceptionSystem`, `NpcBrain`, `PedestrianGraph` y puente/tiendas).
- `npm run build`: **Pasado** (`vite build`, `54` módulos transformados en `dist/`).
- **Navegador (Chromium headless + ANGLE SwiftShader WebGL 2 sobre `vite preview`):** Pulsación de `play-button` y tecla `F5` mostraron `#debug-inspector` (`hidden: false`, `Inspeccionando simulación…`) con `0` errores JS/consola.

## Prioridades y bloqueos actuales
1. **Siguiente paso funcional:** Autorizar revisión/commit de la Fase 1 y aprobar el inicio de la **Fase 2: Vida urbana (NPCs instanciados, conductores en tráfico e interiores/dependientes de tiendas)**.
2. **Deuda técnica P1/P2 abierta relevante:** `VB-002` (streaming físico Rapier), `VB-003` (presupuesto por frame en `streaming.ts`), `VB-004`/`VB-005` (patrullas), `VB-015` (conflicto `ArrowUp` para Fase 5).

## Próximos pasos recomendados
1. Revisar `git diff` y autorizar commit/push de la Fase 1 si procede.
2. Iniciar Fase 2 instanciando peatones sobre `PedestrianGraph` + `NpcBrain` + `PerceptionSystem`, dotando de conductores reales a `traffic.ts` y abriendo interiores/dependientes de tiendas.

