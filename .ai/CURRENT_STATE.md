---
document_id: CORE-CURRENT-STATE
status: active
last_updated: 2026-11-20
verified_against: "3a830a4-dirty (Phase 6 working tree)"
verification_scope: "typecheck + vitest (49/49) + vite build + Chromium WebGL 2 live test"
---

# Estado Operativo Actual (`CURRENT_STATE.md`)

- **Rama actual:** `main` (sobre commit `3a830a4` con Fases 4–5 publicadas, y cambios locales de **Fase 6** listos para revisar/confirmar).
- **Estado general:** Completada la **Fase 6 (Policía avanzada e investigación criminal)**. Se resolvieron `VB-005` (`createPoliceVisuals` GPU-instanciado con `4` `InstancedMesh` compartidos y `dispose()`) y `VB-004` (evitación real de `traffic.vehicles` + sonda física del chasis), se añadió memoria descriptiva del sospechoso/vehículo en `wanted.ts` (sigilo al cambiar de vehículo fuera de línea de visión), perímetros tácticos, cerco en tienda (`storeSiege`) y oficiales a pie desplegables con cono visual propio.

## Estado de los sistemas (verificado en código y compilación)

| Categoría | Sistemas |
| :--- | :--- |
| **Operativos** | `SimulationEngine` (`engine.ts`), loop fijo `60 Hz`, `physics.step(dt)` único, `SpatialBoxGrid` (LOS + raycast balístico), `WorldEventBus`, **policía avanzada GPU-instanciada (`police-visuals.ts` `VB-005`, evitación de tráfico `VB-004`, memoria descriptiva `SuspectDescription`, perímetros, cerco en tienda y agentes a pie con `dispose()` completo)**, teléfono móvil diegético (`createPhoneSystem`, `VB-015` resuelto), `createDestructibles` (`18` escaparates `store_glass` + `hydrant`/`bollard`/`crate`/`bench` con colisionadores Rapier removibles + escombros/agua/humo), daños mecánicos/visuales en `vehicle.ts` y `traffic.ts`, `EntityRegistry`, `PerceptionSystem`, sistema de armas (`weapons.ts`), multitud NPC (`7` `InstancedMesh`, hasta `72` NPCs) + 9 tiendas interactivas, Web Audio procedural, HUD/minimapa/teléfono `#phone-device` y debug `F3`/`F4`/`F5`. |
| **Parciales / Con fricción** | `VB-002` (streaming físico Rapier pendiente), `VB-003` (presupuesto por frame en `streaming.ts`), `VB-008` (`dispose()` restante en `renderer`/`atmosphere`/`input`). |
| **No implementados** | Optimización final Rapier/GC/streaming/E2E (Fase 7). |

## Estado de las verificaciones
- `npm run typecheck`: **Pasado** (`0` errores).
- `npm test`: **Pasado** (`18` archivos, `49/49` pruebas verdes; `tests/police-investigation.test.ts` verifica `4` `InstancedMesh` compartidos + `dispose()` (`VB-005`), frenado frente a tráfico civil (`VB-004`), memoria descriptiva al cambiar de coche fuera de vista y cerco en tienda con agentes a pie).
- `npm run build`: **Pasado** (`vite build`, `65` módulos transformados en `dist/`).
- **Navegador (Chromium headless + ANGLE SwiftShader WebGL 2 sobre `vite preview`):** Con `Shift+Digit3` (`3` estrellas) se activaron `3 patrullas` (`Investigación` en `#wanted-status` y F3), `194 llamadas` totales en escena, `0` excepciones JS y `0` errores de consola.

## Prioridades y bloqueos actuales
1. **Siguiente paso funcional:** Revisar/confirmar la **Fase 6**, autorizar `git commit`/`git push` y decidir el arranque de la **Fase 7: Pulido, rendimiento y optimización final**.
2. **Deuda técnica P1/P2 abierta relevante:** `VB-002` (streaming físico Rapier), `VB-003` (presupuesto de reconstrucción por frame en `streaming.ts`), `VB-009` (GC por tick), `VB-011` (`resolution.ts`).

## Próximos pasos recomendados
1. Autorizar `git commit` y `git push` de la Fase 6.
2. Iniciar **Fase 7 (Pulido, rendimiento y optimización final)** tras autorización expresa.


