---
document_id: CORE-ROADMAP
status: active
last_updated: 2026-11-20
verified_against: "248f8b44b7aebf77fc38a0d5c0bde996e680cec5"
verification_scope: "static-analysis-only"
---

# Hoja de Ruta (`ROADMAP.md`)

> Las fases históricas 0–7 (entregas `0.1.0` y `0.2.0`) figuran en [ROADMAP.md](../ROADMAP.md). Este documento organiza la evolución futura posterior a `0.2.0`. **Las etapas futuras son propuestas técnicas sujetas a aprobación del director del proyecto.**

| Etapa | Estado | Prioridad | Dependencias | Objetivos y sistemas afectados | Criterios de aceptación |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Fases 0–7 (`0.1.0`–`0.2.0`)** | **Entregada (código)** | — | — | Base Vite/TS/Three/Rapier, distrito Costa Palmera, jugador, `Rayo GT`, tráfico, policía 5 estrellas, Web Audio, streaming visual y perfiles gráficos. | `25` tests, `typecheck` y `build` verdes (pendiente re-verificar en este checkout). |
| **Etapa 1: Estabilización y línea base** | **Propuesta** | P1 | Autorización | Instalar deps (`npm ci`), ejecutar `typecheck`/`test`/`build` y medir percentiles de frame time, draw calls y RAM por perfil (`low`–`ultra`). | Reporte medido en navegador y suite `25/25` verde. |
| **Etapa 2: Correcciones críticas de simulación** | **Propuesta** | P1 | Etapa 1 | Centralizar `world.step()` (`physics.ts`), corregir cota de acera/sombras (`streets.ts`, `contact-shadows.ts`), radio vehicular (`main.ts`), audio salto/pasos y `dispose()` completos. | `world.step()` único por tick; pies/sombras sobre acera; `dispose()` sin fugas; tests verdes. |
| **Etapa 3: Reducción de deuda y optimización** | **Propuesta** | P1 | Etapa 2 | Instanciar patrullas (`police.ts`), eliminar basura GC en `main.ts`/`vehicle-obstacles.ts`, presupuesto de sectores por frame (`streaming.ts`) y ajuste de `resolution.ts`. | Cero picos por reconstrucción masiva; draw calls de patrullas constantes; sin falsas bajadas a 30 Hz. |
| **Etapa 4: Consolidación arquitectónica** | **Propuesta** | P2 | Etapa 2–3 | Extraer `SimulationEngine` + `EventBus` desde `main.ts`; soporte multi-vehículo; índice espacial de `StaticBox` (`clearLine` `O(1)`/`O(log N)`). | `main.ts` reducido a shell de arranque/loop; ≥2 vehículos dinámicos simultáneos probados. |
| **Etapa 5: Escalabilidad territorial** | **Propuesta** | P2 | Etapa 4 | Streaming físico de Rapier, A* con min-heap en `road-graph.ts`, reserva por sub-conflicto de cruce, generación geométrica asíncrona (Web Worker). | Mapa ampliado (≥4× área) con memoria Rapier acotada y tráfico sin bloqueos de cruce completo. |
| **Etapa 6: Sistemas fundamentales de mundo abierto** | **Propuesta** | P3 | Etapa 4–5 | Red peatonal + NPCs a pie instanciados, robo de coches de tráfico, salud/combate básico, misiones iniciales y minimapa dinámico con zoom/marcadores. | Interacción completa a pie/vehículo con NPCs y ciclo básico de misión/actividad. |
| **Etapa 7: Expansión avanzada** | **Propuesta** | P4 | Etapa 6 | Múltiples distritos y biomas, terreno con elevación/puentes, interiores enterables, clima dinámico (lluvia) y guardado de progreso en IndexedDB. | Transiciones de distrito/interior, persistencia de partida y E2E en CI. |
