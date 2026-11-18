# Estado del proyecto

La primera entrega integra las fases 0 y 1. Costa Palmera se recorre a pie desde el bulevar central hasta el paseo marítimo. Incluye un personaje cúbico en tercera persona, geometría urbana procedural, vegetación tropical, cielo dinámico e iluminación configurable.

| Área | Alcance |
| --- | --- |
| Desarrollo | Vite, TypeScript, dependencias fijadas y pruebas con Vitest |
| Simulación | Entradas de movimiento, carrera y salto, física Rapier y colisiones estáticas |
| Imagen | Three.js con WebGL 2, sombras dinámicas, tone mapping ACES y cielo en GLSL |
| Interfaz | Pantalla inicial, minimapa, pausa, perfiles gráficos y datos de depuración |

Se verificó una instalación limpia con el lockfile, la comprobación de tipos y la compilación de producción. Vitest ejecutó ocho pruebas del bucle fijo, la generación del distrito y las colisiones, la cámara y el movimiento del personaje.

En Chromium con WebGL 2 y SwiftShader se comprobó la compilación de producción. Se probó entrar, mover y saltar con teclado, capturar el puntero, pausar y continuar, cambiar a las 22:00 y conservar el perfil gráfico al recargar. Una vista táctil emulada de 390 × 844 permitió mover al personaje con la cruceta. Las capturas sirvieron para revisar el encuadre y el contraste. El objetivo de 60 FPS queda pendiente de pruebas con GPU física.

La siguiente fase incorpora el primer vehículo conducible y su interacción con el personaje. [Hoja de ruta](ROADMAP.md)
