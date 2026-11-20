---
document_id: CORE-ROADMAP
status: active
last_updated: 2026-11-20
verified_against: "3a830a4-dirty (Phase 6)"
verification_scope: "typecheck + vitest (49/49) + vite build + Chromium WebGL 2 live test"
---

# Hoja de Ruta (`ROADMAP.md`)

> Las fases históricas 0–7 (entregas `0.1.0` y `0.2.0`) figuran en [ROADMAP.md](../ROADMAP.md). Este documento organiza la evolución posterior al mapa multi-distrito (`ef1f5d1`) para construir el **Ecosistema Urbano Inteligente, Dinámico, Interactivo y Destructible**. **La Fase 7 queda pendiente de autorización expresa.**

| Fase / Etapa | Estado | Prioridad | Dependencias | Objetivos y sistemas afectados | Criterios de aceptación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Fases 0–7 (`0.1.0`–`0.2.0`) + Mapa multi-isla** | **Entregada (`ef1f5d1`)** | — | — | Base Vite/TS/Three/Rapier, 6 distritos conectados por 3 puentes, 9 tiendas iniciales, `Rayo GT`, tráfico vial, policía 5 estrellas, Web Audio, streaming visual. | `27/27` tests, `typecheck` y `build` verdes en `ef1f5d1`. |
| **Fase 1: Fundamentos de simulación** | **Entregada (`e2288b5`)** | P1 | `ef1f5d1` | `physics.step(dt)` (`VB-001`), `SpatialBoxGrid` (`VB-002` LOS), `WorldEventBus`, `EntityRegistry` por LOD (`high`/`medium`/`low`), `PerceptionSystem`, perfiles + `NpcBrain` Utilidad/FSM, `PedestrianGraph` A* + steering y herramientas F3/F4/F5. | `typecheck`, `35/35` tests, `build` y smoke test Chromium F5 en verde. |
| **Fase 2: Vida urbana (NPCs, conductores y establecimientos)** | **Entregada (`45aefd3`)** | P1 | Fase 1 (`e2288b5`) | Peatones instanciados (7 `InstancedMesh`, hasta 72 NPCs) sobre `PedestrianGraph` con horarios y distritos; conductores reales en `traffic.ts` + robo de coches (`VehicleManager` hasta 4 coches físicos) y ex-conductores NPC; 9 tiendas con interiores accesibles y dependientes; `SimulationEngine`. | Multitud NPC animada, conductores reales en tráfico y 9 tiendas enterables verificadas con Rapier (`37/37` tests). |
| **Fase 3: Armas, combate y delitos complejos** | **Entregada (`96ef8fc`)** | P1 | Fase 2 (`45aefd3`) | Armas (`1-3`, `Q`, `R`), apuntado (`Clic der.`/`F`) y disparo (`Clic izq.`/`G`), trazadores instanciados y raycast detenido por muros; amenazas perceptibles (`weapon_drawn`, `weapon_aimed`, `shot_fired`); testigos reales (`witness_detected` / `crime_reported` interrumpibles en 911); asalto completo progresivo con cooperación de dependientes y botín `$`; combate cuerpo a cuerpo NPC y disparo policial recíproco con LOS. | Asaltos completos sin omniscencia verificados con balística, cobertura, 911 y botín (`40/40` tests + build + Chromium). |
| **Fase 4: Entorno dinámico y destructible** | **Entregada (`3a830a4`)** | P1 | Fase 2–3 (`96ef8fc`) | Objetos urbanos destructibles instanciados (`createDestructibles`: `store_glass` en 9 tiendas, `hydrant` con chorro de agua, `bollard`, `crate`, `bench`) con colisionadores Rapier removibles al instante, `glass_broken`/`object_destroyed`/`traffic_accident` en `WorldEventBus`, cues audio (`glass`, `debris`), escombros y humo acotados (`96`/`64`), daño en vehículos (`vehicle.ts`/`traffic.ts`) y accidentes graves con huida del conductor y aproximación de transeúntes. | Interacción física y destrucción reactiva verificada (`43/43` tests + build + Chromium). |
| **Fase 5: Teléfono móvil integrado** | **Entregada (`3a830a4`)** | P2 | Fase 2–4 | Resolución de `VB-015` (`ArrowUp`/`KeyM` abre teléfono; `WASD` dedicado al movimiento), sistema diegético `createPhoneSystem` (`camera`, `feed`, `emergency` 911, `alerts`), grabación en vivo (`recording_started`) y publicación (`video_published`) en `WorldEventBus` con viralización y reacciones NPC según rol. | Abrir teléfono sin mover al personaje; grabar/publicar genera reacciones reales (`45/45` tests + build + Chromium). |
| **Fase 6: Policía avanzada e investigación criminal** | **Implementada (working tree)** | P2 | Fase 3–5 (`3a830a4`) | Patrullas y agentes a pie GPU-instanciados (`police-visuals.ts`, `VB-005`), evitación de tráfico civil y sonda real de chasis (`VB-004`), memoria descriptiva del sospechoso/vehículo (`matchesSuspect`), perímetros, cerco en tienda (`storeSiege`), despliegue a pie con visión propia (`clearLine`) y liberación `dispose()` (`VB-008`). | Búsqueda sin omniscencia por descripción/vehículo y cerco verificados (`49/49` tests + build + Chromium). |
| **Fase 7: Pulido, rendimiento y optimización final** | **Propuesta (Siguiente)** | P2 | Fase 1–6 + autorización | Streaming físico Rapier (`VB-002`), presupuesto por frame en `streaming.ts` (`VB-003`), eliminación de asignaciones GC en loops (`VB-009`), corrección de `resolution.ts` (`VB-011`), `dispose()` restante (`VB-008`) y cobertura E2E (`VB-014`). | Objetivos de frame time estables en perfiles `low`–`ultra` sin fugas ni regresiones. |



