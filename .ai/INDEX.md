# Memoria activa — Mercado Palma 0.3.0

1. [CURRENT_STATE.md](CURRENT_STATE.md): sistema activo, sustitución autorizada y verificaciones actuales.
2. [HANDOFF.md](HANDOFF.md): continuación, publicación y ejecución de la versión correcta.
3. [SIMULATION.md](SIMULATION.md): contratos de Session, física, actores, tienda, armas, testigos, policía, teléfono y tráfico.
4. [CONTEXT.md](CONTEXT.md): contexto mínimo y tecnología.
5. [KNOWN_ISSUES.md](KNOWN_ISSUES.md), [../KNOWN_ISSUES.md](../KNOWN_ISSUES.md): alcance parcial y limitaciones.
6. [DECISIONS.md](DECISIONS.md), [CHANGELOG.md](CHANGELOG.md): decisiones y cambios, con historial preservado.
7. [tasks/BACKLOG.md](tasks/BACKLOG.md): siguiente trabajo del runtime actual.

`src/main.ts` usa `createSession` desde `src/simulation/session.ts`; la interfaz es `src/ui/gameplay.ts` y el distrito se genera con `src/world/district.ts`.

## Historial archivado

- [archive/INTEGRACION-D565CDC.md](archive/INTEGRACION-D565CDC.md): integración anterior que el usuario pidió sustituir.
- Los documentos de `architecture/`, `systems/` y `audits/` describen el sistema anterior y están marcados como históricos. Sus rutas de código pueden haber dejado de existir en el árbol activo.
- [AUDIT.md](AUDIT.md): diagnóstico original del checkout 2ee553f que dio lugar a la entrega Mercado Palma.

No combinar de nuevo los dos sistemas ni restaurar el HUD anterior al publicar: el propietario pidió explícitamente el reemplazo completo por la primera captura.
