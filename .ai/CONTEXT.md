# Contexto activo — Viceblock 0.5.0

El usuario sustituyó explícitamente el sistema anterior por Mercado Palma, publicada originalmente en work@5660edc. Mantener su HUD, minimapa compacto y teléfono verde. No restaurar el antiguo SimulationEngine ni conducción/distritos descartados.

TypeScript/Vite/Three.js/Rapier/Web Audio, sin nuevas dependencias. `src/main.ts` usa `Session`, dueña de un único paso físico a 60 Hz; el render interpola. `WebGPURenderer` con compatibilidad WebGL 2, sectores espaciales de `48 m`, lotes `core`/`detail` con histéresis, geometría de avatar compartida y un único `PointLight` interior agrupado. La aceptación WebGPU en hardware utilizable sigue pendiente; ver [RENDERING.md](RENDERING.md).

Fases 2–8 implementadas sobre todo el distrito: `WorldState` (límite 256 entidades), `Navigation` jerárquica + cambios locales (18 escaparates + 9 props), 9 tiendas transitables reales con economías y cajas independientes, vida civil con `21` civiles (`allPeople`, incluyendo `Pedro` con rutinas, transporte público, conversación contextual en español, detección de acoso y eventos NPC-vs-NPC acotados), conducción y robo con `F`, autobús (`4` paradas), metro lanzadera (`Metro Sur`/`Metro Norte`), `2` coches patrulla con desembarco/barricadas/respuesta armada y grabación POV multiángulo con envío progresivo y replay 3D aislado.

`npm run build` genera `dist/`, `jugar/index.html` y `publicar/viceblock-itch.zip` (único `index.html` compilado). `check:portable` y `check:itch` comprueban reproducibilidad byte a byte. En Chrome 158 (WebGL 2 SwiftShader) pasaron `dist/`, `jugar/index.html` vía `file://` offline y el ZIP en iframe móvil `390×844`. Queda pendiente de Fase 9 el guardado/carga por archivo JSON y el perfilado en GPU/móvil físico.

Consultar [CURRENT_STATE.md](CURRENT_STATE.md), [HANDOFF.md](HANDOFF.md), [SIMULATION.md](SIMULATION.md) y [NAVIGATION.md](NAVIGATION.md). Las suites activas son 37 pruebas en 8 archivos. Las carpetas `systems/` y `architecture/` están archivadas.
