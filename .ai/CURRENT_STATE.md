# Estado actual — Mercado Palma

Fecha: 2026-11-20. Base: `2ee553f`. El usuario autorizó commit y push de esta entrega a `origin/work`; `origin/main` contiene desarrollo posterior a la base y requiere integración independiente. No se añadieron dependencias ni recursos externos; se conserva el distrito existente y sus perfiles.

## Primera experiencia integrada

| Sistema | Implementación observable | Estado / límite |
| --- | --- | --- |
| Jugador | WASD, carrera, salto, colisiones, cámara interpolada, mira y retroceso | Base conservada; paso físico único; cámara ignora cápsulas de peatones y los atenúa al acercarse. Fluidez de GPU física sin validar. |
| Tienda | Puerta central abierta, interior, iluminación, suelo con colisión, estantes, mostrador y compras | Un establecimiento. Validación de distancia, comerciante, arma guardada, fondos, precio y stock; entrega al inventario. |
| Civiles | Comerciante, cliente y dos peatones con destinos, esperas, percepción, reacción, llamada/testimonio, huida y recuperación | Simulación local; cliente recorre productos/mostrador, todavía sin transacciones económicas propias. Sin edificios adicionales o transferencia a vehículos. |
| Tráfico | Tres coches ocupados, curvas, aceleración/frenado, barridos, obstáculos y fases de semáforo | Circuito cinemático; no conducción, suspensión, parking o grafo vial general. |
| Arma y asalto | Equipar/guardar, apuntar/disparar juntos, cargador/reserva, recarga, trayecto cámara→boca→primer collider, daño y feedback | Una pistola. Amenaza sostenida al cajero y dinero real de la caja. Sin sistema completo de armas ni animaciones de extracción/recarga. |
| Policía | Dos agentes que patrullan, reciben avisos, comparten visión, responden, persiguen a pie y buscan última posición conocida | Sin vehículo policial, refuerzos, barricadas o combate. Detención/derrota reinicia explícitamente la escena con $30 de gastos. |
| Teléfono | ↑ abre; flechas/Enter/Esc; mochila, consumibles, audio y testimonios | 16 testimonios de eventos observados; video/replay NO disponible. No hay videos de sustitución. |
| Destrucción | Dos escaparates pierden malla y collider; navegación actualizada; fragmentos con caducidad | Solo cristal. El zócalo sigue sólido. Pool máximo 36 efectos; fragmentos visuales. |
| Audio | Síntesis Web Audio con pasos, motores, disparos, impactos, recarga, roturas y avisos | Voces acotadas; sin recursos grabados ni voces humanas. Escucha humana/hardware pendiente. |

## Evidencia

- `npm run typecheck`: aprobado.
- `npm test`: 20 pruebas aprobadas en cinco archivos. Se conservan las ocho pruebas originales y se cubren paso físico compartido, colisiones de cámara, acceso real a tienda, compra/inventario, bloqueo de controles, munición/recarga, asalto sostenido, daño al collider correcto, avisos/ubicación policial, límites de memoria, cristal/collider/restauración, tráfico, altura de neumáticos sobre la carretera, reinicio de mira/FOV y liberación de cuerpos. Las pruebas de escena usan `gameConfig.seed`.
- `npm run build`: aprobado; compilación de producción sin dependencias nuevas.
- Chromium + SwiftShader, producción, perfil Bajo: recorrido a mostrador, compra de agua ($120→$112), teléfono por teclado, combinación de ratón derecho+izquierdo, consumo de munición, recarga (8/23), pausa/reinicio/continuación. La configuración a las 22:00 conserva el interior iluminado; se comprobó pagehide sin excepciones. Sin excepciones en el flujo después de corregir `pointerdown` y la captura incompatible con pointer lock.
- Emulación 390×844 con eventos táctiles: cruceta mantenida mueve al jugador; teléfono/guía por tap; panel 358 px de ancho dentro del viewport y sin desbordamiento horizontal.
- Se inspeccionaron capturas de entrada/interior, tienda, teléfono, tráfico y móvil. Una comprobación posterior al ajuste de altura de coches recorrió la calle con teclado sin excepciones; los neumáticos se apoyan en el plano de carretera y el test de frenado continúa pasando. `tests/browser-smoke.mjs` guarda reporte y capturas reproducibles; necesita Playwright externo al proyecto y Chromium/WebGL 2.
- `git diff --check`: aprobado en la última compilación. No se ejecutó auditoría npm en esta intervención; el aviso transitivo previo permanece documentado.

La prueba gráfica con software muestra baja frecuencia de imagen (muestras puntuales de 1–3 FPS en el HUD del flujo de 960×640, incluidas transiciones/pausa; no es un benchmark). Los tiempos CPU del HUD no miden el coste GPU. Esta evidencia permite comprobar estados y recorridos, pero NO acredita una experiencia fluida, 60 FPS ni calidad en equipos representativos. Falta medición con GPU física; no se declara terminada la optimización.

Contratos: [SIMULATION.md](SIMULATION.md). Diagnóstico: [AUDIT.md](AUDIT.md). Continuación y procedimiento: [HANDOFF.md](HANDOFF.md).
