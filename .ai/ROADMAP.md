# Plan activo de ampliación

La planificación detallada solicitada por el usuario está en [../ROADMAP.md](../ROADMAP.md). Parte de Mercado Palma 0.3.0 (`038456a`) y conserva su presentación. Orden: entrega portable HTML → simulación de todo el mapa → NPC → vehículos/ocupantes → comercios/armas/asaltos → destrucción → policía coordinada → replay/teléfono → cierre de integración.

Las fases 2–9 siguen planificadas; la fase 1 está parcialmente implementada, con el límite de aceptación indicado abajo. El historial y estado de implementación actuales siguen en CURRENT_STATE.md y SIMULATION.md.

Primera implementación: 0.3.1 incorpora el empaquetador reproducible y `jugar/index.html` con recursos/licencias integrados. La fase 1 continúa abierta hasta comprobar file:// real: el navegador administrado lo bloquea. Ver [PORTABLE.md](PORTABLE.md). Las funciones globales de las fases siguientes siguen pendientes.

Ampliación del encargo: NPC con objetivos y objetos desde el inicio, conversaciones contextuales, robo de coches, incidentes por disparos fuera de tiendas, nueve comercios reales con clientes y consumo, y replay POV que conserve los segmentos enviados aunque el testigo muera. Historia/cinemáticas quedan para después, con puntos de extensión identificados. La revisión documental del LLM móvil recomienda diálogo preparado como base y modelo opcional sujeto a pruebas físicas; no se instaló ni midió ninguno.
