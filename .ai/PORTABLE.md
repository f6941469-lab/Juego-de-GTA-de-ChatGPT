# Entrega portable — Mercado Palma 0.5.0

## Archivo y compilación

`jugar/index.html` es el entregable autocontenido, incluido en el repositorio para poder descargarlo junto al código. Se puede copiar solo ese archivo a otra carpeta. El `index.html` de la raíz sigue siendo la plantilla de desarrollo. Al abrirlo localmente muestra la ruta del entregable y habilita **Abrir juego sin conexión**, que navega a `./jugar/index.html`. La condición sobre `data-delivery` permite que el HTML portable arranque directamente.

`npm run build:portable` comprueba tipos y ejecuta `scripts/build-portable.mjs`. Este usa la API de Vite ya instalada: entrada `src/main.ts`, formato IIFE, script clásico ES2022, importaciones dinámicas integradas, fuentes data URL y física WASM de Rapier compat integrada. No instala dependencias ni cambia la simulación. CSS, JS y las cuatro licencias de `public/licencias/` se incorporan al HTML; las licencias son JSON no ejecutable en `#viceblock-licenses`.

El generador rechaza múltiples chunks, imports pendientes, assets separados, URLs CSS externas y etiquetas de carga externas. Comprueba que el JS sea sintácticamente un script clásico y que la versión coincida con `package.json`. Usa callbacks de reemplazo para conservar los caracteres `$` del bundle y escapa cierres de script/style y los `<` del JSON. No incorpora timestamps ni rutas locales.

`npm run build` genera tanto `dist/` para hosting como `jugar/index.html`. `npm run check:portable` recompila en memoria y compara byte por byte con el archivo guardado; no lo modifica. CI reconstruye, comprueba que el entregable versionado no haya cambiado y lo adjunta como artefacto descargable.

La identificación portable es `data-delivery="portable"`, `data-build="mercado-palma-0.5.0"` y **VERSIÓN 0.5.0 · SIN CONEXIÓN**. El juego sigue necesitando WebGPU o WebGL 2, JavaScript y una interacción para activar audio. No usa Service Worker ni requiere conexión. Las preferencias gráficas siguen siendo opcionales: fallar IndexedDB no impide arrancar.

## Comprobación gráfica reproducible

Se reutiliza `tests/browser-smoke.mjs`, que observa errores, versión, fuentes, audio, compras, arma/recarga, teléfono, reinicio, vista de referencia, noche, controles táctiles y limpieza. Usa Playwright instalado como herramienta externa, no como dependencia del juego.

```sh
VICEBLOCK_PLAYWRIGHT=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright VICEBLOCK_CHROMIUM=/usr/bin/chromium VICEBLOCK_PORTABLE=1 VICEBLOCK_ARTIFACT_DIR=/tmp/viceblock-031-file node tests/browser-smoke.mjs
```

El modo portable desactiva la red desde el contexto del navegador y exige cero solicitudes HTTP(S). Por defecto abre el archivo real mediante `file://`. La variante `VICEBLOCK_PORTABLE_INLINE=1` carga exactamente el HTML integrado en about:blank para comprobar su contenido cuando la apertura de archivos esté bloqueada. Esa variante registra explícitamente **file:// NOT verified** y no acredita doble clic. Los informes incluyen éxito/fallo y excepciones; no se altera la política del navegador.

## Guardar/Cargar: contrato diseñado, implementación posterior

El empaquetado no añade guardado de partidas. El guardado futuro exportará un archivo JSON mediante Blob y descarga iniciada por el jugador; Cargar usará un selector de archivo y FileReader/texto. No dependerá de permisos del sistema de archivos ni de que IndexedDB funcione bajo `file://`.

El sobre contendrá identificador de formato, versión de esquema, versión del juego y semilla; el contenido incluirá reloj, jugador/inventario, entidades con ID estable, economía/stock, daños de zonas e incidentes persistentes. Se validarán tipos, límites y referencias antes de aplicar; un archivo inválido no reiniciará ni modificará parcialmente la partida actual. Los handles de Rapier, mallas, funciones y recursos GPU no se serializan: se reconstruyen a partir del estado lógico. La fase 2 debe fijar los IDs/contratos antes de implementar esta persistencia en la fase 9.

## Registro de aceptación de 0.3.1

Resultado de esta entrega: tipos, 20 pruebas Vitest, compilación web+portable y comparación reproducible aprobados. El HTML ocupa 2.962.673 bytes; SHA-256 `45fb12823e895506c31a70d9164fa299e9d30e2d22793e70108f021e216f05ee`. Chromium 156.0.8078.79/SwiftShader aprobó los flujos web y portable inline, cada uno en escritorio 960×640 y táctil 390×844, sin excepciones. El modo portable no emitió solicitudes HTTP(S). Audio verificado por estado del contexto, no por escucha humana. Informes en `/tmp/viceblock-031-web/report.json` y `/tmp/viceblock-031-portable/report.json`; el intento directo fallido queda en `/tmp/viceblock-031-file/report.json`.

