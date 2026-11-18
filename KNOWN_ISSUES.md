# Limitaciones conocidas

- Los distritos comparten un mapa acotado. La geometría se carga por proximidad y los colisionadores de suelos, edificios y fronteras permanecen residentes. Los edificios se exploran desde el exterior.
- El tráfico usa un carril por sentido. El adelantamiento, la gestión prolongada de accidentes y las peticiones de paso para vehículos de emergencia quedan pendientes.
- La búsqueda usa patrullas terrestres. El apoyo aéreo y las unidades especiales con vehículos propios quedan para siguientes versiones.
- El agua y la iluminación usan aproximaciones para navegador. SSAO, bloom selectivo y rayos volumétricos siguen pendientes.
- El rendimiento en equipos físicos y la meta de 60 FPS requieren mediciones por perfil. F3 muestra las medidas locales.
- El juego necesita WebGL 2. En algunos marcos el navegador limita la captura del puntero y permite arrastrar para controlar la cámara.
- La auditoría de dependencias de producción de 0.2.0 terminó sin avisos. La auditoría completa reportó el aviso de picomatch en herramientas de desarrollo (GHSA-fc5q-39xc-vjpf).
