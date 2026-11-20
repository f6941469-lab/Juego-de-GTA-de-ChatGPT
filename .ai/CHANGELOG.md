---
document_id: CORE-CHANGELOG
status: active
last_updated: 2026-11-20
verified_against: "248f8b44b7aebf77fc38a0d5c0bde996e680cec5"
verification_scope: "static-analysis-only"
---

# Historial Técnico Resumido (`CHANGELOG.md`)

> Para notas orientadas a jugador/entrega, ver [CHANGELOG.md](../CHANGELOG.md).

## 2026-11-20 · `DOC-MEMORY-INIT` (sobre `248f8b4`)
- **Resumen:** Auditoría técnica integral (`AUDIT-0001`) e implantación del Sistema de Memoria Técnica Persistente en `AGENTS.md` y `.ai/`.
- **Motivación:** Preservar arquitectura, contratos, hallazgos verificados (`VB-001`..`VB-014`), decisiones y protocolo de trabajo entre sesiones de IA sin pérdida de contexto.
- **Sistemas afectados:** Exclusivamente documentación (`AGENTS.md`, `.ai/**`). Cero modificaciones en `src/`, `tests/` o configuración.
- **Verificaciones:** Análisis estático completo de los 71 archivos rastreados y pruebas de recuperación documental en 3 escenarios. Ejecución de build/tests pendiente de `npm ci` autorizado.
- **Riesgos pendientes:** Requiere sincronizar verificación de runtime tras autorizar `TASK-0001`.

## 2026-11-18 · `0.2.0` · Commit `248f8b44b7aebf77fc38a0d5c0bde996e680cec5`
- **Resumen:** Integración jugable de conducción (`Rayo GT`), grafo vial y tráfico con semáforos, policía con sistema de búsqueda de 5 estrellas, audio procedural Web Audio, expansión del distrito por sectores (`64 m`), sombras de contacto y resolución adaptativa.
- **Archivos relevantes:** 49 archivos cambiados (`+3215 / -234`), añadiendo `src/ai/**`, `src/audio/**`, `src/navigation/**`, `src/vehicles/**`, `src/world/streaming.ts`, `src/renderer/resolution.ts`, `src/renderer/postprocessing/contact-shadows.ts`, `.github/workflows/ci.yml` y 6 suites de tests.
- **Verificaciones reportadas en entrega (`PROJECT_STATE.md`):** Build y 25 pruebas pasaron en entrega original; pendiente re-verificar en checkout actual sin `node_modules`.

## 2026-11-18 · `0.1.0` · Commit `2ee553f08532ebd18ea48597eb7c1db879bcf2ad`
- **Resumen:** Base modular Vite + TypeScript + Three.js + Rapier + Vitest; primer distrito costero Costa Palmera, personaje cúbico en tercera persona, ciclo solar/cielo/agua, HUD/minimapa, persistencia IndexedDB de calidad gráfica y 3 suites iniciales (8 pruebas).
