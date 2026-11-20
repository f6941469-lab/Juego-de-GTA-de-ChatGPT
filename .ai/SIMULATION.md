> Documento histórico de la entrega `work@5660edc`, basada en `2ee553f`. La integración en `main` usa `src/simulation/engine.ts` y los sistemas de `.ai/systems/`; los módulos de prototipo descritos aquí fueron sustituidos por esos contratos, no ejecutados en paralelo.

# Contratos de la escena Mercado Palma

## Tiempo y física

`createSession.step()` es el dueño del tick integrado: jugador.prepareStep → decisiones de civiles/policía → preparar actores/tráfico → Physics.step una vez → finish de todas las poses → armas/incidentes/feedback. `player.step()` conserva un wrapper para pruebas y uso con un único personaje. No combinar el wrapper con el tick de Session.

Rapier mantiene autoridad para cuerpos, rayos, colisiones y obstrucciones de cámara. Cada actor conserva posición anterior/actual; el render interpola sin adelantar la física. Pausar detiene reloj, decisiones, munición, partículas y animaciones. Abrir teléfono/tienda bloquea entradas del jugador, pero el barrio sigue simulándose.

## Escena y navegación

La tienda sustituye exclusivamente el lote procedural `3:3:1`. Club Neón y los demás hitos permanecen. Entrada al sur; puerta central abierta, sin teleport. `shop.ts` es la fuente de posiciones de entrada, productos, mostrador y comerciante. Las paredes, techo, mostrador y estantes son cajas independientes. Los dos escaparates pertenecen a Feedback.

Navigation es una rejilla A* local de celdas de 0,6 m (X −7..36,2; Z 13..60,4), inflada para cápsulas y derivada de cajas que afectan a peatones. No representa navegación de toda la ciudad. La destrucción reconstruye esta pequeña rejilla. El zócalo de un escaparate roto continúa siendo sólido; quitar cristal no inventa una puerta a nivel de suelo.

Actor comparte controlador, ruta, giro interpolado, salud y pose. Los civiles tienen rutinas con destinos, esperas y recuperación. El comerciante vuelve a su puesto. Los bloqueos tienen reintento y cambio de etapa; no hay rutas aleatorias. Agentes incapacitados permanecen en el suelo con colisión deshabilitada hasta reiniciar la escena.

## Eventos y percepción

Journal conserva 96 eventos y 16 testimonios como máximo. Las posiciones se copian al emitir; el feed conserva el evento observado, autor y tiempo. No hay videos genéricos ni un botón de reproducción ficticio: `recording: unavailable` se presenta como grabación no disponible.

Los civiles aplican alcance, campo visual, rayos y demora de reacción. Disparos, roturas y colisiones pueden oírse a menor distancia tras obstáculos. Identificación y ubicación del incidente viajan con el aviso. Huir/llamar/testimoniar depende del perfil. Una pistola visible puede causar nervios sin generar por sí sola una denuncia. Las denuncias requieren amenaza/disparo/incidente percibido.

La policía patrulla con dos agentes existentes. Un aviso o la observación directa activa respuesta a la ubicación del evento. Solo actualiza la última posición conocida si tiene visión del sospechoso; ambos agentes comparten esa observación. Perder visión lleva a búsqueda con tiempo límite y regreso a patrulla. No existen patrullas conducibles, disparos policiales, coberturas o refuerzos en esta entrega.

## Comercio, armas y destrucción

Economy valida ID de catálogo, existencias y dinero antes de modificar valores enteros. Session vuelve a comprobar distancia, línea de visión, arma guardada y disponibilidad del comerciante en cada compra. El inventario vive en simulación. El teléfono permite usar comida y trasladar cajas de munición a la reserva.

Weapon controla cargador 8, reserva inicial 24, intervalo 0,26 s y recarga 1,3 s. Guardar cancela recarga. El rayo de cámara determina intención y otro desde la boca del arma impide disparar a través de un obstáculo cercano. El primer collider real recibe el impacto; las cápsulas de actores y los cristales comparten esta ruta. El propio jugador queda excluido.

Apuntar de forma continua a la cápsula del comerciante inicia reconocimiento a los 0,7 s y entrega del dinero a los 3 s. Perder el objetivo interrumpe el progreso. El efectivo procede de la caja; una caja vacía no duplica dinero. Amenaza y asalto producen eventos independientes que reciben los demás sistemas.

Romper cristal oculta la malla, elimina su collider y actualiza navegación. Pool compartido de 36 trazadores/destellos/fragmentos; los fragmentos son decorativos, tienen gravedad y expiran. No se presenta daño de otros materiales ni edificios como implementado.

## Tráfico, sonido y recursos

Tres coches con conductor visible y asiento ocupado recorren un circuito de carril con curvas entre avenidas 0/28 y calles 7/45. Aceleran/frenan, respetan fases compartidas y hacen barridos de caja contra peatones, coches y geometría. Los neumáticos descansan en Y=0; collider y barrido comparten un desplazamiento vertical que cubre la carrocería. Son cuerpos cinemáticos con una caja de colisión aproximada, no una simulación de neumáticos o suspensión. El jugador no puede conducirlos. Las luces de semáforo pertenecen al mismo reloj de tráfico; la geometría estática queda apagada.

Web Audio genera sonidos originales: pasos del jugador, motores, disparos, recarga, rotura, compras, impactos, avisos y señal de respuesta policial. Máximo ocho voces puntuales y cuatro osciladores continuos; atenuación por distancia y deduplicación. No hay voces humanas ni grabaciones ambientales. El mute está en el teléfono. El contexto se desbloquea al jugar y se suspende en pausa.

Dispose libera controladores/cuerpos, mallas de instancias, geometrías, materiales, texturas, luz interior y audio. Los listeners nuevos usan AbortController. Pagehide cancela RAF/ResizeObserver y libera la escena. El reinicio reconstruye exclusivamente cristales eliminados y devuelve las entidades a sus puntos iniciales. Detención o salud cero reinician explícitamente la escena con $30 de gastos; no existe persistencia de partida.
