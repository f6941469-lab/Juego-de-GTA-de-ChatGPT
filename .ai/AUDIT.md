> Documento histórico de la entrega `work@5660edc`, basada en `2ee553f`. La integración en `main` usa `src/simulation/engine.ts` y los sistemas de `.ai/systems/`; los módulos de prototipo descritos aquí fueron sustituidos por esos contratos, no ejecutados en paralelo.

# Auditoría de rescate — 2026-11-20

Referencia: `2ee553f` (`feat: entregar el distrito jugable de Viceblock`). Checkout limpio antes de intervenir. No existía `.ai/`; se consultaron AGENTS.md, PROJECT_STATE.md, TASKS.md, ARCHITECTURE.md y KNOWN_ISSUES.md.

| Gravedad | Hallazgo comprobado | Impacto / dependencia | Intervención |
| --- | --- | --- | --- |
| P1 | Solo existían exploración, distrito, avatar, iluminación y menús (`src/main.ts`, PROJECT_STATE.md). No había código de NPC, vehículos, comercio, armas, policía, teléfono o destrucción. | No era posible jugar la experiencia integrada solicitada. Son ausencias, no implementaciones anteriores que se hayan verificado defectuosas. | Incorporar una escena local Mercado Palma con alcance explícito en CURRENT_STATE. |
| P1 | `createCharacterCollider.move()` llamaba a `world.step()`. | Añadir un segundo personaje habría adelantado toda la física una segunda vez en el mismo tick. | Separar preparación, avance único de Physics y lectura de poses. Prueba de dos cápsulas. |
| P2 | `src/core/input.ts` asignaba flechas a movimiento. | Conflicto directo con navegación del teléfono. | WASD para caminar; flechas para menús; contexts world/phone/shop. |
| P2 | Blur/visibility limpiaban teclas pero no pausaban. | La simulación habría seguido exponiendo al jugador a incidentes sin foco. | Pausa y limpieza de botones, ratón y táctil. |
| P2 | El render animaba el avatar durante la pausa. | Los estados visuales y físicos avanzaban de forma distinta. | dt de animación cero al pausar; restablecer acumulador al continuar. |
| P2 | `createFollowCamera.yaw` devolvía el destino mientras la imagen interpolaba otro rumbo. | Movimiento relativo a una orientación distinta de la que veía el jugador durante un giro. | Usar el rumbo interpolado. |
| P2 | `FrameStats` imprimía un personaje y contaba solo cajas iniciales. | Diagnóstico incorrecto tras ampliar la escena. | Número real de actores/colisionadores y tiempo CPU de simulación. |
| P1 | Chromium confirmó que mantener botón derecho impedía recibir pointerdown del izquierdo, y setPointerCapture bajo pointer lock lanzaba InvalidStateError en la nueva integración. | Disparar mientras se apunta fallaba aunque el arma pasaba sus pruebas de estado. | Corregido con mousedown/mouseup por botón y captura solo para touch; regresión automatizada y repetición gráfica. |
| P2 | La cámara encontraba cápsulas de peatones y el suelo nuevo de tienda era solo visual. | Zoom brusco al cruzar un peatón; pies por debajo del suelo visible. | Ignorar cápsulas solo en barrido de cámara, atenuar actores cercanos y añadir collider de suelo. Pruebas de cámara/acceso y revisión visual. |
| P2 | Cada bloque del avatar era una malla separada. | Coste creciente al añadir población. | Instancias por articulación; conservar articulaciones y animaciones originales. |

Base verificada antes de editar: tipos y ocho pruebas originales aprobadas. Se conservaron Three.js, Rapier, generación determinista, barrio, perfiles, cielo, minimapa y controles táctiles.

No se encontraron implementaciones de replays, persecución en vehículos o destrucción de edificios que pudieran auditarse. No se atribuyen errores a código inexistente. El rendimiento de GPU física y las variantes avanzadas permanecen sin comprobar.
