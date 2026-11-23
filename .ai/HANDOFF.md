# Continuación — Mercado Palma 0.5.0 (Fases 3–8)

Fases 3–8 y la optimización espacial/gráfica están implementadas en `main` conservando `Session` (`src/simulation/session.ts`) y la presentación de Mercado Palma. No restaurar el motor/HUD anterior.

## Contratos que se conservan

- `Session` prepara jugador/actores/tráfico/policía, avanza Rapier una sola vez (`1/60 s`) y lee poses; el render interpola (`alpha`).
- `Navigation`: jerarquía de 48 zonas, 2 búsquedas/tick (máx. 8192 visitas conjuntas), actualización de obstáculos locales (18 escaparates + 9 props) y reservas/cesión físicas.
- Población: `population.people` conserva los 10 civiles originales por compatibilidad; `merchants` (9) y `allPeople` (21 civiles, 25 NPCs con policía) añaden comerciantes de los 9 locales y a `Pedro`/`Valeria`/`Marcos` con rutinas, accesorios en mano, charla en español, acoso persistente y eventos NPC-vs-NPC acotados.
- `RoadNetwork` y tránsito: 25 cruces, 80 carriles, 3 coches `traffic.cars` (conducibles y robables con `F`), autobús circular (`4` paradas), metro lanzadera (`Metro Sur` / `Metro Norte`) y `2` coches patrulla con desembarco de agentes, fuego recíproco y barricadas.
- `Recorder` y `Palma Social`: captura POV de testigos y cámaras urbanas con envío progresivo (sobrevive como clip `partial` si el testigo cae) y reproducción 3D aislada (`replayGroup`) sin mutar el presente.
- `npm run build` genera `dist/`, `jugar/index.html` y `publicar/viceblock-itch.zip`. Comprobar siempre con `npm run typecheck`, `npm test`, `npm run check:portable` y `npm run check:itch`.

## Siguiente unidad (Fase 9 y hardware real)

- Guardar/cargar partida mediante archivo JSON descargable/cargable sin depender de `IndexedDB` bajo `file://`.
- Validación de `WebGPU` y mediciones reales de FPS/memoria/audio en GPU física y dispositivos móviles reales (`SwiftShader` solo valida flujos funcionales).
- `tests/browser-smoke.mjs` y `tests/itch-smoke.mjs` requieren el paquete `playwright` de Node si se ejecutan con Node; en este entorno Linux sin `playwright` de Node se verificó con Python Playwright + `/usr/bin/google-chrome` (`158.0.8127.36`, WebGL 2 SwiftShader) en `dist/`, `file://` offline (`jugar/index.html`) e `iframe` móvil (`publicar/viceblock-itch.zip`).

## Registro de continuación de 0.4.1

### Exportación 0.4.1

El encargo actual corrige la exportación para itch.io. `npm run build` y `build:itch` generan `publicar/viceblock-itch.zip`, que incluye el HTML compilado como `index.html` en la raíz. El enlace de descarga de README apunta a ese archivo listo para subir. El ZIP fuente del repositorio conserva la estructura de desarrollo. `check:itch` verifica la vigencia del paquete. La prueba `tests/itch-smoke.mjs` ejecuta el contenido del ZIP en un iframe sandbox de otro origen. Ver [ITCH.md](ITCH.md).

La prueba encontró autofocus bloqueado al cargar frames de otro origen. Se retiró el atributo del cierre del diálogo y se limitó el foco inicial de jugar al documento ya enfocado.

Verificaciones aprobadas con tipos, 25 pruebas, build, check:portable y check:itch. ZIP validado también con zipfile de Python y CRC correcto. El paquete ejecutó los flujos completos en iframe sandbox de otro origen, escritorio y táctil, con cero errores y recursos externos. Informes en `/tmp/viceblock-041-itch/report.json` y `/tmp/viceblock-041-web/report.json`. La prueba web directa también pasó con cero errores.

El siguiente encargo retoma la fase 2 del plan. Los contratos de 0.4.0 se conservan como base funcional.

## Base funcional 0.4.0

Continuación autorizada del plan con WebGPU y límites de carga. `Session` registra las entidades existentes en `WorldState`. `Navigation` cubre el mapa transitable con A* reutilizable y trabajo acotado. Los cambios de geometría invalidan las rutas por revisión. Las decisiones civiles usan distancia y urgencia, manteniendo movimiento y física en el tick compartido.

`createRenderer` inicializa de forma asíncrona WebGPU o WebGL 2 y compila antes del arranque. Cielo y agua comparten TSL. La entrega sigue siendo `jugar/index.html`, generada por el empaquetador existente. Consultar [RENDERING.md](RENDERING.md), [SIMULATION.md](SIMULATION.md) y la fase 2 de ROADMAP.md para seguir.

La fase 2 aún requiere navegación jerárquica/vial, reservas y distribución de actividades en otras zonas. Mantener los presupuestos y comprobar continuidad al extender los sistemas. Los documentos siguientes conservan el contexto histórico de 0.3.1.

## Verificación de la entrega actual

Tipos, 25 pruebas, build y check:portable aprobados. Pruebas web y portable inline offline en Chromium 156/SwiftShader aprobadas en escritorio y táctil, con backend WebGL 2 y cero errores de JavaScript o consola. Los informes están en `/tmp/viceblock-040-web/report.json` y `/tmp/viceblock-040-portable/report.json`. El HTML final y su checksum están registrados en PORTABLE.md.

WebGPU en el adaptador de software falla incluso con un triángulo fuera del juego. Se mantiene pendiente su aceptación en un dispositivo utilizable y el perfilado en GPU física. La apertura directa file:// continúa bloqueada por la política del entorno.

## Contexto anterior de la entrega portable

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
