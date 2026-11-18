# Trabajar en Viceblock

- Lee [PROJECT_STATE.md](PROJECT_STATE.md) y [TASKS.md](TASKS.md) antes de elegir una tarea. Consulta [ARCHITECTURE.md](ARCHITECTURE.md) para conocer los contratos entre módulos.
- Usa el checkout existente en tareas de Codex Cloud. Cada tarea ya tiene un entorno aislado. Crea un worktree adicional si el usuario lo pide.
- Mantén la lógica de juego fuera de la interfaz. Rapier integra la física con un paso fijo y Three.js interpola las poses para dibujarlas. Conserva las convenciones de ejes, medidas y tiempos que documenta la arquitectura.
- Conserva la generación determinista y las funciones puras cuando el resultado deba depender de una semilla. Reutiliza geometrías y materiales donde se repitan elementos.
- Usa recursos originales y dependencias con versiones exactas registradas en el lockfile. Documenta la razón de cualquier incorporación.
- Ejecuta `npm run typecheck`, `npm test` y `npm run build` para cambios importantes. Comprueba en un navegador los cambios que afecten al juego, las entradas o la imagen. Registra pruebas ejecutadas, resultados y entorno de medición cuando corresponda.
- Actualiza los documentos afectados por el cambio. Registra decisiones de arquitectura en [DECISIONS.md](DECISIONS.md) y limitaciones reproducibles en [KNOWN_ISSUES.md](KNOWN_ISSUES.md).
