---
document_id: CORE-ROADMAP
status: active
last_updated: 2026-11-20
verified_against: "ef1f5d115168a40a89b767658274cc28ac17b8de"
verification_scope: "typecheck-tests-build-phase1"
---

# Hoja de Ruta (`ROADMAP.md`)

> Las fases históricas 0–7 (entregas `0.1.0` y `0.2.0`) figuran en [ROADMAP.md](../ROADMAP.md). Este documento organiza la evolución posterior al mapa multi-distrito (`ef1f5d1`) para construir el **Ecosistema Urbano Inteligente, Dinámico, Interactivo y Destructible**. **Las fases posteriores a la Fase 1 quedan pendientes de autorización expresa.**

| Fase / Etapa | Estado | Prioridad | Dependencias | Objetivos y sistemas afectados | Criterios de aceptación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Fases 0–7 (`0.1.0`–`0.2.0`) + Mapa multi-isla** | **Entregada (`ef1f5d1`)** | — | — | Base Vite/TS/Three/Rapier, 6 distritos conectados por 3 puentes, 9 tiendas iniciales, `Rayo GT`, tráfico vial, policía 5 estrellas, Web Audio, streaming visual. | `27/27` tests, `typecheck` y `build` verdes en `ef1f5d1`. |
| **Fase 1: Fundamentos de simulación** | **Implementada (working tree)** | P1 | `ef1f5d1` | `physics.step(dt)` (`VB-001`), `SpatialBoxGrid` (`VB-002` LOS), `WorldEventBus`, `EntityRegistry` por LOD (`high`/`medium`/`low`), `PerceptionSystem`, perfiles + `NpcBrain` Utilidad/FSM, `PedestrianGraph` A* + steering y herramientas F3/F4/F5. | `typecheck`, `35/35` tests, `build` y smoke test Chromium F5 en verde. |
| **Fase 2: Vida urbana (NPCs, conductores y establecimientos)** | **Propuesta (Siguiente)** | P1 | Fase 1 + autorización | Peatones instanciados navegando `PedestrianGraph` con horarios y gestos sociales; conductores dentro de `traffic.ts` + robo de coches; interiores accesibles en tiendas/cafés con dependientes y rutinas; extracción de `SimulationEngine`. | Multitud NPC animada, conductores reales en tráfico y tiendas funcionales con dependientes. |
| **Fase 3: Armas, combate y delitos complejos** | **Propuesta** | P1 | Fase 2 | Armas, apuntado y amenazas perceptibles (`weapon_drawn`, `weapon_aimed`, `shot_fired`); testigos reales (`witness_detected` / `crime_reported` en 911); asalto completo con rehenes, caja registradora e intimidación; combate/salud y reacción NPC al tiroteo. | Asaltos completos sin omniscencia: la policía acude por testigos, llamadas o visibilidad real. |
| **Fase 4: Entorno dinámico y destructible** | **Propuesta** | P1 | Fase 2–3 | Objetos urbanos destructibles (`glass_shattered`, `object_destroyed`), vidrieras/cristales fracturables con física e impactos sonoros, daños en vehículos/mobiliario, escombros acotados y accidentes con rescate/huida de ocupantes. | Interacción física y destrucción reactiva registrada en `WorldEventBus` y percibida por NPCs/policía. |
| **Fase 5: Teléfono móvil integrado** | **Propuesta** | P2 | Fase 2–4 | Resolución de `VB-015` (`ArrowUp` contextual), interfaz diegética de teléfono (cámara, grabación en vivo, publicación/viralización de incidentes, alertas, contactos, llamadas de emergencia) conectada a `WorldEventBus` y reacciones NPC ante grabación. | Abrir teléfono sin romper conducción/caminata; grabar/publicar genera reacciones reales. |
| **Fase 6: Policía avanzada e investigación criminal** | **Propuesta** | P2 | Fase 3–5 | Respuesta escalonada por tipo de aviso y testigos, perímetros, unidades a pie/patrullas instanciadas (`VB-005`), negociación/cerco en tiendas, evitación de tráfico (`VB-004`) y memoria de descripción del sospechoso/vehículo. | Búsqueda sin omniscencia basada en descripción, última posición conocida y avisos reales. |
| **Fase 7: Pulido, rendimiento y optimización final** | **Propuesta** | P2 | Fase 1–6 | Streaming físico Rapier (`VB-002`), presupuesto por frame en `streaming.ts` (`VB-003`), eliminación de asignaciones GC en loops (`VB-009`), corrección de `resolution.ts` (`VB-011`), `dispose()` completo (`VB-008`) y cobertura E2E (`VB-014`). | Objetivos de frame time estables en perfiles `low`–`ultra` sin fugas ni regresiones. |

