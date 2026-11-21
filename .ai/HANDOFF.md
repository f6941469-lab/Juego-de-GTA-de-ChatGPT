# Continuación — Mercado Palma 0.3.1 portable

Revalidación para publicación solicitada el 2026-11-21 sobre main@765bc51. El index raíz añade el botón **Abrir juego sin conexión** y README enlaza el ZIP descargable. El portable se regeneró con ese acceso integrado. Tipos, 20 pruebas, build y comparación reproducible aprobados. Las pruebas web y portable inline offline pasaron. La apertura file:// volvió a quedar bloqueada. Ver la sección de publicación en [PORTABLE.md](PORTABLE.md) para tamaño, hash e informes.

El usuario autorizó iniciar el plan. Se incorporó `scripts/build-portable.mjs` (API Vite existente, sin nuevas dependencias) y el entregable `jugar/index.html`. Usa `npm run build` para actualizar web y portable, `npm run build:portable` para solo portable, y `npm run check:portable` para comprobar vigencia sin escribir. Versión visible 0.3.1; portable muestra SIN CONEXIÓN. Descargar el repositorio incluye el HTML preparado; el index raíz es la plantilla de desarrollo. Ver [PORTABLE.md](PORTABLE.md).

El contenido del HTML pasó el smoke completo con red desactivada en modo inline, escritorio y táctil, sin HTTP(S) ni excepciones, incluyendo compras/arma/teléfono/fuentes y ciclo de audio. Reporte `/tmp/viceblock-031-portable/report.json`; capturas entry/traffic/mobile inspeccionadas. Apertura real file:// bloqueada por política del Chromium administrado: sigue pendiente de aceptación y no se eludió. La prueba se reproduce con las variables Playwright/Chromium de abajo, más `VICEBLOCK_PORTABLE=1`; añadir `VICEBLOCK_PORTABLE_INLINE=1` comprueba contenido, no apertura local.

La simulación no cambió en esta entrega. Continuar con IDs/estado/eventos/navegación global de fase 2 antes de aumentar NPC, conducción y tiendas. El diseño de Guardar/Cargar por archivo está en PORTABLE.md, pero su implementación depende de esos contratos y queda posterior. No incorporar LLM ni historia todavía. Las notas siguientes conservan el contexto de la sustitución previa; sus marcas 0.3.0 son históricas.

Tipos, 20 pruebas, build web+portable y check:portable aprobados. HTML de 2.962.673 bytes con SHA-256 registrado en PORTABLE.md. Smoke web también aprobado (mismo entorno y tamaños), sin excepciones; `/tmp/viceblock-031-web/report.json`. No atribuir las lecturas de FPS de SwiftShader a rendimiento real. El bloqueo directo queda documentado en `/tmp/viceblock-031-file/report.json`.

## Contexto de la sustitución 0.3.0

El usuario pidió explícitamente sustituir el sistema anterior por el de la primera captura, después de ver que la integración conservaba otra presentación. Mantener como activo el código de work@5660edc: `main.ts` usa Session; no restaurar SimulationEngine/HUD/distritos antiguos. El cambio se publica como commit normal sobre main, conservando d565cdc y la implementación anterior en Git.

## Ejecutar y reconocer la versión correcta

Detener el servidor anterior y ejecutar desde la carpeta recién descargada:

```sh
npm ci
npm run dev
```

La portada debe indicar **MERCADO PALMA · VERSIÓN 0.3.0**. Si se sirve una compilación anterior de dist/, ejecutar `npm run build` y volver a iniciar `npm run preview`. No atribuir una captura de otra compilación al código actual sin comprobar ese identificador.

## Verificación

Tipos, 20 pruebas y compilación aprobados. El código operativo coincide con la entrega visual original salvo etiqueta de versión. Navegador reproducible:

```sh
npm run preview -- --port 4173
VICEBLOCK_PLAYWRIGHT=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright VICEBLOCK_CHROMIUM=/usr/bin/chromium VICEBLOCK_ARTIFACT_DIR=/tmp/viceblock-030 node tests/browser-smoke.mjs
```

El smoke comprueba versión/ausencia del HUD antiguo, teléfono, compras, disparo/recarga, reinicio, vista de calle de la captura original, noche, controles táctiles y liberación pagehide. Playwright se instala como herramienta externa, no como dependencia del juego. Medir GPU física y validar audio por escucha sigue pendiente.

Última comprobación gráfica: Chromium 156/SwiftShader en producción, 0 excepciones. Portada identificada como 0.3.0 y captura de calle comparada visualmente con la primera referencia. No se afirma identidad de píxeles entre frames con entidades en movimiento.

## Siguiente encargo: plan global y entrega sin servidor

El usuario solicitó planificación, recogida en [../ROADMAP.md](../ROADMAP.md) y [../TASKS.md](../TASKS.md). La primera entrega propuesta es un HTML portable; después se generaliza la simulación a todo el mapa antes de ampliar IA, vehículos, tiendas, destrucción, policía y replay. No confundir el experimento temporal en /tmp con un empaquetador incorporado al proyecto ni una release publicada. La prueba inline offline pasó; file:// continúa pendiente porque el Chromium administrado lo bloquea. El runtime y sus dependencias no se cambiaron durante esta planificación.

Última ampliación: NPC con objetivos, objetos y conversaciones en español al iniciar; robo de coches y respuesta a disparos sin asalto previo; nueve tiendas totales (Mara incluida), compradores NPC y comida consumible; grabación POV parcial incluso al morir el testigo si el teléfono ya envió esos segmentos. Se reservan contratos de narrativa, cámara y actores; historia/cinemáticas no se implementan aún. El usuario pidió evaluar un LLM pequeño en celular: revisión documental de WebLLM/SmolLM2/Qwen2.5, no benchmark. Recomendar diálogo contextual ligero de base y LLM opcional solo tras validar español, RAM, latencia y frame time junto al juego en hardware físico. No convertirlo en controlador de la simulación ni exigir red para el HTML portable. No se modificó el runtime ni se incorporaron modelos/dependencias.
