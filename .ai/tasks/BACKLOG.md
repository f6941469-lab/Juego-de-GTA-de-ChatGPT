# Trabajo pendiente — Mercado Palma 0.4.0

- Validar `jugar/index.html` mediante apertura real file:// sin conexión en un navegador que permita archivos locales. El Chromium administrado lo bloquea; no sustituir esta aceptación por la prueba inline. Ver [../PORTABLE.md](../PORTABLE.md).
- Completar la fase 2 de [../../ROADMAP.md](../../ROADMAP.md): navegación jerárquica/vial, reservas, actualización local y actividades de otras zonas sobre los IDs, zonas e historial incorporados; los eventos prepararán también replay y futura narrativa.

- Medir fluidez y memoria con GPU física; no usar SwiftShader como benchmark de hardware.
- Profundizar navegación/colas y ampliar zonas de simulación antes de aumentar población.
- Incorporar conducción y entrada/salida progresivamente sobre el nuevo runtime cuando se solicite.
- Implementar replay real acotado antes de habilitar video.
- Escuchar y ajustar las señales de audio en hardware real.

El sistema anterior y sus tareas permanecen en el historial hasta d565cdc.
