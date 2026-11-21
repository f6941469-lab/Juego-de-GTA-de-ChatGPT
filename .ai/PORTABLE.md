# Entrega portable — Mercado Palma 0.3.1

## Archivo y compilación

`jugar/index.html` es el entregable autocontenido, incluido en el repositorio para poder descargarlo junto al código. Se puede copiar solo ese archivo a otra carpeta. El `index.html` de la raíz sigue siendo la plantilla de desarrollo y, si se abre localmente, indica la ruta del entregable.

`npm run build:portable` comprueba tipos y ejecuta `scripts/build-portable.mjs`. Este usa la API de Vite ya instalada: entrada `src/main.ts`, formato IIFE, script clásico ES2022, importaciones dinámicas integradas, fuentes data URL y física WASM de Rapier compat integrada. No instala dependencias ni cambia la simulación. CSS, JS y las cuatro licencias de `public/licencias/` se incorporan al HTML; las licencias son JSON no ejecutable en `#viceblock-licenses`.

El generador rechaza múltiples chunks, imports pendientes, assets separados, URLs CSS externas y etiquetas de carga externas. Comprueba que el JS sea sintácticamente un script clásico y que la versión coincida con `package.json`. Usa callbacks de reemplazo para conservar los caracteres `$` del bundle y escapa cierres de script/style y los `<` del JSON. No incorpora timestamps ni rutas locales.

`npm run build` genera tanto `dist/` para hosting como `jugar/index.html`. `npm run check:portable` recompila en memoria y compara byte por byte con el archivo guardado; no lo modifica. CI reconstruye, comprueba que el entregable versionado no haya cambiado y lo adjunta como artefacto descargable.

La identificación portable es `data-delivery="portable"`, `data-build="mercado-palma-0.3.1"` y **VERSIÓN 0.3.1 · SIN CONEXIÓN**. El juego sigue necesitando WebGL 2, JavaScript y una interacción para activar audio. No usa Service Worker ni requiere conexión. Las preferencias gráficas siguen siendo opcionales: fallar IndexedDB no impide arrancar.

## Comprobación gráfica reproducible

Se reutiliza `tests/browser-smoke.mjs`, que observa errores, versión, fuentes, audio, compras, arma/recarga, teléfono, reinicio, vista de referencia, noche, controles táctiles y limpieza. Usa Playwright instalado como herramienta externa, no como dependencia del juego.

```sh
VICEBLOCK_PLAYWRIGHT=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright VICEBLOCK_CHROMIUM=/usr/bin/chromium VICEBLOCK_PORTABLE=1 VICEBLOCK_ARTIFACT_DIR=/tmp/viceblock-031-file node tests/browser-smoke.mjs
```

El modo portable desactiva la red desde el contexto del navegador y exige cero solicitudes HTTP(S). Por defecto abre el archivo real mediante `file://`. La variante `VICEBLOCK_PORTABLE_INLINE=1` carga exactamente el HTML integrado en about:blank para comprobar su contenido cuando la apertura de archivos esté bloqueada. Esa variante registra explícitamente **file:// NOT verified** y no acredita doble clic. Los informes incluyen éxito/fallo y excepciones; no se altera la política del navegador.

## Guardar/Cargar: contrato diseñado, implementación posterior

El empaquetado no añade guardado de partidas. El guardado futuro exportará un archivo JSON mediante Blob y descarga iniciada por el jugador; Cargar usará un selector de archivo y FileReader/texto. No dependerá de permisos del sistema de archivos ni de que IndexedDB funcione bajo `file://`.

El sobre contendrá identificador de formato, versión de esquema, versión del juego y semilla; el contenido incluirá reloj, jugador/inventario, entidades con ID estable, economía/stock, daños de zonas e incidentes persistentes. Se validarán tipos, límites y referencias antes de aplicar; un archivo inválido no reiniciará ni modificará parcialmente la partida actual. Los handles de Rapier, mallas, funciones y recursos GPU no se serializan: se reconstruyen a partir del estado lógico. La fase 2 debe fijar los IDs/contratos antes de implementar esta persistencia en la fase 9.

## Límite de aceptación

Resultado de esta entrega: tipos, 20 pruebas Vitest, compilación web+portable y comparación reproducible aprobados. El HTML ocupa 2.962.673 bytes; SHA-256 `45fb12823e895506c31a70d9164fa299e9d30e2d22793e70108f021e216f05ee`. Chromium 156.0.8078.79/SwiftShader aprobó los flujos web y portable inline, cada uno en escritorio 960×640 y táctil 390×844, sin excepciones. El modo portable no emitió solicitudes HTTP(S). Audio verificado por estado del contexto, no por escucha humana. Informes en `/tmp/viceblock-031-web/report.json` y `/tmp/viceblock-031-portable/report.json`; el intento directo fallido queda en `/tmp/viceblock-031-file/report.json`.

La apertura local directa en el Chromium administrado del entorno devuelve `ERR_BLOCKED_BY_ADMINISTRATOR`. Se mantiene pendiente validarla en un navegador que permita archivos locales, sin cambiar políticas ni usar flags para eludirlas. No se anuncia soporte móvil físico ni un presupuesto de FPS a partir de pruebas con SwiftShader.
