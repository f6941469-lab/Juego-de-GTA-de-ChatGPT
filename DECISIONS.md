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
