# Limitaciones conocidas

La entrega 0.5.0 completa la base funcional de la fase 2: navegación jerárquica, cambios locales, residentes alejados y red vial con destinos. El historial prepara la futura reproducción. La prueba WebGPU de Dawn/SwiftShader falla también con un triángulo independiente; quedan pendientes su aceptación y las mediciones en GPU física.

- La entrega 0.3.1 incorpora un HTML autocontenido en `jugar/index.html`. Falta validar su apertura directa por `file://`: la política del Chromium administrado devuelve `ERR_BLOCKED_BY_ADMINISTRATOR`. Las pruebas inline con red desactivada se registran aparte y no sustituyen esa aceptación. Soporte de archivos locales en móviles físicos pendiente.

- El distrito tiene límites fijos y se carga completo al iniciar. Solo Mercado Palma tiene un interior accesible. Sectores activos y niveles de detalle quedan pendientes.
- El recorrido del jugador sigue siendo a pie. Hay tres coches autónomos sobre 25 cruces/80 carriles y dos policías a pie; faltan conducción del jugador, asientos transferibles, aparcamiento, persecuciones en patrulla, refuerzos y combate policial. Las reservas ocupan el cruce completo; no se han validado multitudes ni tráfico denso.
- Los diez civiles tienen rutas y percepción compartidas, incluidos seis vecinos de otros barrios. Faltan horarios, objetos, conversación y un sistema de multitudes. Los cuerpos siguen residentes aunque el render distante se oculte; no hay streaming físico ni entrada a otros edificios. Incapacitados y productos agotados se restablecen al reiniciar la escena.
- El cliente recorre productos/mostrador sin transacciones económicas propias. Las poses de recarga, extracción de arma y uso de teléfono todavía necesitan animaciones específicas.
- El teléfono conserva hasta 16 testimonios de acontecimientos observados. No existen videos/replay ni guardado de partida. El estado de grabación no disponible se muestra explícitamente.
- Solo se destruyen los dos escaparates: se elimina cristal y collider; los zócalos permanecen sólidos. No hay materiales con daño progresivo, muebles móviles ni destrucción estructural. Los fragmentos son visuales y expiran.
- Las detenciones y salud cero reinician la escena con $30 de gastos. No hay sistema de hospital, cárcel o persistencia económica entre escenas.
- Audio sintetizado sin recursos externos: faltan voces humanas, ambiente urbano elaborado y validación auditiva en hardware real. La señal policial es una indicación de alerta; todavía no hay vehículo policial que emita una sirena espacial.
- La iluminación emplea aproximaciones apropiadas para un navegador. La oclusión ambiental de pantalla (SSAO), el bloom selectivo y los efectos volumétricos siguen en la hoja de ruta.
- Los navegadores necesitan WebGPU o WebGL 2 para dibujar el juego y una interacción del usuario para capturar el puntero. Algunos entornos embebidos restringen la captura.
- El objetivo de 60 FPS requiere mediciones en equipos representativos. Los datos de depuración sirven para comparar perfiles y detectar escenas costosas.

- La comprobación gráfica en Chromium con SwiftShader permite validar flujos, pero presenta pausas y baja frecuencia de imagen en software. No acredita fluidez ni 60 FPS en GPU física. Los datos CPU del HUD no miden el tiempo GPU.

- La auditoría de dependencias de producción terminó limpia. La auditoría completa reporta un aviso de picomatch en dependencias transitivas de las herramientas de desarrollo (GHSA-fc5q-39xc-vjpf).
