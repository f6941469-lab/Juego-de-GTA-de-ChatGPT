# Continuación de Mercado Palma

## Recuperación mínima

1. Leer AGENTS.md, INDEX.md y CURRENT_STATE.md; comprobar `git status` y HEAD antes de editar.
2. No crear commits/push ni limpiar los cambios de esta intervención sin instrucción del usuario.
3. Consultar SIMULATION.md solo para el subsistema afectado. AUDIT.md conserva el diagnóstico de la referencia.

## Verificación reproducible

Desde la raíz del proyecto, Node 24:

```sh
npm run typecheck
npm test
npm run build
npm run preview -- --port 4173
```

Con Playwright instalado como herramienta externa (el juego no depende de él):

```sh
VICEBLOCK_PLAYWRIGHT=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright VICEBLOCK_CHROMIUM=/usr/bin/chromium node tests/browser-smoke.mjs
```

Se puede cambiar VICEBLOCK_URL y VICEBLOCK_ARTIFACT_DIR. Sin variables de ejecutable/módulo usa la instalación convencional de Playwright. El script fuerza SwiftShader: sirve para regresiones de interfaz, no para benchmark de GPU. Genera `/tmp/viceblock-smoke/report.json`, `desktop.png`, `night.png`, `mobile.png` y cierra el navegador incluso si falla.

Recorrido manual: entrar a Mercado Palma por la abertura central; ir al mostrador a la derecha; E y Enter compra agua; ↑→Mochila permite usar productos; 1 equipa; ratón derecho + izquierdo apunta/dispara; R recarga. Mantener mira sobre Mara 3 s entrega la caja y activa testigos/policía. Disparar a escaparate lateral elimina cristal y colisión; el zócalo permanece. F3 muestra cifras reales de simulación. Escape en teléfono vuelve/cierra; fuera de los paneles pausa. El reinicio de pausa restaura la escena, no solo la posición.

Las pruebas de Vitest verifican asalto, denuncia/testimonio, búsqueda sin seguimiento de un jugador no visto, rotura/restauración y frenado sin depender de coordenadas de pantalla. El smoke de navegador comprueba entradas físicas y presentación; no automatiza todavía apuntar a Mara/cristal mediante ratón ni la detención completa.

## Próxima intervención prioritaria

1. Medir frame GPU/CPU con GPU física y revisar ciudad instanciada/culling antes de prometer fluidez. SwiftShader fue lento; no convertirlo en una cifra de rendimiento de hardware real. Validar por escucha los sonidos sintetizados.
2. Probar escenarios prolongados de multitudes/puerta, obstrucciones mutuas, cola al mostrador, salida del bloque y seguimiento policial. La navegación actual es local; ampliar por zonas antes de aumentar población. No reescribir la ciudad para ello.
3. Introducir contrato de vehículo controlable por jugador/IA y entrada/salida validada. Los coches actuales son cinemáticos ocupados; no confundirlos con conducción física terminada.
4. Dar al cliente transacciones/colas propias y mejorar poses de recarga, extracción y teléfono. El sistema económico ya permite validar cada transacción.
5. Replay acotado e independiente antes de habilitar videos; ahora toda publicación dice grabación no disponible. Posteriormente mobiliario/materiales y actualización incremental de navegación.

## Cautelas técnicas concretas

- Nunca llamar `player.step` dentro del tick de Session: duplicaría física. Preparar todos, `physics.step`, sincronizar todos.
- Ratón: usar mousedown/mouseup para botones simultáneos; pointerdown solo se emite al pulsar el primer botón. No hacer setPointerCapture de ratón bajo pointer lock. Tests de entradas cubren el fallo encontrado en Chromium.
- No añadir controles de flechas para caminar: pertenecen al teléfono. Abrir un panel limpia movimiento, salto y botones del ratón.
- No retirar el zócalo al romper cristal ni abrir rutas a través de geometría sólida.
- No sustituir el origen de una denuncia por la posición actual del jugador. La observación policial es la única actualización de la última ubicación conocida.
- Las voces de audio, partículas, eventos y testimonios tienen límites; conservarlos al ampliar sistemas.