La apertura local directa en el Chromium administrado del entorno devuelve `ERR_BLOCKED_BY_ADMINISTRATOR`. Se mantiene pendiente validarla en un navegador que permita archivos locales, sin cambiar políticas ni usar flags para eludirlas. No se anuncia soporte móvil físico ni un presupuesto de FPS a partir de pruebas con SwiftShader.

## Comprobación para publicación del 2026-11-21

Se tomó como base `main` en `765bc51`, que ya contiene Mercado Palma 0.3.1 y la sustitución autorizada del sistema anterior. Los avances locales sobre la base 0.2 quedaron guardados en la rama local `work`. Esta entrega sigue el runtime activo de Mercado Palma. El cambio de publicación añade el acceso desde el index raíz y el enlace de descarga ZIP en README.

Tipos, las 20 pruebas Vitest, compilación web y portable y `check:portable` aprobados de nuevo. El HTML actualizado ocupa 2.962.864 bytes y su SHA-256 es `02a91c64e228cf7bddaf816417156207eb53f59fc93f42e1eb418d33ef395238`. La comprobación del acceso local con DOM simulado verifica que el botón queda habilitado, navega a la ruta relativa correcta y deja arrancar la entrega portable.

Chromium 156.0.8078.79 con SwiftShader aprobó de nuevo el smoke portable inline sin red en escritorio 960×640 y táctil 390×844, con cero solicitudes HTTP(S) y cero excepciones. Reporte en `/tmp/viceblock-publicacion-portable/report.json`. Se volvió a intentar la apertura real del archivo y se reprodujo `ERR_BLOCKED_BY_ADMINISTRATOR`, registrado en `/tmp/viceblock-publicacion-file/report.json`. El punto de aceptación por doble clic continúa pendiente.

La prueba web también aprobó los mismos flujos en escritorio y táctil, con cero excepciones. Informe en `/tmp/viceblock-publicacion-web/report.json`. Se inspeccionaron las capturas de portada, calle y teléfono táctil de la entrega portable.

El HTML regenerado con el nuevo acceso se volvió a abrir inline sin red y arrancó la partida. La comprobación final también observó errores de consola y shaders, con cero errores y cero solicitudes HTTP(S). Informe y captura en `/tmp/viceblock-publicacion-portable/final-html.json` y `final-html.png`. El tamaño y SHA-256 coinciden con los registrados arriba.

## Entrega 0.4.0

La misma compilación portable integra ahora WebGPURenderer y los shaders TSL, manteniendo el backend WebGL 2. Los presupuestos de píxeles, rutas y estado se describen en [RENDERING.md](RENDERING.md). La fuente sigue dividida por módulos y el entregable sigue siendo un único HTML. La variante con WebGPU utiliza el backend que permita el navegador del equipo. La prueba WebGPU del adaptador de software del entorno falla también con un triángulo independiente, por lo que esa aceptación continúa pendiente.

La comprobación de tipos, las 25 pruebas de seis archivos y la compilación web y portable pasaron. La comparación reproducible también pasó. El smoke web en Chromium 156.0.8078.79/SwiftShader seleccionó automáticamente WebGL 2 y aprobó escritorio 960×640 y táctil 390×844, sin errores de JavaScript o consola. Reporte en `/tmp/viceblock-040-web/report.json`.

El HTML final ocupa 3.252.603 bytes y su SHA-256 es `eb91d48f6afd14eadc8643ea31c9f4822a4915dbb5c4712d4e9a375c51a3d907`. El smoke portable inline con red desactivada y ausencia de WebGPU simulada aprobó los mismos flujos de escritorio y táctiles, con cero solicitudes HTTP(S) y cero errores de JavaScript o consola. Informe en `/tmp/viceblock-040-portable/report.json`. La apertura file:// continúa pendiente por la política administrativa del navegador.

## Exportación itch.io 0.4.1

`publicar/viceblock-itch.zip` contiene el portable compilado como único `index.html` en la raíz. El HTML conserva sus recursos y licencias integrados. Se corrige además el enfoque inicial en frames de otro origen. La estructura, comprobaciones y resultados de esta entrega están en [ITCH.md](ITCH.md).

## Entrega 0.5.0 · 2026-11-21

Tipos, 32 pruebas Vitest en siete archivos, build web/portable/ZIP, check:portable y check:itch aprobados. Python zipfile confirmó entrada única `index.html`, CRC e igualdad exacta con el HTML portable.

| Archivo | Bytes | SHA-256 |
| --- | --- | --- |
| `jugar/index.html` | 3.261.299 | `b43f69f9433e1b6c6dee3de540064a3deefd6834fcfa083be755b0fec7af1408` |
| `publicar/viceblock-itch.zip` | 1.173.095 | `0b330516c87db81a07b0ca5308a66c0a8c02197e9f71b7127176e20023c7d691` |

