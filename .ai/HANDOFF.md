# Continuación — reemplazo completo por Mercado Palma 0.3.0

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
