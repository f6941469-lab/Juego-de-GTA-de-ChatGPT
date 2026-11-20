---
document_id: CORE-CURRENT-STATE
status: active
last_updated: 2026-11-20
verified_against: "173aa01-dirty (Phase 7 working tree)"
verification_scope: "typecheck + vitest (53/53) + vite build + Chromium WebGL 2 live test"
---

# Estado Operativo Actual (`CURRENT_STATE.md`)

- **Rama actual:** `main` (sobre commit `173aa01` de Fase 6, con cambios locales de **Fase 7** listos para confirmar y publicar).
- **Estado general:** Completadas las **7 fases** del ecosistema urbano inteligente, dinámico, interactivo y destructible en Costa Palmera. En la **Fase 7 (Pulido, rendimiento y optimización final)** se implementó streaming físico espacial en Rapier (`VB-002`, reduciendo los colisionadores activos de `514` a `131`), presupuesto incremental de `1` sector por frame en `streaming.ts` (`VB-003`), eliminación de asignaciones en bucles calientes (`VB-009`), corrección de resolución adaptativa en `30 Hz` mediante `renderCpuMs` (`VB-011`), cierre `dispose()` en `renderer`/`atmosphere`/`input` con limpieza `pagehide` (`VB-008`) y cobertura E2E (`VB-014`).

## Estado de los sistemas (verificado en código y compilación)

| Categoría | Sistemas |
| :--- | :--- |
| **Operativos** | `SimulationEngine` (`engine.ts`), loop fijo `60 Hz`, `physics.step(dt)` + streaming físico `streamFocus` (`131/514` colisionadores activos en Rapier), `SpatialBoxGrid` (LOS + raycast balístico), `WorldEventBus`, policía avanzada GPU-instanciada (`police-visuals.ts` `VB-005`, evitación de tráfico `VB-004`, memoria descriptiva, perímetros, cerco en tienda y agentes a pie), teléfono móvil diegético (`createPhoneSystem`, `VB-015` resuelto), `createDestructibles` (escaparates/mobiliario físico destructibles + escombros/agua/humo), daños mecánicos/visuales en vehículos/tráfico, `EntityRegistry`, `PerceptionSystem`, armas/trazadores, multitud NPC (`72` máximo) + 9 tiendas interactivas, streaming visual con presupuesto `1 sector/frame`, Web Audio procedural, HUD/minimapa/teléfono y debug `F3`/`F4`/`F5`. |
| **Parciales / Con fricción** | Deuda menor P2/P3 abierta no bloqueante: `VB-006` (cota acera/sombras), `VB-007` (reservas Dijkstra viales), `VB-010` (mobiliario costero), `VB-012`/`VB-013`/`VB-014` (pulido menor UI/audio/DOM). |
| **No implementados** | Ninguna fase principal pendiente dentro del roadmap de 7 fases. |

## Estado de las verificaciones
- `npm run typecheck`: **Pasado** (`0` errores).
- `npm test`: **Pasado** (`19` archivos, `53/53` pruebas verdes; `tests/optimization-and-streaming.test.ts` verifica streaming físico Rapier `VB-002`, presupuesto `1 sector/frame` `VB-003`, escala `30 Hz` vs sobrecarga `VB-011` y ciclo E2E completo con `dispose()`).
- `npm run build`: **Pasado** (`vite build`, `65` módulos transformados en `dist/`).
- **Navegador (Chromium headless + ANGLE SwiftShader WebGL 2 sobre `vite preview`):** F3 registró **`131 colisionadores`** activos en Rapier (`18/68 sectores`, `194 llamadas`, `3.20 ms render CPU`, `1.00× píxeles`), F5 mostró `Entidades (22): alta=6 media=9 baja=7` y CPU paso fijo `phys=0.20ms · tráf=0.10ms`, con `0` excepciones JS y `0` errores de consola.

## Prioridades y bloqueos actuales
1. **Siguiente paso funcional:** Confirmar el commit de Fase 7 y autorizar `git push origin main` (`173aa01` + Fase 7) para publicar la versión completa en GitHub.
2. **Deuda técnica residual:** Solo ítems menores P2/P3 (`VB-006`, `VB-007`, `VB-010`, `VB-012`, `VB-013`).

## Próximos pasos recomendados
1. Autorizar `git push origin main` para subir las Fases 6 y 7 al repositorio remoto.



