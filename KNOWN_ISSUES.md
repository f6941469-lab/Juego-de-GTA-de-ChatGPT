# Limitaciones conocidas

La entrega 0.4.0 inicia la fase 2. La navegación global y el registro por zonas tienen cuotas. Quedan por ampliar la red vial, las actividades civiles de otras zonas y la navegación jerárquica. El historial acotado prepara la futura reproducción. La prueba WebGPU de Dawn/SwiftShader falla también al dibujar un triángulo independiente. Quedan pendientes la aceptación de ese backend y las mediciones de rendimiento en hardware físico.

- La entrega 0.3.1 incorpora un HTML autocontenido en `jugar/index.html`. Falta validar su apertura directa por `file://`: la política del Chromium administrado devuelve `ERR_BLOCKED_BY_ADMINISTRATOR`. Las pruebas inline con red desactivada se registran aparte y no sustituyen esa aceptación. Soporte de archivos locales en móviles físicos pendiente.

- El distrito tiene límites fijos y se carga completo al iniciar. Solo Mercado Palma tiene un interior accesible. Sectores activos y niveles de detalle quedan pendientes.
- El recorrido del jugador sigue siendo a pie. Hay tres coches autónomos en un circuito local y dos policías a pie; faltan conducción, asientos transferibles, rutas/destinos generales, persecuciones en patrulla, refuerzos y combate policial.
- Navegación y percepción de los seis agentes se concentran en el bloque del mercado. Hay destinos y recuperación de bloqueos, pero no un sistema de multitudes ni entrada a otros edificios. Incapacitados y productos agotados se restablecen al reiniciar la escena.
- El cliente recorre productos/mostrador sin transacciones económicas propias. Las poses de recarga, extracción de arma y uso de teléfono todavía necesitan animaciones específicas.
- El teléfono conserva hasta 16 testimonios de acontecimientos observados. No existen videos/replay ni guardado de partida. El estado de grabación no disponible se muestra explícitamente.
- Solo se destruyen los dos escaparates: se elimina cristal y collider; los zócalos permanecen sólidos. No hay materiales con daño progresivo, muebles móviles ni destrucción estructural. Los fragmentos son visuales y expiran.
- Las detenciones y salud cero reinician la escena con $30 de gastos. No hay sistema de hospital, cárcel o persistencia económica entre escenas.
- Audio sintetizado sin recursos externos: faltan voces humanas, ambiente urbano elaborado y validación auditiva en hardware real. La señal policial es una indicación de alerta; todavía no hay vehículo policial que emita una sirena espacial.
- La iluminación emplea aproximaciones apropiadas para un navegador. La oclusión ambiental de pantalla (SSAO), el bloom selectivo y los efectos volumétricos siguen en la hoja de ruta.
- Los navegadores necesitan WebGL 2 para dibujar el juego y una interacción del usuario para capturar el puntero. Algunos entornos embebidos restringen la captura.
- El objetivo de 60 FPS requiere mediciones en equipos representativos. Los datos de depuración sirven para comparar perfiles y detectar escenas costosas.

- La comprobación gráfica en Chromium con SwiftShader permite validar flujos, pero presenta pausas y baja frecuencia de imagen en software. No acredita fluidez ni 60 FPS en GPU física. Los datos CPU del HUD no miden el tiempo GPU.

- La auditoría de dependencias de producción terminó limpia. La auditoría completa reporta un aviso de picomatch en dependencias transitivas de las herramientas de desarrollo (GHSA-fc5q-39xc-vjpf).
