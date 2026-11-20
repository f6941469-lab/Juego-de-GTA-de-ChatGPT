---
document_id: CORE-CURRENT-STATE
status: active
last_updated: 2026-11-20
verified_against: "45aefd3-dirty (Phase 3 working tree)"
verification_scope: "typecheck + vitest (40/40) + vite build + Chromium WebGL 2 live test"
---

# Estado Operativo Actual (`CURRENT_STATE.md`)

- **Rama actual:** `main` (sobre commit `45aefd3` de Fase 2, con cambios de Fase 3 listos para confirmar).
- **Estado general:** Completada la **Fase 3 (Armas, combate y delitos complejos)** del ecosistema urbano inteligente. El juego incorpora armas equipables (`Unarmed`, `Pistola 9mm`, `Carabina`), apuntado con pose en tercera persona y arma visible en el avatar, trazadores instanciados y balística detenida por muros (`SpatialBoxGrid`), amenazas perceptibles en `WorldEventBus`, testigos reales con llamadas al 911 interrumpibles por intimidación/combate (`< 2.1 s`), asaltos progresivos de tiendas con dependientes cooperativos y botín (`$`), combate cuerpo a cuerpo NPC y fuego recíproco policial respetando cobertura.

## Estado de los sistemas (verificado en código y compilación)

| Categoría | Sistemas |
| :--- | :--- |
| **Operativos** | `SimulationEngine` (`engine.ts`), loop fijo `60 Hz`, `physics.step(dt)` único, `SpatialBoxGrid` (LOS + raycast balístico), `WorldEventBus` (`weapon_drawn`, `weapon_aimed`, `shot_fired`, `npc_injured`, `witness_detected`, `crime_reported`, `robbery_started`, `robbery_finished`), `EntityRegistry`, `PerceptionSystem` (`minY = 1.15 m`), **sistema de armas y trazadores (`weapons.ts`) + pose/malla armada (`player.ts`, `avatar.ts`) + cues audio (`shot`, `reload`, `empty`, `cash`)**, perfiles + `NpcBrain` + **multitud NPC (`7` `InstancedMesh`, hasta `72` NPCs) con testigos 911 interrumpibles y combate cuerpo a cuerpo**, **9 tiendas enterables con asalto progresivo (`beginHeist`/`stepHeist`) y botín `$`**, **`VehicleManager` (hasta `4` vehículos físicos: `Rayo GT` + robados)**, **policía 5 estrellas con fuego recíproco desde nivel 2 respetando cobertura**, `PedestrianGraph`, tráfico conectado (`146` nodos viales), mapa multi-isla de 6 distritos, WebGL 2, HUD (`#cash-display`, `#weapon-display`, `#aim-reticle`, táctil)/minimapa, debug `F3`/`F4`/`F5`. |
| **Parciales / Con fricción** | `VB-002` (streaming físico Rapier pendiente), `VB-004` (evitación policial frente a tráfico), `VB-005` (instanciación de patrullas), `VB-015` (`ArrowUp` atado a `'forward'` antes del teléfono en Fase 5). |
| **No implementados** | Destrucción física de cristales/mobiliario/vehículos y accidentes con rescate (Fase 4), teléfono móvil integrado con cámara/grabación/viralización (Fase 5), policía avanzada con perímetros/descripción (Fase 6), optimización final Rapier/GC/streaming (Fase 7). |

## Estado de las verificaciones
- `npm run typecheck`: **Pasado** (`0` errores).
- `npm test`: **Pasado** (`15` archivos, `40/40` pruebas verdes; `tests/combat-and-heists.test.ts` verifica balística detenida por muros, testigos no omniscientes e interrumpibles, asalto progresivo de tienda e intercambio armado policial tras cobertura).
- `npm run build`: **Pasado** (`vite build`, `62` módulos transformados en `dist/`).
- **Navegador (Chromium headless + ANGLE SwiftShader WebGL 2 sobre `vite preview`):** Canvas WebGL (`780×437`), `#cash-display` (`$0`), equipar arma `2` actualizó `#weapon-display` a `Pistola 9mm · 12/48`, `F3` mostró `#debug-panel`, con `0` excepciones JS y `0` errores de consola.

## Prioridades y bloqueos actuales
1. **Siguiente paso funcional:** Publicar Fase 3 (`commit` y `push`) y esperar autorización expresa para iniciar **Fase 4: Entorno dinámico y destructible** (vidrieras fracturables, destrucción física de mobiliario urbano y daños vehiculares).
2. **Deuda técnica P1/P2 abierta relevante:** `VB-002` (streaming físico Rapier), `VB-003` (presupuesto por frame en `streaming.ts`), `VB-004`/`VB-005` (patrullas), `VB-015` (conflicto `ArrowUp` para Fase 5).

## Próximos pasos recomendados
1. Confirmar e impulsar Fase 3 en `main`.
2. Iniciar **Fase 4 (Entorno dinámico y destructible)** tras autorización del usuario.


