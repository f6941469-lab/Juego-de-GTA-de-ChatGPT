# Estado activo — Mercado Palma 0.3.0

Fecha: 2026-11-20. El usuario solicitó sustituir todo el sistema anterior por la entrega de la primera captura. La integración d565cdc queda sustituida por el runtime de work@5660edc, con una marca visible 0.3.0.

## Sistema ejecutado

- Entrada: `src/main.ts` → `createSession` (`src/simulation/session.ts`). Física compartida, interpolación y cámara de la entrega original.
- Distrito compacto con Mercado Palma/Mara, cuatro civiles autónomos, tres vehículos en circuito y dos policías a pie.
- Compras validadas, mochila, pistola 8/24, amenazas/asaltos, avisos de testigos, búsqueda con última ubicación y dos escaparates destructibles.
- Presentación de la primera captura: HUD de $120/salud/manos libres, minimapa compacto, teléfono verde y controles WASD/E/1/↑. Inicio frente a la tienda a las 17:15.
- Sin runtime anterior, conducción del jugador ni mapa de múltiples distritos. Su código permanece en el historial de Git; no hay dos implementaciones activas.
- Portada: **MERCADO PALMA · VERSIÓN 0.3.0**. HTML: `data-build="mercado-palma-0.3.0"`. Título: **Viceblock 0.3.0 — Mercado Palma**.

## Verificación de esta sustitución

- `npm run typecheck`: aprobado.
- `npm test`: 20 pruebas aprobadas en cinco archivos del sistema seleccionado.
- `npm run build`: aprobado, 45 módulos compilados.
- El código de `src/` coincide con 5660edc excepto el estilo de la nueva etiqueta de versión.
- Chromium 156 + SwiftShader, producción: identificador 0.3.0, ausencia del HUD anterior, teléfono por teclado, compra ($120→$112), disparo/recarga, reinicio, vista de calle de referencia, noche y movimiento/teléfono táctil 390×844 aprobados sin excepciones. Se inspeccionaron visualmente las capturas de portada y calle. Reporte: `/tmp/viceblock-030/report.json`; capturas: `entry.png`, `desktop.png`, `traffic.png`, `night.png` y `mobile.png`.

## Límites

Conducción, otros distritos, policía avanzada y replay no pertenecen a esta versión. El teléfono muestra testimonios de eventos reales con grabación no disponible. No se ha acreditado fluidez en GPU física; SwiftShader se usa para comprobar flujos. La referencia de 61 pruebas de la integración anterior no corresponde al árbol actual.
