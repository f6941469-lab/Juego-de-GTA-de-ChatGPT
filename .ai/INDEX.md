# Memoria activa — Mercado Palma 0.4.1

1. [CURRENT_STATE.md](CURRENT_STATE.md): sistema activo, sustitución autorizada y verificaciones actuales.
2. [HANDOFF.md](HANDOFF.md): continuación, publicación y ejecución de la versión correcta.
3. [SIMULATION.md](SIMULATION.md): contratos de Session, física, actores, tienda, armas, testigos, policía, teléfono y tráfico.
4. [CONTEXT.md](CONTEXT.md): contexto mínimo y tecnología.
5. [KNOWN_ISSUES.md](KNOWN_ISSUES.md), [../KNOWN_ISSUES.md](../KNOWN_ISSUES.md): alcance parcial y limitaciones.
6. [DECISIONS.md](DECISIONS.md), [CHANGELOG.md](CHANGELOG.md): decisiones y cambios, con historial preservado.
7. [../ROADMAP.md](../ROADMAP.md): plan global, HTML portable, nueve tiendas, conversaciones/LLM móvil, robo de coches, POV y puntos de extensión para narrativa futura.
8. [tasks/BACKLOG.md](tasks/BACKLOG.md): siguiente trabajo del runtime actual.
9. [PORTABLE.md](PORTABLE.md): empaquetado reproducible, HTML jugable, pruebas sin red y diseño del archivo de partida.

`src/main.ts` usa `createSession` desde `src/simulation/session.ts`; la interfaz es `src/ui/gameplay.ts` y el distrito se genera con `src/world/district.ts`.

10. [RENDERING.md](RENDERING.md) describe el backend WebGPU/WebGL 2, los shaders TSL y los presupuestos activos de la entrega 0.4.0.

11. [ITCH.md](ITCH.md) describe el ZIP de publicación, la configuración de carga y la prueba del juego en un iframe de otro origen.

## Historial archivado

- [archive/INTEGRACION-D565CDC.md](archive/INTEGRACION-D565CDC.md): integración anterior que el usuario pidió sustituir.
- Los documentos de `architecture/`, `systems/` y `audits/` describen el sistema anterior y están marcados como históricos. Sus rutas de código pueden haber dejado de existir en el árbol activo.
- [AUDIT.md](AUDIT.md): diagnóstico original del checkout 2ee553f que dio lugar a la entrega Mercado Palma.

No combinar de nuevo los dos sistemas ni restaurar el HUD anterior al publicar: el propietario pidió explícitamente el reemplazo completo por la primera captura.
