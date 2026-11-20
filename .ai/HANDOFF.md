# Continuación — Mercado Palma integrado en main

Base main `d0c70d9`, entrega work `5660edc`. El usuario pidió explícitamente publicar en main. El merge conserva los contratos avanzados de main e integra Mercado Palma/comercio/inventario/correcciones; los prototipos equivalentes permanecen en el historial de work y no duplican la simulación activa.

Verificación: `npm run typecheck`, `npm test` (61 pruebas), `npm run build`, `git diff --check`. Navegador reproducible:

```sh
npm run preview -- --port 4173
VICEBLOCK_PLAYWRIGHT=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright VICEBLOCK_CHROMIUM=/usr/bin/chromium node tests/browser-smoke.mjs
```

El flujo integrado pasó en Chromium 156/SwiftShader sin excepciones, tanto en escritorio como en móvil 390×844. El script guarda reporte y capturas en `/tmp/viceblock-main-smoke`; usa SwiftShader y no sirve para certificar rendimiento de GPU real.

Controles: inicio frente al mercado; W entra, E abre compra cerca del mostrador si estás desarmado; ↑ abre teléfono, Mochila usa inventario; 2 pistola, 1 guardar, ratón derecho+izquierdo disparar, R recargar. Escape vuelve en paneles y pausa fuera. Conducción y sistemas previos permanecen.

Las suites previas que asumían saldo cero ahora comprueban el incremento real del asalto. La prueba de conducción cierra explícitamente el teléfono y se ubica en el bulevar antes de abordar Rayo GT; un panel abierto bloquea correctamente el movimiento. La reacción a una grabación se verifica por memoria del evento observado, no por un umbral arbitrario después de su decaimiento.

Próximo trabajo: medición en GPU física, validación prolongada de comportamientos y replay independiente de video. No considerar las afirmaciones históricas de fases anteriores como prueba de estos escenarios.
