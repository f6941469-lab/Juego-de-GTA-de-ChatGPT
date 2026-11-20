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
- **Estado:** Resuelto (en working tree sobre `ef1f5d1`)
- **Sistema afectado:** Física / Jugador / Vehículos
- **Archivo o símbolo:** `src/physics/physics.ts` (`step`, `createCharacterCollider.prepareMove`), `src/player/player.ts` (`prepareStep`, `finishStep`), `src/vehicles/vehicle.ts` (`prepareStep`, `finishStep`), `src/main.ts` (`step`)
- **Descripción:** Cada controlador avanzaba el mundo físico Rapier completo; ahora `main.ts` ejecuta `prepareStep()` antes de un único `physics.step(dt)` y `finishStep()` después, conservando `move()`/`step()` solo como envoltorios para pruebas unitarias aisladas.
- **Evidencia:** `physics.step(dt)` en `src/main.ts` y pruebas en `tests/events-and-entities.test.ts` + `player.test.ts` + `vehicle.test.ts`.
- **Impacto:** Desbloquea la simulación física simultánea de múltiples vehículos y NPCs.
- **Solución propuesta:** Implementado (`ADR-0005`).
- **Referencias:** `TASK-0002`, `ADR-0005`.

### `VB-002` — Colisionadores estáticos residentes y `clearLine` lineal `O(N)`
- **Prioridad:** P1 — Alto
- **Estado:** Parcialmente mitigado (`clearLine` `O(celdas)` implementado; streaming físico pendiente)
- **Sistema afectado:** Mundo / Física / Policía / Percepción
- **Archivo o símbolo:** `src/physics/spatial-index.ts` (`SpatialBoxGrid`), `src/physics/physics.ts` (`physics.spatial`), `src/ai/police/police.ts` (`clearLine`), `src/world/district.ts` (`colliders`)
- **Descripción:** Las consultas `clearLine()` y `raycast()` ahora utilizan `SpatialBoxGrid` (`32×32 m`) en tiempo `O(celdas)` tanto en policía como en `PerceptionSystem`. No obstante, Rapier sigue cargando todas las cajas estáticas del distrito en memoria al inicio sin streaming físico activo/inactivo.
- **Evidencia:** `SpatialBoxGrid` integrado en `createPhysics` y `createPolice`; falta carga/descarga de colliders Rapier por ventana activa.
- **Impacto:** El cuello de CPU por raycast/LOS queda mitigado; queda pendiente el control de memoria física al multiplicar la escala del mapa.
- **Solución propuesta:** Añadir streaming físico de colliders estáticos sobre Rapier en fases de optimización territorial (`ADR-0006`).
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
- **Estado:** Parcialmente mitigado (`overlay.ts` ya implementa `dispose()`)
- **Sistema afectado:** Mundo / Renderizado / Entrada / Policía / Debug
- **Archivo o símbolo:** `streets.ts` (`pole`), `vegetation.ts` (`trunk`, `crown`, `leaf`), `renderer.ts`, `atmosphere.ts`, `police.ts`, `input.ts`, `overlay.ts` (`dispose`)
- **Descripción:** Geometrías de módulo nunca liberadas en `district.dispose()`; varios módulos aún carecen de `dispose()` para WebGL o listeners globales (`overlay.ts` ya libera su `BufferGeometry`, material e hijos).
- **Evidencia:** Declaraciones top-level en `streets.ts`/`vegetation.ts` y ausencia de `dispose()` en los retornos de fábrica restantes.
- **Impacto:** Impide desmontar/reiniciar la escena sin fugas de memoria o listeners duplicados.
- **Solución propuesta:** Integrar geometrías en `DistrictResources` y añadir `dispose()` simétrico en todos los subsistemas restantes.
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

### `VB-013` — Desajustes menores en audio pasos, minimapa estático y pausa
- **Prioridad:** P3 — Bajo
- **Estado:** Parcialmente mitigado (`jump` ligado a `player.grounded` y `stats.ts` muestra conteo real de entidades)
- **Sistema afectado:** Audio / UI / Debug
- **Archivo o símbolo:** `src/audio/audio.ts` (`frame.y < 0.5`), `src/ui/minimap.ts`, `src/ui/ui.ts`, `src/player/player.ts` (`grounded`), `src/debug/stats.ts` (`entities`)
- **Descripción:** `main.ts` ya condiciona `audio.cue('jump')` a `player.grounded` y `stats.ts` muestra el conteo real de `EntityRegistry`. Siguen pendientes: pasos dependientes de `y < 0.5` en `audio.ts`, minimapa sin zoom ni entidades dinámicas y cierre del modal de pausa al reiniciar.
- **Evidencia:** Inspección de `main.ts`, `stats.ts`, `audio.ts`, `minimap.ts`, `ui.ts`.
- **Impacto:** Detalles de pulido UX; el minimapa fijo requerirá actualización al mostrar NPCs/patrullas dinámicas.
- **Solución propuesta:** Usar `grounded` en pasos de `audio.ts` y añadir seguimiento/marcadores dinámicos en `minimap.ts`.
- **Referencias:** `TASK-0007`.

### `VB-014` — Brecha de pruebas en UI, audio, entrada, persistencia, render y aviso dev `picomatch`
- **Prioridad:** P3 — Bajo
- **Estado:** Parcialmente mitigado (35 tests actuales; pendiente cobertura DOM/WebGL/Audio)
- **Sistema afectado:** Calidad / DevOps
- **Archivo o símbolo:** `tests/*.test.ts`, `package-lock.json` (`picomatch@4.0.7`)
- **Descripción:** 35 pruebas cubren simulación, eventos, entidades, percepción, cerebro NPC, navegación vial/peatonal y mundo; `ui`, `minimap`, `input`, `preferences`, `audio`, `renderer`, `atmosphere`, `contact-shadows`, `avatar` y `main` carecen de pruebas unitarias DOM/WebGL. `picomatch@4.0.7` (dev) tiene aviso `GHSA-fc5q-39xc-vjpf`.
- **Evidencia:** Inventario `tests/*.test.ts` (13 archivos, 35 tests) y `KNOWN_ISSUES.md` raíz.
- **Impacto:** Riesgo de regresiones silenciosas en interfaz, entrada y audio.
- **Solución propuesta:** Añadir pruebas de integración/DOM y verificación E2E en CI; vigilar actualización upstream de herramientas dev.
- **Referencias:** `TASK-0001`, `TASK-0009`.

### `VB-015` — Conflicto de tecla `ArrowUp` entre movimiento y teléfono móvil
- **Prioridad:** P2 — Medio
- **Estado:** Resuelto (en Fase 5 sobre `96ef8fc`)
- **Sistema afectado:** Entrada / UI (Teléfono móvil)
- **Archivo o símbolo:** `src/core/input.ts` (`keys`, `phoneOpen`, `phoneCommand`), `index.html` (`#phone-device`)
- **Descripción:** `WASD` queda asignado exclusivamente a movimiento/conducción, mientras que `↑` (`ArrowUp`) y `M` abren/cierran el teléfono sin mover al personaje ni acelerar el coche; cuando el teléfono está abierto, las flechas, `Enter` y `Backspace` navegan su interfaz.
- **Evidencia:** `setPhoneOpen`, `phoneCommand` y prueba integrada en `tests/phone-system.test.ts` + navegador Chromium.
- **Impacto:** Permite usar el teléfono a pie o conduciendo sin interferir con el desplazamiento ni la dirección del vehículo.
- **Solución propuesta:** Implementado (`ADR-0012`).
- **Referencias:** `ROADMAP.md` (Fase 5), `ADR-0012`.