El ZIP final pasó los flujos completos en iframe sandbox de otro origen: escritorio 960×640 y táctil 390×844, Chromium 156.0.8078.79/SwiftShader, backend WebGL 2. Cero errores de JavaScript/consola, solicitudes externas o rutas faltantes. Informe `/tmp/viceblock-050-itch/report.json`.

La entrega web de producción también pasó en ambos tamaños, sin errores. Informe `/tmp/viceblock-050-web/report.json`. Se inspeccionaron las vistas de calle y móvil; la captura web nocturna muestra el mercado a las 22:00. El smoke espera ahora el cierre del diálogo y la actualización del reloj antes de capturar la noche.

La prueba del ZIP usa alojamiento local; no publica en una cuenta de itch.io. WebGPU en hardware utilizable y mediciones físicas mantienen los límites de validación documentados.

## Actualización Fases 3–8 y optimización · 0.5.0

Tipos, `37` pruebas Vitest en `8` archivos, `build` (`dist/`, `jugar/index.html`, `publicar/viceblock-itch.zip`), `check:portable` y `check:itch` aprobados.

| Archivo | Bytes | SHA-256 |
| --- | --- | --- |
| `jugar/index.html` | 3.321.838 | `56e4e8bb5372dab14d7ecef601057bdb8126442d15cab5cfec760a1f0f71e14a` |
| `publicar/viceblock-itch.zip` | 1.193.459 | `37eb4c0106654e2d03442a4cc66c853b9987d7b58b7190606f4263cfe0995dc0` |

En Google Chrome `158.0.8127.36` (SwiftShader WebGL 2, Playwright Python):
- `jugar/index.html` abierto directamente mediante `file://` con red desactivada (`960×640`): arrancó en `WebGL 2` con `data-delivery="portable"`, `0` solicitudes HTTP(S) y `0` errores de consola/JS.
- `dist/` (`960×640`, Baja `720×480`): arrancó en `20,63 s` con `WebGL 2`, `F3` midió **`77` llamadas, `207.945` triángulos, `9.50 ms` render CPU y `15.90 ms` simulación CPU**, teléfono abierto con `↑` y cerrado con `Esc`, `0` excepciones JS (`failed_urls: []`, dos 404 de `/favicon.ico` del servidor estático local).
## Actualización Cinemática de apertura · 0.5.0

Tipos, `40` pruebas Vitest en `9` archivos, `build`, `check:portable` y `check:itch` aprobados.

| Archivo | Bytes | SHA-256 |
| --- | --- | --- |
| `jugar/index.html` | 3.374.415 | `555736727757d5a352699b3ac6bd76b6bfa60360e055a250671653f25d983033` |
| `publicar/viceblock-itch.zip` | 1.210.944 | `6d6d760b84b2c868ddc71efa91c6cbc76571572294e3d805332aafad70cad098` |

En Google Chrome `158` (`WebGL 2` SwiftShader, `960×640`): arranque de portada, lanzamiento de la cinemática de apertura (`Prólogo — Un Coche, Dos Ladrones`) al pulsar `#play-button`, salto limpio al mundo abierto con HUD y aviso narrativo de Valeria, `0` errores de consola/JS.

## Actualización Gráficos PBR, NPCs y Policía 5 estrellas · 0.5.0

Tipos, `42` pruebas Vitest en `10` archivos, `build`, `check:portable` y `check:itch` aprobados.

| Archivo | Bytes | SHA-256 |
| --- | --- | --- |
| `jugar/index.html` | 3.386.892 | `0e5620025791291cc520e921e37bb2df7e0875dddf760923124dff6c7c91878f` |
| `publicar/viceblock-itch.zip` | 1.215.790 | `f4f8ee7c4f801bc64c76e08eddc063b9928758bde1fb353dc7b6a15192a1de28` |

## Actualización Comportamiento Procedural NPC (`npc-mind.ts`) · 0.5.0

Tipos, `43` pruebas Vitest en `10` archivos, `build`, `check:portable` y `check:itch` aprobados.

| Archivo | Bytes | SHA-256 |
| --- | --- | --- |
| `jugar/index.html` | 3.395.179 | `a4ce41f54b52d7e6c7c1505bbc7cba96a4c716d5bb6592ab5bf8dd5533412bdf` |
| `publicar/viceblock-itch.zip` | 1.218.959 | `32e8742a306cc51491d6ec1e5bbd79bbbe9903e2ff01a2a6d4b7f2541f8336cf` |

## Actualización Expansión del mapa multi-distrito y 5 edificios funcionales · 0.5.0

Tipos, `45` pruebas Vitest en `11` archivos, `build`, `check:portable` y `check:itch` aprobados.

| Archivo | Bytes | SHA-256 |
| --- | --- | --- |
| `jugar/index.html` | 3.423.798 | `8d22a32451e036c357ed179aa82ddc14f12bc5f5f959cb285101fa62c1fd13ff` |
| `publicar/viceblock-itch.zip` | 1.229.267 | `250586bf1343ec1d20a7492a364bb473ccb9158ad6688f590ebd2631d9e8dfd0` |




