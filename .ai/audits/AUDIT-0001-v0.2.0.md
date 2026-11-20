---
document_id: AUDIT-0001
status: archived
last_updated: 2026-11-20
verified_against: "248f8b44b7aebf77fc38a0d5c0bde996e680cec5"
verification_scope: "static-analysis-only (71 tracked files, 5987 lines; node_modules absent)"
---


> ARCHIVO HISTÓRICO DEL SISTEMA ANTERIOR (hasta `d565cdc`). Desde 0.3.0 estos contratos no describen el código activo. Consulta [.ai/CURRENT_STATE.md](../CURRENT_STATE.md) y `.ai/SIMULATION.md` para la versión Mercado Palma.

# Auditoría Técnica Integral — Viceblock `0.2.0` (`AUDIT-0001`)

## 1. Alcance y limitaciones de medición
- **Cobertura:** Lectura directa al 100 % de `index.html`, configuración, `src/**`, `tests/**` y documentación raíz; inspección de cabeceras en `public/licencias/*` y metadatos de `package-lock.json`.
- **Limitación:** `node_modules/` no está presente y la auditoría se realizó en modo solo lectura; por tanto no se ejecutaron `typecheck`, `test`, `build` ni mediciones reales de FPS/RAM/VRAM.

## 2. Evaluación de madurez por área (0–10)

| Área | Nota | Síntesis de evidencia |
| :--- | :---: | :--- |
| Core Loop y Tiempo | 8 / 10 | `FixedLoop` determinista con clamp `0.1s` e interpolación `alpha` probada |
| Renderizado y Shaders | 7 / 10 | `InstancedMesh`, cielo/agua/sombras propias, *texel snapping*; faltan `dispose()`, patrullas instanciadas y mejora de `resolution.ts` |
| Física y Vehículos | 5 / 10 | Conducción y `exitClearance` sólidos; penaliza `world.step()` en actores (`VB-001`) y aceras sin collider (`VB-006`) |
| Mundo Abierto y Streaming | 5 / 10 | Determinismo y streaming visual `64m` funcionales; mapa acotado, física estática permanente (`VB-002`) y rebuild síncrono (`VB-003`) |
| IA (Tráfico y Policía) | 5.5 / 10 | Semáforos y búsqueda 5 estrellas operativos; penaliza cruce bloqueado entero (`VB-007`), `clearLine O(N)` y patrullas ciegas al tráfico (`VB-004`) |
| Audio Procedural | 7.5 / 10 | Web Audio completo con 5 marchas, ambiente y Doppler; `rain` latente, 0 tests, ajuste de salto/pasos (`VB-013`) |
| UI, Entrada y Persistencia | 6.5 / 10 | HUD limpio y táctil + IndexedDB robusto; minimapa estático sin zoom/entidades y 0 tests |
| Calidad de Código | 6.5 / 10 | TypeScript estricto y legible; `main.ts` acumula responsabilidades y faltan `dispose()` |
| Pruebas y DevOps | 5 / 10 | CI GitHub Actions + 25 tests headless; sin tests DOM/Audio/E2E y aviso dev `picomatch@4.0.7` |

## 3. Trazabilidad de hallazgos registrados
Los 14 hallazgos verificados (`VB-001` a `VB-014`) residen en [KNOWN_ISSUES.md](../KNOWN_ISSUES.md) y sus tareas derivadas en [BACKLOG.md](../tasks/BACKLOG.md).

## 4. Metodología recomendada de benchmark (pendiente de ejecución)
1. Instalar con `npm ci` y compilar producción (`npm run build && npm run preview`).
2. Medir con semilla `240817` en hardware real (iGPU + dGPU + móvil) en los 4 perfiles (`low`–`ultra`), desactivando temporalmente `resolution.ts` para la línea base nativa.
3. Escenarios: (a) estático en spawn, (b) travesía norte-sur cruzando 5 sectores, (c) persecución a 5 estrellas con tráfico máximo.
4. Registrar percentiles `p50/p95/p99` de frame time, `renderer.info.render` (`calls`, `triangles`), JS heap y trazas CPU de `streaming.update()`, `world.step()` y `renderer.render()`.
