---
document_id: CORE-KNOWN-ISSUES
status: active
last_updated: 2026-11-20
verified_against: "248f8b44b7aebf77fc38a0d5c0bde996e680cec5"
verification_scope: "static-analysis-only"
---

# Registro de Problemas Conocidos (`KNOWN_ISSUES.md`)

> Consolida las limitaciones generales de [KNOWN_ISSUES.md](../KNOWN_ISSUES.md) y los hallazgos técnicos verificados en [AUDIT-0001-v0.2.0.md](audits/AUDIT-0001-v0.2.0.md). Todos los registros están **confirmados por análisis estático**; las métricas de runtime quedan pendientes de medición.

---

### `VB-001` — `world.step()` acoplado dentro de `character.move()` y `vehicle.step()`
- **Prioridad:** P1 — Alto
- **Estado:** Confirmado (Abierto)
- **Sistema afectado:** Física / Jugador / Vehículos
- **Archivo o símbolo:** `src/physics/physics.ts` (`createCharacterCollider.move`), `src/vehicles/vehicle.ts` (`step`), `src/main.ts` (`step`)
- **Descripción:** Cada controlador avanza el mundo físico Rapier completo; `main.ts` evita doble integración solo porque `player` y `vehicle` son mutuamente excluyentes.
- **Evidencia:** `world.step()` en `physics.ts` y `vehicle.ts`.
- **Impacto:** Bloquea simular múltiples vehículos dinámicos, objetos físicos o NPCs físicos en el mismo tick.
- **Solución propuesta:** Centralizar `physics.step(dt)` al final del paso fijo y leer poses post-step (`ADR-0005`).
- **Referencias:** `TASK-0002`, `ADR-0005`.

### `VB-002` — Colisionadores estáticos residentes y `clearLine` lineal `O(N)`
- **Prioridad:** P1 — Alto
- **Estado:** Confirmado (Abierto)
- **Sistema afectado:** Mundo / Física / Policía
- **Archivo o símbolo:** `src/world/district.ts` (`colliders`), `src/physics/physics.ts` (`createPhysics`), `src/ai/police/police.ts` (`clearLine`)
- **Descripción:** Todas las cajas estáticas del distrito se cargan en Rapier al inicio sin streaming físico, y `clearLine()` recorre linealmente el array completo en cada chequeo de visión/movimiento policial.
- **Evidencia:** Bucle `for (const box of boxes)` en `clearLine` y carga única en `createPhysics(district.colliders)`.
- **Impacto:** Limita el crecimiento territorial del mundo y degrada CPU linealmente con el número de edificios.
- **Solución propuesta:** Rejilla espacial de `StaticBox` (`64×64 m`) para consultas LOS y streaming físico por radio activo (`ADR-0006`).
- **Referencias:** `TASK-0006`, `ADR-0006`.

### `VB-003` — Reconstrucción síncrona de sectores en el hilo principal
- **Prioridad:** P1 — Alto
- **Estado:** Confirmado (Abierto)
- **Sistema afectado:** Mundo / Streaming / Renderizado
- **Archivo o símbolo:** `src/world/streaming.ts` (`update`), `src/world/generation/vegetation.ts` (`addPalm`)
- **Descripción:** Al avanzar `≥ 5 m`, `streaming.update()` reconstruye síncronamente todos los sectores que entran o cambian de LOD en un solo frame, generando objetos `Vector3`/`Euler`/`Quaternion` temporales y nuevos `InstancedMesh`.
- **Evidencia:** Bucle directo sobre `sectors` con `geometry.render()` dentro de `frame()`.
- **Impacto:** Riesgo de microcortes (*stuttering*) al conducir rápido por zonas densas.
- **Solución propuesta:** Limitar a 1 reconstrucción de sector por frame (cola por distancia), reutilizar vectores temporales y evaluar Web Workers a futuro.
- **Referencias:** `TASK-0005`.

### `VB-004` — Patrullas policiales ignoran tráfico civil y frenan con margen menor al vehículo
- **Prioridad:** P1 — Alto
- **Estado:** Confirmado (Abierto)
- **Sistema afectado:** Policía / Tráfico
- **Archivo o símbolo:** `src/ai/police/police.ts` (`steer`, `step`)
- **Descripción:** `police.step()` comprueba cola solo frente a otras patrullas (`units`), ignorando `traffic.vehicles`. `steer()` frena usando `clearLine(unit, next, boxes, 0.65)` cuando el medio largo del modelo es `1.96 m`.
- **Evidencia:** Ausencia de parámetro de obstáculos de tráfico en `police.ts`; margen `0.65` en `steer()`.
- **Impacto:** Patrullas atraviesan visualmente coches civiles y pueden clavar esquinas de edificios ~1.3 m.
- **Solución propuesta:** Pasar obstáculos dinámicos compartidos a `police.step()` y validar huella real del vehículo.
- **Referencias:** `TASK-0004`.

