# Estado activo — Mercado Palma 0.4.1

La corrección de publicación añade `publicar/viceblock-itch.zip`, con el HTML compilado en su raíz. El ZIP del repositorio incluía la plantilla de desarrollo en esa ubicación y el juego compilado en una subcarpeta. La exportación actual toma `jugar/index.html` y lo empaqueta como único archivo. Instrucciones y comprobaciones en [ITCH.md](ITCH.md).

La validación del ZIP y su CRC pasó, al igual que tipos, 25 pruebas, compilación y comprobaciones reproducibles. El paquete completo pasó la prueba en iframe sandbox de otro origen, en escritorio y táctil, con cero errores y solicitudes externas. Informe en `/tmp/viceblock-041-itch/report.json`.

## Base funcional 0.4.0

Entrega del 2026-11-21. Se inicia la fase 2 del plan con navegación peatonal global, registro de entidades y zonas e historial con cuotas. Session sigue siendo dueño del único avance físico. La población, el mercado y el circuito de tráfico conservan su comportamiento de gameplay.

El backend gráfico es WebGPURenderer con shaders TSL y compatibilidad WebGL 2. Los presupuestos activos están en [RENDERING.md](RENDERING.md). Las decisiones civiles se espacian por distancia y urgencia. F3 muestra backend, resolución, entidades, historial y rutas diferidas.

La fase 2 permanece en curso. Quedan navegación jerárquica/vial y reservas, simulación de actividades en otras zonas y actualización localizada de obstáculos. Los hitos de tiendas, robo de coches, conversaciones y replay se mantienen en ROADMAP.md.

## Verificación de 0.4.0

Tipos, 25 pruebas en seis archivos, compilación web/portable y comparación reproducible aprobados. Chromium 156.0.8078.79/SwiftShader aprobó los flujos web y portable inline offline en escritorio y táctil. El backend fue WebGL 2, con cero errores de JavaScript o consola. Informes en `/tmp/viceblock-040-web/` y `/tmp/viceblock-040-portable/`. El HTML tiene 3.252.603 bytes y su hash se registra en PORTABLE.md.

El intento de WebGPU en el adaptador de software falló también con un triángulo independiente. Quedan pendientes la aceptación WebGPU en un dispositivo utilizable, el rendimiento físico y la apertura file://. Los límites y los diagnósticos están en RENDERING.md.

## Registro de entregas anteriores

### Mercado Palma 0.3.1

Fecha: 2026-11-20. El usuario solicitó sustituir todo el sistema anterior por la entrega de la primera captura y después autorizó iniciar el plan de ampliación. La base de gameplay sigue siendo la sustitución de 0.3.0; 0.3.1 añade la entrega portable sin modificar Session.

## Sistema ejecutado

- Entrada: `src/main.ts` → `createSession` (`src/simulation/session.ts`). Física compartida, interpolación y cámara de la entrega original.
- Distrito compacto con Mercado Palma/Mara, cuatro civiles autónomos, tres vehículos en circuito y dos policías a pie.
- Compras validadas, mochila, pistola 8/24, amenazas/asaltos, avisos de testigos, búsqueda con última ubicación y dos escaparates destructibles.
- Presentación de la primera captura: HUD de $120/salud/manos libres, minimapa compacto, teléfono verde y controles WASD/E/1/↑. Inicio frente a la tienda a las 17:15.
- Sin runtime anterior, conducción del jugador ni mapa de múltiples distritos. Su código permanece en el historial de Git; no hay dos implementaciones activas.
- Portada: **MERCADO PALMA · VERSIÓN 0.3.1**; portable añade **SIN CONEXIÓN**. HTML: `data-build="mercado-palma-0.3.1"`; portable añade `data-delivery="portable"`. Título: **Viceblock 0.3.1 — Mercado Palma**.

## Verificación histórica de la sustitución 0.3.0

- `npm run typecheck`: aprobado.
- `npm test`: 20 pruebas aprobadas en cinco archivos del sistema seleccionado.
- `npm run build`: aprobado, 45 módulos compilados.
- El código de `src/` coincide con 5660edc excepto el estilo de la nueva etiqueta de versión.
- Chromium 156 + SwiftShader, producción: identificador 0.3.0, ausencia del HUD anterior, teléfono por teclado, compra ($120→$112), disparo/recarga, reinicio, vista de calle de referencia, noche y movimiento/teléfono táctil 390×844 aprobados sin excepciones. Se inspeccionaron visualmente las capturas de portada y calle. Reporte: `/tmp/viceblock-030/report.json`; capturas: `entry.png`, `desktop.png`, `traffic.png`, `night.png` y `mobile.png`.

