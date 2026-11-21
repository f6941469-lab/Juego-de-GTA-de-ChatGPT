# Contexto activo — Viceblock 0.5.0

El usuario sustituyó explícitamente el sistema anterior por Mercado Palma, publicada originalmente en work@5660edc. Mantener su HUD, minimapa compacto y teléfono verde. No restaurar el antiguo SimulationEngine ni conducción/distritos descartados.

TypeScript/Vite/Three.js/Rapier/Web Audio, sin nuevas dependencias. `src/main.ts` usa Session, dueña de un único paso físico a 60 Hz; el render interpola. WebGPURenderer con compatibilidad WebGL 2 y shaders TSL, límites de píxeles y sombras. La aceptación WebGPU en hardware utilizable sigue pendiente; ver RENDERING.md.

La base funcional de fase 2 está entregada: WorldState con IDs y zonas, jerarquía peatonal y cambios locales, reservas, diez civiles y tráfico por destinos sobre 25 cruces/80 carriles. Las decisiones civiles tienen cuota de cuatro por tick y las rutas de dos búsquedas de 8192 visitas. Los actores lejanos continúan físicamente aunque se oculten. No existe streaming físico ni guardado de partida. El incidente alejado se verifica a través de Session y del arma real.

`npm run build` genera web, `jugar/index.html` y `publicar/viceblock-itch.zip`, que contiene un único index compilado en la raíz. El usuario confirmó el funcionamiento en itch.io de 0.4.1; preservar esa entrega. `check:portable` y `check:itch` comprueban reproducibilidad. El ZIP se prueba en iframe de otro origen; file:// continúa bloqueado por la política del navegador de este entorno.

Consultar CURRENT_STATE.md, HANDOFF.md, SIMULATION.md y NAVIGATION.md. Las suites activas son 32 pruebas en siete archivos. La siguiente fase es vida civil y diálogo contextual; conducción/robo, nueve tiendas, policía avanzada y replay siguen en ROADMAP.md. Las carpetas systems/ y architecture/ están archivadas.
