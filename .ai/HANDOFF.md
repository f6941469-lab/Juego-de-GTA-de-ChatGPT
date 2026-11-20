---
document_id: CORE-HANDOFF
status: active
last_updated: 2026-11-20
verified_against: "3a830a4-dirty (Phase 6)"
verification_scope: "typecheck + vitest (49/49) + vite build + Chromium WebGL 2 live test"
---

# Transferencia entre Sesiones (`HANDOFF.md`)

- **Última tarea trabajada:** **Fase 6 (Policía avanzada e investigación criminal)** completada tras publicar las Fases 4–5 en `3a830a4`.
- **Objetivo:** Dotar a la policía de instanciación GPU compartida (`VB-005`), evitación real de tráfico civil (`VB-004`), memoria descriptiva del sospechoso/vehículo sin omnisciencia, perímetros, cerco en tienda y agentes a pie desplegables.
- **Estado actual:** Fase 6 implementada, compilada y verificada (`typecheck`, `18` archivos / `49/49` tests, `vite build` `65` módulos y prueba viva en Chromium WebGL 2). Pendiente de autorización expresa para `commit`/`push` de Fase 6 y arranque de Fase 7.
- **Rama y commit base de referencia:** `main` @ `3a830a4` (sincronizado con `origin/main`).
- **Trabajo completado en Fase 6 (working tree sobre `3a830a4`):**
  - `src/ai/police/police-visuals.ts`: render instanciado (`4` `InstancedMesh` compartidos: carrocería, ruedas, faros/sirenas y oficiales a pie) + `dispose()` simétrico (`VB-005`, `VB-008`).
  - `src/ai/police/wanted.ts`: `SuspectDescription`, `ReportMetadata` (`kind`, `storeSiege`) y `matchesSuspect` (pérdida de coincidencia al cambiar de vehículo o ir a pie desarmado fuera de vista).
  - `src/ai/police/police.ts`: integración con `traffic.vehicles` (`VB-004`), sonda física de chasis (`0.94m`/`1.15m`), perímetros cardinales, frenado y despliegue de oficiales a pie (`stepOfficer`) con visión propia y `statusLabel` descriptivo para HUD.
  - `src/simulation/engine.ts` y `src/main.ts`: envío de `traffic.vehicles` y perfil real de sospechoso en `police.step`, metadatos de delitos/tiendas, `police.dispose()` y lectura de `police.statusLabel`.
  - `tests/police-investigation.test.ts`: `4` pruebas de instanciación GPU/`dispose()`, evitación de tráfico, memoria vehicular sin omnisciencia y cerco en tienda a pie.
- **Trabajo pendiente:**
  - **Fase 7 (Pulido, rendimiento y optimización final):** Streaming físico Rapier (`VB-002`), presupuesto por frame en `streaming.ts` (`VB-003`), reducción de asignaciones GC (`VB-009`), mejora en `resolution.ts` (`VB-011`) y cobertura E2E (`VB-014`).
- **Cambios en Git:** Cambios locales de Fase 6 sin confirmar sobre `3a830a4`.
- **Bloqueos:** Ninguno técnico.
- **Próxima acción recomendada:** Autorizar `git commit` y `git push` de Fase 6 y el inicio de la **Fase 7 (Pulido, rendimiento y optimización final)**.
- **Documentos clave para el siguiente agente:** `AGENTS.md` -> `.ai/INDEX.md` -> `.ai/CURRENT_STATE.md` -> `.ai/ROADMAP.md` -> `.ai/KNOWN_ISSUES.md`.


