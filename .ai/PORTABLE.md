# Entrega portable — Mercado Palma 0.4.1

## Archivo y compilación

`jugar/index.html` es el entregable autocontenido, incluido en el repositorio para poder descargarlo junto al código. Se puede copiar solo ese archivo a otra carpeta. El `index.html` de la raíz sigue siendo la plantilla de desarrollo. Al abrirlo localmente muestra la ruta del entregable y habilita **Abrir juego sin conexión**, que navega a `./jugar/index.html`. La condición sobre `data-delivery` permite que el HTML portable arranque directamente.

`npm run build:portable` comprueba tipos y ejecuta `scripts/build-portable.mjs`. Este usa la API de Vite ya instalada: entrada `src/main.ts`, formato IIFE, script clásico ES2022, importaciones dinámicas integradas, fuentes data URL y física WASM de Rapier compat integrada. No instala dependencias ni cambia la simulación. CSS, JS y las cuatro licencias de `public/licencias/` se incorporan al HTML; las licencias son JSON no ejecutable en `#viceblock-licenses`.

El generador rechaza múltiples chunks, imports pendientes, assets separados, URLs CSS externas y etiquetas de carga externas. Comprueba que el JS sea sintácticamente un script clásico y que la versión coincida con `package.json`. Usa callbacks de reemplazo para conservar los caracteres `$` del bundle y escapa cierres de script/style y los `<` del JSON. No incorpora timestamps ni rutas locales.

`npm run build` genera tanto `dist/` para hosting como `jugar/index.html`. `npm run check:portable` recompila en memoria y compara byte por byte con el archivo guardado; no lo modifica. CI reconstruye, comprueba que el entregable versionado no haya cambiado y lo adjunta como artefacto descargable.

La identificación portable es `data-delivery="portable"`, `data-build="mercado-palma-0.4.1"` y **VERSIÓN 0.4.1 · SIN CONEXIÓN**. El juego sigue necesitando WebGL 2, JavaScript y una interacción para activar audio. No usa Service Worker ni requiere conexión. Las preferencias gráficas siguen siendo opcionales: fallar IndexedDB no impide arrancar.

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
