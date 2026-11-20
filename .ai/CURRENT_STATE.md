---
document_id: CORE-CURRENT-STATE
status: active
last_updated: 2026-11-20
verified_against: "e2288b5-dirty (working tree on e2288b5)"
verification_scope: "typecheck + vitest (37/37) + vite build + Chromium WebGL 2 SwiftShader F3/F5 live test"
---

# Estado Operativo Actual (`CURRENT_STATE.md`)

- **Rama actual:** `main` (sobre commit `e2288b5` de Fase 1, con cambios locales de Fase 2 sin confirmar).
- **Estado general:** Completada la **Fase 2 (Vida urbana)** del ecosistema urbano inteligente. La ciudad cuenta ahora con **peatones instanciados animados** (`npc-visuals.ts`, `npc-population.ts`) navegando por horario y distrito sobre `PedestrianGraph`, **conductores reales visibles en el tráfico** con **robo de vehículos y coexistencia multi-vehículo** (`vehicle-manager.ts`), **9 tiendas con interiores físicos transitables y dependientes tras el mostrador** (`buildings.ts`, `stores.ts`) y orquestación desacoplada en **`SimulationEngine`** (`src/simulation/engine.ts`).

## Estado de los sistemas (verificado en código y compilación)

| Categoría | Sistemas |
| :--- | :--- |
| **Operativos** | `SimulationEngine` (`engine.ts`), loop fijo `60 Hz`, `physics.step(dt)` único, `SpatialBoxGrid`, `WorldEventBus`, `EntityRegistry`, `PerceptionSystem` (`minY = 1.15 m`), perfiles + `NpcBrain` + **multitud NPC instanciada (`7` `InstancedMesh`, hasta `72` NPCs)**, **dependientes (`merchant`) en 9 tiendas enterables (`buildingColliders`, mostrador, luz interior)**, **`VehicleManager` (hasta `4` vehículos físicos: `Rayo GT` + coches robados al tráfico)**, **conductores visibles y secuestro (`hijackNearest`) con ex-conductor NPC en calle**, `PedestrianGraph` con cedas en pasos de cebra, tráfico conectado (`146` nodos viales), policía 5 estrellas + reportes reales de testigos al 911, mapa multi-isla de 6 distritos, WebGL 2, audio procedural, HUD/minimapa, debug `F3`/`F4` (conos FOV)/`F5`. |
| **Parciales / Con fricción** | Sistema de asalto (ya ocurre dentro de la tienda frente al mostrador y alerta al dependiente; rehenes/armas/intimidación detallada llegan en Fase 3), `VB-002` (streaming físico Rapier pendiente), `VB-004` (evitación policial frente a tráfico), `VB-005` (instanciación de patrullas), `VB-015` (`ArrowUp` atado a `'forward'` antes del teléfono en Fase 5). |
| **No implementados** | Armas, apuntado y tiroteos / asalto con rehenes (Fase 3), destrucción física de entorno y cristales (Fase 4), teléfono móvil integrado con grabación/viralización (Fase 5), policía avanzada con perímetros y memoria descriptiva (Fase 6), optimización final Rapier/GC/streaming (Fase 7). |

## Estado de las verificaciones
- `npm run typecheck`: **Pasado** (`0` errores).
- `npm test`: **Pasado** (`14` archivos, `37/37` pruebas verdes; incluye pruebas físicas en Rapier entrando por la puerta hasta el mostrador de las 9 tiendas, conductores en tráfico, robo con multi-vehículo `vehicles.all === 2`, ex-conductor NPC y `dispose()` limpio de escena).
- `npm run build`: **Pasado** (`vite build`, `61` módulos transformados en `dist/`).
- **Navegador (Chromium headless + ANGLE SwiftShader WebGL 2 sobre `vite preview`):** Inicio en `Costa Palmera`, `F3` mostró `17 entidades · 514 colisionadores · 3 tráfico · 11 NPC · 1 patrullas`, `F5` activó `#debug-panel` con `0` excepciones JS.

## Prioridades y bloqueos actuales
1. **Siguiente paso funcional:** Revisar/confirmar Fase 2 y aprobar el inicio de la **Fase 3: Armas, combate y delitos complejos** (armas, amenazas perceptibles, testigos reales/911 sin omniscencia y asaltos completos en tiendas).
2. **Deuda técnica P1/P2 abierta relevante:** `VB-002` (streaming físico Rapier), `VB-003` (presupuesto por frame en `streaming.ts`), `VB-004`/`VB-005` (patrullas), `VB-015` (conflicto `ArrowUp` para Fase 5).

## Próximos pasos recomendados
1. Autorizar `git commit` (y `push` si procede) de la Fase 2.
2. Iniciar **Fase 3 (Armas, combate y delitos complejos)**.


