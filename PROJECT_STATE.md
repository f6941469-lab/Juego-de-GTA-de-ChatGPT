# Estado del proyecto

Viceblock 0.2.0 amplía Costa Palmera en una primera entrega integrada de las ocho fases. La experiencia básica es explorar, conducir, encontrarse con otros vehículos y probar un desafío de búsqueda. Los sistemas se ejecutan en el navegador con el paso fijo de simulación de 60 Hz.

| Sistema | Alcance |
| --- | --- |
| Conducción | Vehículo Rapier, marcha atrás, freno de mano, cámara de seguimiento y salida con comprobación de espacio |
| Tráfico | Grafo de carriles, destinos, rutas, señales, separación y reservas de cruces |
| Búsqueda | Cinco respuestas, visión bloqueada por edificios, última posición vista, búsqueda y descenso progresivo |
| Audio | Motores, sirenas, bocina, pasos, colisiones y ambiente sintetizados con Web Audio |
| Mundo | Barrios conectados, generación determinista, sectores visuales y niveles de detalle |
| Imagen | Perfiles gráficos, resolución adaptativa, sombras de contacto y datos de depuración |

La instalación limpia, la compilación de producción y las 25 pruebas automatizadas pasaron. Las pruebas cubren la conducción, la salida segura y los impactos, el tráfico, la detección y pérdida de contacto, la descarga y recarga de sectores y la resolución adaptativa. La prueba de navegador usa Chromium con WebGL 2 y SwiftShader.

Consulta el historial para ver el alcance de cada versión. [Historial](CHANGELOG.md) · [Limitaciones](KNOWN_ISSUES.md)