### `VB-005` — Patrullas policiales sin `InstancedMesh` y con duplicación de recursos GPU
- **Prioridad:** P1 — Alto
- **Estado:** Confirmado (Abierto)
- **Sistema afectado:** Policía / Renderizado / Vehículos
- **Archivo o símbolo:** `src/ai/police/police.ts` (`sendPatrol`), `src/vehicles/vehicle-model.ts` (`createVehicleModel`)
- **Descripción:** Cada patrulla creada llama a `createVehicleModel()`, instanciando geometrías y 10 materiales `MeshStandardMaterial` nuevos (~25–30 draw calls por patrulla).
- **Evidencia:** Llamada directa a `createVehicleModel` dentro de `sendPatrol()`.
- **Impacto:** Multiplicación innecesaria de draw calls y shaders al escalar unidades policiales.
- **Solución propuesta:** Compartir geometrías/materiales base o usar `InstancedMesh` como `traffic-visuals.ts`.
- **Referencias:** `TASK-0005`.

### `VB-006` — Desfase de cota en aceras (`+4.9 cm`) y oclusión de sombras de contacto
- **Prioridad:** P2 — Medio
- **Estado:** Confirmado (Abierto)
- **Sistema afectado:** Mundo / Física / Renderizado
- **Archivo o símbolo:** `src/world/generation/streets.ts` (`addStreets`), `src/world/district.ts` (`createTerrainColliders`), `src/renderer/postprocessing/contact-shadows.ts` (`update`), `src/main.ts` (`frame`)
- **Descripción:** Suelo físico en `y = 0`, acera visual en `y = +0.049` sin collider, sombra de contacto en `y = +0.025`. Además `main.ts` no ordena `nearby` por distancia antes del límite de `10` sombras.
- **Evidencia:** Constantes de altura en `streets.ts` y `contact-shadows.ts`.
- **Impacto:** Los pies del avatar se hunden ~4.9 cm en aceras y su sombra queda oculta debajo; sombras cercanas pueden quedar descartadas en zonas densas.
- **Solución propuesta:** Añadir colliders de acera o alinear alturas, pasar `groundY` real y ordenar `nearby` por distancia.
- **Referencias:** `TASK-0003`.

### `VB-007` — Bloqueo de intersección completa en tráfico y Dijkstra `O(V²)`
- **Prioridad:** P2 — Medio
- **Estado:** Confirmado (Abierto)
- **Sistema afectado:** Navegación / Tráfico
- **Archivo o símbolo:** `src/ai/traffic/traffic.ts` (`reserveJunction`), `src/navigation/road-graph.ts` (`findRoadRoute`)
- **Descripción:** Un coche reserva el nodo completo del cruce bloqueando sentidos opuestos compatibles. `findRoadRoute()` escanea `frontier` linealmente.
- **Evidencia:** `reserved: Map<string, TrafficVehicle>` por `node.id` y bucle lineal en `findRoadRoute()`.
- **Impacto:** Atascos con tráfico denso y falta de escalabilidad en grafos >1.000 nodos.
- **Solución propuesta:** Reservas por trayectorias conflictivas y A* con min-heap.
- **Referencias:** `TASK-0008`.

### `VB-008` — Geometrías globales sin liberar y falta de `dispose()` en subsistemas
- **Prioridad:** P2 — Medio
- **Estado:** Confirmado (Abierto)
- **Sistema afectado:** Mundo / Renderizado / Entrada / Policía / Debug
- **Archivo o símbolo:** `streets.ts` (`pole`), `vegetation.ts` (`trunk`, `crown`, `leaf`), `renderer.ts`, `atmosphere.ts`, `police.ts`, `overlay.ts`, `input.ts`
- **Descripción:** Geometrías de módulo nunca liberadas en `district.dispose()`; varios módulos carecen de `dispose()` para WebGL o listeners globales.
- **Evidencia:** Declaraciones top-level en `streets.ts`/`vegetation.ts` y ausencia de `dispose()` en los retornos de fábrica citados.
- **Impacto:** Impide desmontar/reiniciar la escena sin fugas de memoria o listeners duplicados.
- **Solución propuesta:** Integrar geometrías en `DistrictResources` y añadir `dispose()` simétrico en todos los subsistemas.
- **Referencias:** `TASK-0003`.

### `VB-009` — Asignaciones de arrays/sets temporales por tick (`60 Hz`) y frame
- **Prioridad:** P2 — Medio
- **Estado:** Confirmado (Abierto)
- **Sistema afectado:** Orquestador / Física / Render
- **Archivo o símbolo:** `src/main.ts` (`step`, `frame`), `src/physics/vehicle-obstacles.ts` (`update`)
- **Descripción:** Uso de spread (`[...]`), `.filter()`, `.map()` y `new Set()` en cada iteración de simulación y render.
- **Evidencia:** Líneas de `step()` y `frame()` en `main.ts` y `update()` en `vehicle-obstacles.ts`.
- **Impacto:** Presión innecesaria sobre el GC al escalar entidades.
- **Solución propuesta:** Reutilizar colecciones preasignadas.
- **Referencias:** `TASK-0005`.

