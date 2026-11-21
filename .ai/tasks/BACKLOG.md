# Trabajo pendiente — Mercado Palma 0.5.0

La base funcional de la fase 2 está implementada: jerarquía y cambios locales, reservas peatonales/viales, tráfico por destinos, diez civiles y prueba de incidente alejado con continuidad. Contratos en [../SIMULATION.md](../SIMULATION.md) y [../NAVIGATION.md](../NAVIGATION.md).

- Fase 3 de [../../ROADMAP.md](../../ROADMAP.md): objetivos y actividades diferenciados desde el inicio, objetos, horarios y conversación contextual en español. Conservar percepción, memoria y cuotas; sin incorporar LLM todavía.
- Fases 4–5: aparcamiento, transferencias reales de ocupantes, robo y conducción; después nueve tiendas, colas, economía y consumo de NPC. Las reservas actuales son de paso y cruces completos.
- Fases posteriores: destrucción ampliada, policía avanzada y replay POV acotado antes de habilitar video.
- Validar el HTML por file:// en un navegador que permita archivos locales. El Chromium administrado bloquea esa apertura; la prueba del ZIP en iframe tiene otro alcance.
- Validar WebGPU en un dispositivo utilizable y medir fluidez, memoria y temperatura con GPU física. SwiftShader sirve para comprobar flujos.
- Escuchar y ajustar audio en hardware real. Guardar/Cargar sigue pendiente; el estado por zonas es de la sesión, sin persistencia en disco.

El sistema anterior y sus tareas permanecen en el historial hasta d565cdc.
