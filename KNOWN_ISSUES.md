# Limitaciones conocidas

Las Fases 2–8 y las optimizaciones de sectores/luces están implementadas en `main`. La prueba WebGPU de Dawn/SwiftShader sigue fallando también con una escena mínima independiente; quedan pendientes su aceptación, las mediciones reales en GPU física y el guardado/carga de Fase 9.

- **Sin guardado en disco (Fase 9):** El estado de sesión (`WorldState`, inventario, daños, clips) se restablece al reiniciar o tras detención/salud cero; exportar/importar archivo JSON sigue pendiente según [.ai/PORTABLE.md](.ai/PORTABLE.md).
- **Alcance de simulación y destrucción:** Los cuerpos de los `25` NPCs totales (`21` civiles + `4` policías) y vehículos siguen residentes (sin streaming físico). Se destruyen `18` escaparates y `9` objetos urbanos (`hydrant`/`crate`), no edificios completos ni daño vehicular estructural progresivo.
- **Diálogo y animaciones:** La conversación usa respuestas contextuales en español sin LLM ni síntesis de voz humana. Algunas transiciones de recarga/arma/teléfono usan poses simplificadas y `tests/browser-smoke.mjs` / `tests/itch-smoke.mjs` con Node requieren instalar externamente el paquete `playwright` (no incluido en `package.json`).
- **Entorno y audio:** En Chrome 158 con servidor HTTP estático local sin favicon se registran 404 de `/favicon.ico` (el HTML portable vía `file://` arranca sin red y con `0` errores). El audio procedural Web Audio no se ha validado por escucha en altavoces reales.
- **Navegadores y rendimiento real:** Los navegadores necesitan WebGPU o WebGL 2 para dibujar el juego y una interacción del usuario para capturar el puntero. La comprobación en Chrome 158 con SwiftShader valida flujos funcionales y reducción geométrica (`237.161` triángulos en `F3` Baja), no 60 FPS en hardware físico.
- **Auditoría npm:** La auditoría de dependencias de producción está limpia; persiste el aviso previo de `picomatch` en dependencias transitivas de desarrollo (`GHSA-fc5q-39xc-vjpf`).