### `VB-010` — Mobiliario costero/parques sin colisionadores y spawns rígidos
- **Prioridad:** P2 — Medio
- **Estado:** Confirmado (Abierto)
- **Sistema afectado:** Mundo
- **Archivo o símbolo:** `src/world/district.ts`, `src/world/generation/coast.ts`, `src/main.ts`
- **Descripción:** Solo palmeras de bulevar tienen `StaticBox`; palmeras costeras/parques, farolas, bancos y jardineras son atravesables. Spawns (`0,0,25` y `3.9,0,22`) y `specialLots` están hardcodeados, y `buildDistrict` tiene default seed `61865` distinto a `gameConfig.seed` (`240817`).
- **Evidencia:** Comparación entre `addBoulevardGreenery` y `makePark`/`addCoast`.
- **Impacto:** Inconsistencia física y fragilidad al cambiar el trazado vial.
- **Solución propuesta:** Registrar colliders desde generadores de elementos y derivar spawns desde `layout.ts`.
- **Referencias:** `TASK-0003`.

### `VB-011` — Resolución adaptativa basada en intervalo `rAF` en vez de carga real
- **Prioridad:** P2 — Medio
- **Estado:** Confirmado (Abierto)
- **Sistema afectado:** Renderizado
- **Archivo o símbolo:** `src/renderer/renderer.ts` (`render`), `src/renderer/resolution.ts` (`createFrameBudget`)
- **Descripción:** Mide `now - last` entre callbacks `rAF`; pantallas a `30 Hz` (`33.3 ms > 24 ms`) disparan degradación de resolución aunque la GPU esté libre.
- **Evidencia:** `budget.sample(now, adaptive)` en `renderer.ts`.
- **Impacto:** Pérdida de nitidez falsa en modos ahorro de batería o monitores 30 Hz.
- **Solución propuesta:** Ponderar tiempo CPU de `render()` / detección de refresco o `EXT_disjoint_timer_query_webgl2` cuando exista.
- **Referencias:** `TASK-0005`.

### `VB-012` — Radio de obstáculo reducido al conducir y dependencia implícita de orden `render()`
- **Prioridad:** P2 — Medio
- **Estado:** Confirmado (Abierto)
- **Sistema afectado:** Vehículos / Tráfico / Cámara
- **Archivo o símbolo:** `src/main.ts` (`step`, `frame`), `src/vehicles/vehicle.ts` (`render`, `cameraTarget`)
- **Descripción:** `playerObstacle.radius` baja a `1.45` al conducir (frente a `2.15` aparcado y semilargo `1.96`); `player.render()` depende de que `vehicle.render()` corra antes para leer `visualPosition`/`visualHeading`.
- **Evidencia:** Asignación en `main.ts` y `cameraTarget` en `vehicle.ts`.
- **Impacto:** Mayor riesgo de roces con tráfico en movimiento y acoplamiento temporal frágil.
- **Solución propuesta:** Evaluar envolvente real en tráfico y separar actualización de pose interpolada antes de la cámara.
- **Referencias:** `TASK-0003`.

### `VB-013` — Desajustes menores en audio salto/pasos, minimapa estático y pausa/debug
- **Prioridad:** P3 — Bajo
- **Estado:** Confirmado (Abierto)
- **Sistema afectado:** Audio / UI / Debug
- **Archivo o símbolo:** `src/main.ts` (`audio.cue('jump')`), `src/audio/audio.ts` (`frame.y < 0.5`), `src/ui/minimap.ts`, `src/ui/ui.ts`, `src/debug/stats.ts`
- **Descripción:** Sonido de salto se dispara en el aire; pasos dependen de `y < 0.5` en vez de `grounded`; minimapa es fijo sin zoom ni entidades dinámicas; `stats.ts` escribe siempre `'1 personaje'`.
- **Evidencia:** Inspección directa de los 5 archivos.
- **Impacto:** Detalles de pulido UX; el minimapa fijo impedirá ampliar el mapa.
- **Solución propuesta:** Exponer `grounded` en `player` y añadir seguimiento/marcadores en `minimap.ts`.
- **Referencias:** `TASK-0007`.

### `VB-014` — Brecha de pruebas en UI, audio, entrada, persistencia, render y aviso dev `picomatch`
- **Prioridad:** P3 — Bajo
- **Estado:** Confirmado (Abierto)
- **Sistema afectado:** Calidad / DevOps
- **Archivo o símbolo:** `tests/*.test.ts`, `package-lock.json` (`picomatch@4.0.7`)
- **Descripción:** 25 pruebas cubren simulación y mundo, pero `ui`, `minimap`, `input`, `preferences`, `audio`, `renderer`, `atmosphere`, `contact-shadows`, `avatar` y `main` no tienen tests automatizados. `picomatch@4.0.7` (dev) tiene aviso `GHSA-fc5q-39xc-vjpf`.
- **Evidencia:** Inventario `tests/*.test.ts` y `KNOWN_ISSUES.md` raíz.
- **Impacto:** Riesgo de regresiones silenciosas en interfaz, entrada y audio.
- **Solución propuesta:** Añadir pruebas de integración/DOM y verificación E2E en CI; vigilar actualización upstream de herramientas dev.
- **Referencias:** `TASK-0001`, `TASK-0009`.
