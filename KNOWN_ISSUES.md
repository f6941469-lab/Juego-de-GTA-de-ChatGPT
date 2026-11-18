# Limitaciones conocidas

- La primera versión cubre un distrito con límites fijos que se carga completo al iniciar. Los edificios se exploran desde el exterior. Los sectores activos y los niveles de detalle quedan para la expansión del mapa.
- El recorrido se hace a pie. La conducción, la simulación del tráfico, la IA policial, el audio y las partidas guardadas corresponden a fases posteriores.
- La iluminación emplea aproximaciones apropiadas para un navegador. La oclusión ambiental de pantalla (SSAO), el bloom selectivo y los efectos volumétricos siguen en la hoja de ruta.
- Los navegadores necesitan WebGL 2 para dibujar el juego y una interacción del usuario para capturar el puntero. Algunos entornos embebidos restringen la captura.
- El objetivo de 60 FPS requiere mediciones en equipos representativos. Los datos de depuración sirven para comparar perfiles y detectar escenas costosas.

- La auditoría de dependencias de producción terminó limpia. La auditoría completa reporta un aviso de picomatch en dependencias transitivas de las herramientas de desarrollo (GHSA-fc5q-39xc-vjpf).
