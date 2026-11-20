---
document_id: SYSTEM-RENDERING
status: active
last_updated: 2026-11-20
verified_against: "173aa01-dirty (Phase 7 working tree)"
verification_scope: "typecheck + vitest (53/53) + vite build + Chromium WebGL 2 (Phase 7)"
related_systems: [WORLD_AND_STREAMING, PLAYER_AND_CAMERA, UI_AND_DEBUG]
related_files:
  - src/renderer/renderer.ts
  - src/renderer/resolution.ts
  - src/renderer/lighting/atmosphere.ts
  - src/renderer/lighting/reflection.ts
  - src/renderer/postprocessing/contact-shadows.ts
  - src/shaders/sky.ts
---

# Sistema: Motor de Renderizado, Atmósfera y Shaders (`RENDERING.md`)

1. **Propósito:** Gestionar el renderizador WebGL 2, perfiles gráficos, resolución adaptativa, iluminación solar/lunar, cielo procedural, reflejos IBL y sombras de contacto.
2. **Estado de implementación:** Fase 7 completada: heurística adaptativa basada en `renderCpuMs` (`VB-011` resuelto), `dispose()` completo en `createRenderer` y `createAtmosphere` (`VB-008`) y patrullas GPU-instanciadas (`VB-005` resuelto).
3. **Responsabilidades:** Configurar `WebGLRenderer`, ajustar pixel ratio dinámico según carga real de CPU/GPU sin penalizar pantallas a 30 Hz, actualizar ciclo sol/luna/niebla/cielo según hora decimal, dibujar sombras de proximidad instanciadas y liberar recursos WebGL en desmontaje.
4. **Archivos fuente relevantes:** `src/renderer/renderer.ts`, `src/renderer/resolution.ts`, `src/renderer/lighting/atmosphere.ts`, `src/renderer/lighting/reflection.ts`, `src/renderer/postprocessing/contact-shadows.ts`, `src/shaders/sky.ts`.
5. **Clases y funciones principales:** `createRenderer`, `createFrameBudget`, `createAtmosphere`, `createSkyReflection`, `createContactShadows`, `skyVertexShader`, `skyFragmentShader`.
6. **Interfaces públicas:** `ContactShadowSource`, `createRenderer` (`setQuality`, `resize`, `render`, `getFrameTiming`, `dispose`), `createAtmosphere` (`update`, `dispose`), `createContactShadows` (`update`, `dispose`).
7. **Dependencias:** `three` (`WebGLRenderer`, `ShaderMaterial`, `InstancedMesh`, `DirectionalLight`, `HemisphereLight`, `FogExp2`), `src/config/game.ts`.
8. **Sistemas dependientes:** `src/main.ts`, `src/world/generation/coast.ts` (busca `DirectionalLight` en escena).
9. **Flujo de funcionamiento:** `setQuality` aplica `pixelRatio`/`maxPixels`/`shadowSize`/`reflections`. En cada `render()`, mide `renderCpuMs` y lo pasa a `budget.sample(now, adaptive, renderCpuMs)` (respetando monitores de 30 Hz con carga `< 6.5 ms` y degradando escala solo ante sobrecarga real `> 11 ms` o >24 ms con carga CPU elevada). `atmosphere.update(hour, focus, elapsed)` aplica *texel snapping* de sombras. `dispose()` libera `reflection`, `renderer`, domo/geometría y mapa de sombra.
10. **Estructuras de datos relevantes:** `presets` (`low`/`medium`/`high`/`ultra`), `scales = [1, 0.86, 0.75, 0.64]`, `cpuAverage` en `resolution.ts`.
11. **Invariantes:** `outputColorSpace = SRGBColorSpace`; `ACESFilmicToneMapping` (`1.08`); el cielo se dibuja detrás de toda geometría opaca (`z = w`).
12. **Restricciones:** Requiere WebGL 2. Sin *occlusion culling*, sin bloom selectivo ni SSAO.
13. **Problemas conocidos:** `VB-005`, `VB-011` resueltos; persiste únicamente el ajuste de cota visual menor `VB-006` (aceras vs sombras de contacto) y `dispose` de geometrías estáticas top-level en generación (`VB-008`).
14. **Consideraciones de rendimiento:** `shadowSize = 3072` en `ultra` multiplica el coste de fragmentos; el cielo FBM aprovecha early-Z tras geometría opaca.
15. **Métodos de verificación:** `tests/resolution.test.ts` (2), `tests/optimization-and-streaming.test.ts` (carga 30 Hz vs alta + `dispose` atmósfera) y Chromium (`194 llamadas · 3.20 ms render CPU · 1.00× píxeles`).
16. **Riesgos de modificación:** Cambiar `scene.environment` o `toneMapping` altera el balance lumínico de todas las fachadas y agua.
17. **Referencias relacionadas:** [WORLD_AND_STREAMING.md](WORLD_AND_STREAMING.md), [KNOWN_ISSUES.md](../KNOWN_ISSUES.md).
18. **Última verificación:** 2026-11-20 (`typecheck`, Vitest `53/53`, build y Chromium WebGL 2 tras Fase 7).

