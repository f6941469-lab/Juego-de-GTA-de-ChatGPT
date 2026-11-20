---
document_id: SYSTEM-RENDERING
status: active
last_updated: 2026-11-20
verified_against: "248f8b44b7aebf77fc38a0d5c0bde996e680cec5"
verification_scope: "static-analysis-only"
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
2. **Estado de implementación:** Implementado y operativo (con limitaciones en heurística adaptativa y altura de sombras).
3. **Responsabilidades:** Configurar `WebGLRenderer`, ajustar pixel ratio dinámico, actualizar ciclo sol/luna/niebla/cielo según hora decimal y dibujar sombras de proximidad instanciadas.
4. **Archivos fuente relevantes:** `src/renderer/renderer.ts`, `src/renderer/resolution.ts`, `src/renderer/lighting/atmosphere.ts`, `src/renderer/lighting/reflection.ts`, `src/renderer/postprocessing/contact-shadows.ts`, `src/shaders/sky.ts`.
5. **Clases y funciones principales:** `createRenderer`, `createFrameBudget`, `createAtmosphere`, `createSkyReflection`, `createContactShadows`, `skyVertexShader`, `skyFragmentShader`.
6. **Interfaces públicas:** `ContactShadowSource`, `createRenderer` (`setQuality`, `resize`, `render`, `getFrameTiming`), `createAtmosphere` (`update`), `createContactShadows` (`update`, `dispose`).
7. **Dependencias:** `three` (`WebGLRenderer`, `ShaderMaterial`, `InstancedMesh`, `DirectionalLight`, `HemisphereLight`, `FogExp2`), `src/config/game.ts`.
8. **Sistemas dependientes:** `src/main.ts`, `src/world/generation/coast.ts` (busca `DirectionalLight` en escena).
9. **Flujo de funcionamiento:** `setQuality` aplica `pixelRatio`/`maxPixels`/`shadowSize`/`reflections` (con `configuredScene` cacheado). En cada `render()`, `budget.sample(now, adaptive)` ajusta escala si EMA `> 24ms` (1.25s) o `< 17.5ms` (5.5s). `atmosphere.update(hour, focus, elapsed)` posiciona sol/luna y alinea la cámara ortográfica de sombras al texel (`texel snapping`) evitando *shadow swimming*. El domo del cielo usa `gl_Position = clip.xyww` + `renderOrder = 1000` para early-Z.
10. **Estructuras de datos relevantes:** `presets` (`low`/`medium`/`high`/`ultra`), `scales = [1, 0.86, 0.75, 0.64]`, `InstancedBufferAttribute` `aStrength` en `contact-shadows.ts`.
11. **Invariantes:** `outputColorSpace = SRGBColorSpace`; `ACESFilmicToneMapping` (`1.08`); el cielo se dibuja detrás de toda geometría opaca (`z = w`).
12. **Restricciones:** Requiere WebGL 2. Sin *occlusion culling*, sin bloom selectivo ni SSAO.
13. **Problemas conocidos:** `VB-006` (sombras de contacto a `y = 0.025` ocultas bajo aceras a `0.049`, y `nearby` sin ordenar en `main.ts`), `VB-008` (`createRenderer` y `createAtmosphere` sin `dispose()`), `VB-011` (`budget.sample` confunde `30 Hz` vsync con carga GPU), `VB-005` (patrullas no instanciadas).
14. **Consideraciones de rendimiento:** `shadowSize = 3072` en `ultra` multiplica el coste de fragmentos en el pase de sombra; el shader de cielo evalúa FBM de 4 octavas en píxeles de cielo no ocluidos.
15. **Métodos de verificación:** `tests/resolution.test.ts` (2 tests). WebGL/shaders requieren navegador real o headless SwiftShader.
16. **Riesgos de modificación:** Cambiar `scene.environment` o `toneMapping` altera el balance lumínico de todas las fachadas y agua.
17. **Referencias relacionadas:** [WORLD_AND_STREAMING.md](WORLD_AND_STREAMING.md), [KNOWN_ISSUES.md](../KNOWN_ISSUES.md).
18. **Última verificación:** 2026-11-20 (análisis estático sobre `248f8b4`).
