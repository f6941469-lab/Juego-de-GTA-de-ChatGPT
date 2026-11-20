# Decisiones técnicas

## Three.js y Rapier se integran en el navegador

Three.js dibuja la escena y Rapier calcula las colisiones del personaje. Vite empaqueta el código y sus dependencias, lo que permite servir el juego como archivos estáticos sin un servicio de simulación.

## La simulación y el render avanzan por separado

La física usa un paso fijo para conservar una respuesta estable ante cambios de frecuencia de imagen. La cámara y las poses interpoladas se dibujan con la cadencia del navegador.

## El distrito se genera a partir de una semilla

Una semilla reproduce el trazado y las variaciones, lo que permite diagnosticar un lugar concreto y ampliar el mapa por zonas. Los puntos de interés diseñados a mano orientan al jugador dentro del distrito.

## Los perfiles comparten dirección artística

Las configuraciones Baja, Media, Alta y Ultra ajustan el coste gráfico. La iluminación, las siluetas y el trazado del distrito deben seguir siendo legibles en cualquier perfil.

## Los módulos nuevos nacen con una responsabilidad concreta

La arquitectura se organiza por subsistema conforme se incorpora su implementación. Las entidades, los eventos y las abstracciones compartidas se extraerán cuando haya varios consumidores con requisitos comunes.

## La primera integración usa la base existente y un bloque activo

La auditoría de `2ee553f` encontró los sistemas avanzados ausentes. Se conserva Three.js/Rapier y la ciudad determinista; solo el lote `3:3:1` se convierte en interior. Una rejilla local derivada de colisiones y un circuito cinemático permiten verificar comercio, peatones, incidentes y tráfico antes de introducir navegación de toda la ciudad o conducción. No se añadieron dependencias.

## La física tiene un único dueño por tick

Mover una cápsula ya no avanza el mundo. Session prepara todos los cuerpos, ejecuta un solo paso de Rapier y sincroniza las poses. Se conserva el wrapper de jugador para compatibilidad con los escenarios de un personaje y sus pruebas.

## La información policial y social procede de evidencia

Los testigos filtran por alcance, campo visual, oclusión y tiempos; la policía usa avisos y visión directa. La ubicación real no se usa como destino cuando el sospechoso no es observado. Los testimonios conservan el evento original; se presenta la grabación como no disponible hasta contar con replay independiente y acotado.

## Sustituir íntegramente la integración anterior

El usuario comparó las capturas y pidió explícitamente cambiar todo el sistema anterior por la versión creada en work. Se restaura el código operativo de `5660edc` (distrito, generación, Session, física, controles, UI, teléfono, audio y sus pruebas) y se retiran los módulos anteriores del árbol activo. Se publica como 0.3.0 mediante un commit normal sobre main; d565cdc y el código previo permanecen en el historial. Esta decisión sustituye la integración semántica anterior.
