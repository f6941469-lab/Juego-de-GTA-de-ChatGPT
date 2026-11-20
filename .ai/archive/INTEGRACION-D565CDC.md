# Integración anterior: d565cdc (histórico)

Conservado antes de la sustitución completa solicitada por el usuario el 2026-11-20. El código anterior se conserva en Git.

# Estado actual — integración de Mercado Palma en main

Fecha: 2026-11-20. Integración autorizada por el usuario de `work@5660edc` sobre `main@d0c70d9`. Se conservan los desarrollos posteriores de main y se usa su único `SimulationEngine`.

- Inicio frente a Mercado Palma (15,0,41.5), décima tienda, con interior/puerta y suelo físico. El mercado usa los NPC, percepciones y destructibles del motor existente.
- Comercio validado por cercanía, línea de visión, salud/estado del comerciante, arma guardada, saldo y existencias. Inventario y caja por tienda; fondos iniciales $120. Las compras y asaltos modifican el mismo dinero. Los cobros no duplican la caja.
- Mochila integrada en el teléfono nativo: agua/comida recuperan salud; cajas de munición abastecen la pistola.
- Correcciones compartidas: apuntar+disparar con dos botones del ratón, aislamiento de paneles, Escape para volver, pausa al perder foco, rumbo interpolado, mira/retroceso/zoom y reinicio del avatar. Agrupación de bloques por articulación conservando acabados y carabina.
- Se conservan conducción, tráfico, streaming espacial/físico, nueve tiendas anteriores, distritos, policía y HUD de main. Los módulos equivalentes del prototipo work se sustituyen por estos contratos; no hay dos simulaciones paralelas.

## Verificación

- Tipos y compilación de producción aprobados.
- 61 pruebas aprobadas en 21 archivos: incluye las suites de main y las regresiones de entradas, cámara y compra/inventario de Mercado Palma.
- `tests/browser-smoke.mjs` comprueba la interfaz integrada real; requiere Playwright/Chromium externos, sin añadir dependencias al juego. El reporte se guarda en `/tmp/viceblock-main-smoke`.
- Chromium 156 + SwiftShader sobre producción: entrada al mercado, compras ($120→$112→$82), uso de munición en mochila, apuntar/disparar/recargar, reinicio y teléfono táctil 390×844 aprobados sin excepciones. Reporte: `/tmp/viceblock-main-smoke/report.json`.
- La verificación gráfica de software no certifica fluidez en GPU física. Permanecen pendientes el benchmark de hardware y el replay de video real del teléfono existente.

La autorización de esta sesión incluye commit y push a main; no se necesita otra confirmación para completar la publicación.


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