## Límites

Conducción, otros distritos, policía avanzada y replay no pertenecen a esta versión. El teléfono muestra testimonios de eventos reales con grabación no disponible. No se ha acreditado fluidez en GPU física; SwiftShader se usa para comprobar flujos. La referencia de 61 pruebas de la integración anterior no corresponde al árbol actual.

## Plan de ampliación solicitado

El usuario pidió un plan para entregar un único index.html y extender NPC, vehículos, tiendas/asaltos, destrucción, policía y grabaciones a todo el mapa. Ver [../ROADMAP.md](../ROADMAP.md). No se modificó el runtime al elaborar el plan.

Prueba técnica temporal fuera del repositorio: esbuild ya instalado produjo un HTML de 2.953.784 bytes, con JS/CSS/fuentes/WASM integrados. Chromium 156 con red deshabilitada ejecutó ese contenido inline en about:blank: WebGL/Rapier, movimiento y teléfono, con cero solicitudes HTTP(S) y cero excepciones. La navegación file:// fue bloqueada por una política administrativa del navegador del entorno; no se considera validada la apertura por doble clic. Informe temporal: `/tmp/viceblock-offline-spike/report.json`.

El usuario amplió la planificación con conversaciones, objetivos/objetos de NPC desde el inicio, robo de coches, nueve tiendas con clientes/consumo y POV de un testigo que puede morir mientras graba. Se detallan en ROADMAP.md, incluyendo conservación solo de segmentos capturados/enviados y contratos para historia/cinemáticas futuras, expresamente aplazadas. El LLM móvil se revisó con fuentes oficiales: viable de forma condicional, propuesto como redactor opcional; la base será diálogo contextual sin modelo. No hay inferencia ni mediciones en móvil, dependencias nuevas o cambios de gameplay por esta revisión.

## Primera implementación autorizada: portable 0.3.1

`jugar/index.html` ya es un entregable generado dentro del proyecto, no un experimento en /tmp. `scripts/build-portable.mjs` usa Vite existente, integra JS/CSS/fuentes/WASM/licencias y comprueba versión, imports, assets y sintaxis clásica. `build` produce web y portable; `build:portable` solo portable; `check:portable` exige igualdad sin escribir. CI verifica vigencia y adjunta el HTML. Detalles y diseño del futuro guardado por archivo: [PORTABLE.md](PORTABLE.md).

La prueba portable inline offline en Chromium 156/SwiftShader pasó: escritorio 960×640, táctil 390×844, compras ($120→$112), arma/recarga, teléfono, reinicio, noche, fuentes y AudioContext activo tras clic/suspendido al pausar; cero solicitudes HTTP(S), cero excepciones. Reporte `/tmp/viceblock-031-portable/report.json`. Inspeccionadas las capturas entry.png, traffic.png y mobile.png, conservando la presentación elegida. La apertura file:// real se intentó y fue bloqueada por `ERR_BLOCKED_BY_ADMINISTRATOR`; no se acredita doble clic. La fase 1 conserva ese punto pendiente.

Verificación 0.3.1: `npm run typecheck` (dentro de build), `npm test` (20/20 en cinco archivos), `npm run build` (web y portable) y `npm run check:portable` aprobados. Recompilación idéntica, 2.962.673 bytes. Smoke web también aprobado en los dos tamaños; reporte `/tmp/viceblock-031-web/report.json`. Intento file:// fallido registrado en `/tmp/viceblock-031-file/report.json`. No se midió FPS en GPU física ni se verificó audio por escucha.

## Publicación del HTML solicitada el 2026-11-21

Base sincronizada desde `main` en `765bc51`, con Mercado Palma 0.3.1. El index raíz permite acceder al portable mediante **Abrir juego sin conexión** y README enlaza el ZIP de main. HTML regenerado de 2.962.864 bytes, con SHA-256 y resultados en [PORTABLE.md](PORTABLE.md). Tipos, 20 pruebas, ambas compilaciones y comprobación reproducible aprobados. Smoke portable inline offline aprobado en escritorio y táctil, sin solicitudes HTTP(S) ni excepciones. Se reprodujo el bloqueo administrativo de file://.
