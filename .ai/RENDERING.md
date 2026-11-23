# Renderizado activo de Mercado Palma 0.5.0

## Backend y materiales

`createRenderer` es asíncrono. Utiliza la inicialización de `WebGPURenderer`, que solicita un adaptador y un dispositivo con las funciones que soporte. Ante ausencia del API, rechazo o fallo al crear el dispositivo, inicializa su backend WebGL 2. Se usan las dependencias ya fijadas del proyecto.

Cielo y agua están escritos en TSL en `src/shaders/`. Three genera WGSL para WebGPU y GLSL para WebGL 2 a partir de esas expresiones. Los demás materiales estándar y las instancias del distrito conservan sus datos originales. La compilación de las variantes iniciales termina antes de habilitar la entrada al juego.

Se mantiene una sola escena, simulación y entrega HTML. F3 indica el backend real mediante `canvas.dataset.renderer` y presenta las medidas de CPU separadas de los FPS. Perder el dispositivo durante la sesión detiene el bucle y presenta la recuperación mediante recarga.

## Presupuesto gráfico

| Perfil | DPR máximo | Píxeles internos máximos | Mapa de sombras |
| --- | --- | --- | --- |
| Bajo | 0,75 | 800.000 | Desactivado |
| Medio | 1 | 1.200.000 | 1024² |
| Alto | 1,5 | 1.800.000 | 2048² |
| Ultra | 2 | 2.800.000 | 2048² |

La resolución se limita también al DPR del dispositivo. El límite se aplica al redimensionar y cambiar de perfil. Se conserva la instanciación de los elementos repetidos del distrito. El cambio de backend permite aprovechar WebGPU en dispositivos compatibles. El rendimiento y la temperatura requieren mediciones en hardware físico.

## Presupuesto de simulación

- Session conserva un paso fijo compartido para Rapier. FixedLoop limita la recuperación a 0,1 segundos por cuadro.
- A* comparte su espacio de trabajo y cola de prioridad. Los actores solicitan hasta dos búsquedas por tick, cada una con 8192 celdas visitadas como máximo. Las peticiones que exceden la cuota se reintentan sin descartar la ruta vigente.
- Las decisiones civiles se evalúan cada 0,1 segundos cerca, 0,25 a distancia intermedia y 0,6 lejos. Las reacciones activas usan 0,05 segundos. Un cursor rotativo limita a cuatro decisiones civiles por tick. Los actores mantienen movimiento físico e interpolación en el paso habitual.
- `WorldState` admite `256` entidades y `60` muestras históricas a cuatro muestras por segundo. `Journal` conserva cuotas de eventos, testimonios y `WitnessClip` POV (`recorder.ts` muestrea cada `0,18 s`). `Feedback` conserva `36` partículas y Web Audio sus voces acotadas.

El historial y los fotogramas de testigos sostienen el visor 3D aislado (`replayGroup`). La persistencia en disco (guardar/cargar JSON) queda en Fase 9.

## Optimización gráfica y ampliación Fases 3–8

- **Lotes globales `core` y sectores `detail` (`geometry.ts`, `buildings.ts`):** `DistrictGeometry` unifica la geometría estructural (`core`) en un solo `InstancedMesh` por acabado/material y agrupa el detalle fino y follaje (`detail`) en sectores de `64 m` (visibles hasta `84 m` / `96 m` con histéresis y umbral de `2 m`), simplificando micro-parteluces de pisos altos (`story >= 2`) y desactivando sombras en follaje/detalle.
- **Avatares y vehículos en `1` `InstancedMesh` (`avatar.ts`, `actor.ts`, `traffic.ts`, `police.ts`):** Cada avatar consolida sus 16 articulaciones y accesorios en `1` único `InstancedMesh` con `sharedAvatarMaterial` opaco compartido (eliminando recompilaciones de shader a mitad de partida y limitando sombras a `< 26 m`), y cada vehículo civil, autobús, metro o patrulla usa `1` único `InstancedMesh` con material compartido.
- **Luz interior agrupada y partículas (`feedback.ts`, `game.ts`):** Las `9` tiendas comparten un único `PointLight` dinámico (`0xffd8a2`), las `48` partículas se agrupan en un `particleGroup` oculto cuando no hay efectos activos y la calidad inicial por defecto pasa a `medium` (`1024²` sombras, DPR `1`).
- **Resultado en Chrome 158 SwiftShader (`dist/` `960×640`, perfil Bajo `720×480`):** `F3` registra **`77 llamadas · 207.945 triángulos · 9.50 ms render (CPU) · 15.90 ms simulación (CPU) · 26 personajes · 308 colisionadores · 75 entidades · 0 rutas diferidas`** (frente a `328` llamadas y `338.093` triángulos previos). No mide FPS en GPU física.

## Comprobación reproducible

`tests/browser-smoke.mjs` registra el backend, errores de JavaScript y consola, versión, compras, armas, teléfono, audio y controles táctiles. `VICEBLOCK_FORCE_WEBGL=1` simula ausencia de WebGPU para comprobar compatibilidad. `VICEBLOCK_WEBGPU=1` habilita el adaptador de software en Chromium para probar WGSL y exige que el backend seleccionado sea WebGPU. Estos parámetros pertenecen a la prueba automatizada.

El modo portable mantiene la red desactivada y comprueba ausencia de solicitudes HTTP(S). El navegador administrado bloquea file://. La prueba inline se registra con ese alcance y queda pendiente validar la apertura local en un navegador que la permita.

## Límite de la prueba WebGPU del entorno

El intento con Chromium 156 y adaptador Dawn/SwiftShader expuso `Instance dropped in popErrorScope` y errores al crear buffers durante la escena. Se reprodujo con una escena mínima y también con un triángulo WGSL usando directamente el API WebGPU, que terminó con `A valid external Instance reference no longer exists`. La creación inicial de un buffer aislado sí funcionó. Estos resultados dejan pendiente la aceptación del renderizado WebGPU en un dispositivo utilizable y las mediciones en GPU física.

La comprobación de la escena completa en este entorno usa el backend WebGL 2. Las cifras de FPS de SwiftShader describen ejecución por software y se registran únicamente como diagnóstico. Los scripts temporales de diagnóstico están en `/tmp/viceblock-webgpu-check.mjs`, `/tmp/viceblock-three-probe.mjs` y `/tmp/viceblock-gpu-probe.mjs`.

### Registro de aceptación de 0.4.0

Tipos, 25 pruebas en seis archivos, build web/portable y comparación reproducible aprobados. El smoke de la escena completa pasó en Chromium 156.0.8078.79/SwiftShader con WebGL 2 en escritorio 960×640 y táctil 390×844. También pasó el HTML portable inline con red desactivada, cero solicitudes HTTP(S) y cero errores de JavaScript o consola. Informes en `/tmp/viceblock-040-web/report.json` y `/tmp/viceblock-040-portable/report.json`.

En ventana de 3840×2160 se comprobó el límite interno de los cuatro perfiles, con WebGL 2. Se obtuvieron 798.640 píxeles en Bajo, 1.198.660 en Medio, 1.798.728 en Alto y 2.797.674 en Ultra. Todos quedaron dentro de sus cuotas y el cambio de perfil terminó sin errores de JavaScript o consola. Informe en `/tmp/viceblock-040-pixel-budget.json`. Se inspeccionaron las capturas de calle, noche y teléfono táctil de la entrega.
