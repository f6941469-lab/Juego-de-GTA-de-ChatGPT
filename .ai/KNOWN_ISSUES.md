# Limitaciones activas — Mercado Palma 0.5.0

Consultar [../KNOWN_ISSUES.md](../KNOWN_ISSUES.md) y [CURRENT_STATE.md](CURRENT_STATE.md). Diez civiles y tres coches por destinos sobre la red vial global. No hay conducción del jugador, aparcamiento, otros distritos, persecuciones policiales en coche ni replay. La fase 3 ampliará actividades, objetos y conversaciones.

Las reservas actuales son de celdas peatonales y de cruces viales completos. No incluyen colas/puertas comerciales ni transferencia de asientos. La simulación distante mantiene cuerpos físicos; solo se reducen decisiones y representación visual. Los horarios y el streaming físico siguen pendientes. El estado por zonas dura la sesión, no se guarda en disco.

El ZIP dedicado de itch.io contiene el HTML compilado como único index en la raíz. El usuario confirmó que funciona en itch.io tras 0.4.1. Se mantiene la comprobación del paquete en un iframe de otro origen: [ITCH.md](ITCH.md).

La apertura file:// continúa bloqueada por política del Chromium administrado; ver [PORTABLE.md](PORTABLE.md). WebGPU en Dawn/SwiftShader falla también con un triángulo independiente; su aceptación en hardware utilizable, el perfilado físico, la temperatura y la escucha del audio siguen pendientes. Ver [RENDERING.md](RENDERING.md).

## Registro histórico del sistema sustituido

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
- **Estado:** Resuelto (en Fase 7 sobre `173aa01`)
- **Sistema afectado:** Mundo / Física / Policía / Percepción
- **Archivo o símbolo:** `src/physics/spatial-index.ts` (`SpatialBoxGrid`), `src/physics/physics.ts` (`createPhysics`, `streamFocus`), `src/simulation/engine.ts`, `src/main.ts`
- **Descripción:** `clearLine()` y `raycast()` usan `SpatialBoxGrid` (`O(celdas)`) sobre todo el distrito, y `createPhysics(..., { streamingRadius: 112 })` monta/desmonta dinámicamente los colisionadores estáticos en Rapier alrededor del foco (`+16 m` histéresis).
- **Evidencia:** `tests/optimization-and-streaming.test.ts` verifica montaje/descarga física con LOS completo preservado; prueba viva Chromium registra `131 colisionadores` activos frente a `514` totales.
- **Impacto:** Reduce ~74.5 % los colisionadores vivos en Rapier sin afectar balística ni visión policial lejana.
- **Solución propuesta:** Implementado (`ADR-0006`, `ADR-0014`).
- **Referencias:** `TASK-0006`, `ADR-0006`, `ADR-0014`.

### `VB-003` — Reconstrucción síncrona de sectores en el hilo principal
- **Prioridad:** P1 — Alto
- **Estado:** Resuelto (en Fase 7 sobre `173aa01`)
- **Sistema afectado:** Mundo / Streaming / Renderizado
- **Archivo o símbolo:** `src/world/streaming.ts` (`createDistrictStreaming`, `update`, `flush`, `stats`)
- **Descripción:** Tras la carga inicial, `streaming.update()` aplica un presupuesto `maxRebuilds = 1` sector por fotograma priorizando el sector más cercano al foco y drenando la cola `pending` progresivamente sin bloquear el hilo principal.
- **Evidencia:** `tests/optimization-and-streaming.test.ts` verifica reducción incremental de `pending` frame a frame sin re-saltar `>= 5 m`.
- **Impacto:** Elimina picos de reconstrucción síncrona múltiple al conducir rápido entre distritos.
- **Solución propuesta:** Implementado (`ADR-0014`).
- **Referencias:** `TASK-0005`, `ADR-0014`.

### `VB-004` — Patrullas policiales ignoran tráfico civil y frenan con margen menor al vehículo
- **Prioridad:** P1 — Alto
- **Estado:** Resuelto (en Fase 6 sobre `3a830a4`)
- **Sistema afectado:** Policía / Tráfico
- **Archivo o símbolo:** `src/ai/police/police.ts` (`steer`, `step`), `src/simulation/engine.ts` (`police.step`)
- **Descripción:** Anteriormente `police.step()` ignoraba `traffic.vehicles` y frenaba con margen `0.65m`. Ahora `engine.ts` pasa `traffic.vehicles` como obstáculos a `police.step()`, `steer()` frena o desvía frente a vehículos civiles dentro del cono frontal (`7.2m`/`4.2m`) y usa doble sonda física realista (`0.94m` lateral + `1.15m` frontal) acorde a `vehicleDimensions`.
- **Evidencia:** `tests/police-investigation.test.ts` verifica que una patrulla frena (`speed < 0.5`) ante vehículos civiles detenidos delante.
- **Impacto:** Elimina el solapamiento visual sistemático de patrullas atravesando tráfico y reduce enganches en esquinas de edificios.
- **Solución propuesta:** Implementado (`ADR-0013`).
- **Referencias:** `TASK-0004`, `ADR-0013`.

### `VB-005` — Patrullas policiales sin `InstancedMesh` y con duplicación de recursos GPU
- **Prioridad:** P1 — Alto
- **Estado:** Resuelto (en Fase 6 sobre `3a830a4`)
- **Sistema afectado:** Policía / Renderizado / Vehículos
- **Archivo o símbolo:** `src/ai/police/police-visuals.ts` (`createPoliceVisuals`), `src/ai/police/police.ts` (`render`, `dispose`)
- **Descripción:** Sustituido `createVehicleModel()` por patrulla por `createPoliceVisuals(scene, 8)` con 4 `InstancedMesh` compartidos (`shells`, `wheels`, `lights`, `officers`) para hasta 8 patrullas y sus agentes a pie con luces/sirenas estroboscópicas y liberación simétrica `dispose()`.
- **Evidencia:** `tests/police-investigation.test.ts` verifica exactamente `4` `InstancedMesh` compartidos al renderizar múltiples patrullas; prueba viva Chromium registra `194` draw calls totales con `3` patrullas activas.
- **Impacto:** Elimina ~130+ draw calls dinámicos y duplicación de materiales al escalar unidades policiales.
- **Solución propuesta:** Implementado (`ADR-0013`).
- **Referencias:** `TASK-0005`, `ADR-0013`.

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
- **Estado:** Parcialmente mitigado (`overlay.ts`, `police.ts`, `renderer.ts`, `atmosphere.ts` e `input.ts` implementan `dispose()` + `pagehide`)
- **Sistema afectado:** Mundo / Renderizado / Entrada / Debug
- **Archivo o símbolo:** `streets.ts` (`pole`), `vegetation.ts` (`trunk`, `crown`, `leaf`), `renderer.ts`, `atmosphere.ts`, `input.ts`, `overlay.ts`, `police.ts`, `main.ts`
- **Descripción:** Las fábricas de subsistemas clave (`renderer`, `atmosphere`, `input`, `overlay`, `police`, `district`, `simulation`, `physics`) ya implementan `dispose()` y se liberan en `pagehide`. Solo quedan geometrías estáticas top-level compartidas en `streets.ts`/`vegetation.ts`.
- **Evidencia:** Métodos `dispose()` en `src/renderer/renderer.ts`, `src/renderer/lighting/atmosphere.ts`, `src/core/input.ts` y cierre `pagehide` en `src/main.ts`.
- **Impacto:** Desmontaje seguro sin fugas de listeners ni recursos principales WebGL/WASM en ciclo de vida estándar.
- **Solución propuesta:** Integrar las geometrías top-level restantes en `DistrictResources` cuando proceda.
- **Referencias:** `TASK-0003`, `ADR-0014`.

### `VB-009` — Asignaciones de arrays/sets temporales por tick (`60 Hz`) y frame
- **Prioridad:** P2 — Medio
- **Estado:** Resuelto (en Fase 7 sobre `173aa01`)
- **Sistema afectado:** Orquestador / Física / Render
- **Archivo o símbolo:** `src/physics/vehicle-obstacles.ts` (`update`), `src/simulation/engine.ts` (`roadObstaclesScratch`), `src/main.ts` (`shadowSources`, `combinedRoutesScratch`)
- **Descripción:** Preasignados `present`, `position`, `rotation` en `vehicle-obstacles.ts`, `roadObstaclesScratch` en `engine.ts` y `shadowSources`/`combinedRoutesScratch` en `main.ts`, eliminando spreads `[...]` y `new Set()` por tick/frame.
- **Evidencia:** Lectura directa de `vehicle-obstacles.ts`, `engine.ts` y `main.ts`; `phys=0.20ms` y `0` errores en Chromium.
- **Impacto:** Reduce presión sobre el recolector de basura a `60 Hz`.
- **Solución propuesta:** Implementado (`ADR-0014`).
- **Referencias:** `TASK-0005`, `ADR-0014`.

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
- **Estado:** Resuelto (en Fase 7 sobre `173aa01`)
- **Sistema afectado:** Renderizado
- **Archivo o símbolo:** `src/renderer/renderer.ts` (`render`), `src/renderer/resolution.ts` (`createFrameBudget`)
- **Descripción:** `createRenderer` mide `renderCpuMs` en `renderer.render(...)` y lo pasa a `createFrameBudget.sample(now, adaptive, renderCpuMs)`. Si `cpuAverage < 6.5 ms` en una pantalla a `30 Hz` (`~33 ms`), mantiene escala `1.0` sin degradación falsa; solo baja escala bajo sobrecarga real.
- **Evidencia:** `tests/optimization-and-streaming.test.ts` verifica escala `1.0` sostenida a `33 ms` con `2.5 ms` CPU frente a escalado descendente con `15 ms` CPU.
- **Impacto:** Nitidez completa en monitores `30 Hz` / modo ahorro sin perder adaptación real ante GPU pesada.
- **Solución propuesta:** Implementado (`ADR-0014`).
- **Referencias:** `TASK-0005`, `ADR-0014`.

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
- **Estado:** Parcialmente mitigado (`53` pruebas en `19` archivos + smoke/E2E Chromium WebGL 2)
- **Sistema afectado:** Calidad / DevOps
- **Archivo o símbolo:** `tests/*.test.ts`, `package-lock.json` (`picomatch@4.0.7`)
- **Descripción:** La suite ha crecido de 27 a 53 pruebas cubriendo simulación, eventos, entidades, percepción, cerebro NPC, navegación, asaltos, destructibles, teléfono, policía investigativa, streaming físico/visual, heurística 30 Hz y flujo E2E; siguen sin pruebas unitarias DOM/WebAudio aisladas `minimap`, `preferences` y `audio`. `picomatch@4.0.7` (dev) conserva el aviso `GHSA-fc5q-39xc-vjpf`.
- **Evidencia:** Inventario `tests/*.test.ts` (`19` archivos, `53` pruebas verdes).
- **Impacto:** Bajo riesgo de regresión en simulación central; queda cobertura unitaria menor en audio/DOM aislados.
- **Solución propuesta:** Añadir tests unitarios específicos para `preferences`/`minimap`/`audio` si se modifican y vigilar actualización dev.
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


### Integración Mercado Palma

Las compras y cajas tienen estado de sesión y se restablecen con el reinicio. La grabación del teléfono existente sigue siendo metadatos de acontecimientos, sin replay de video verificado. SwiftShader solo se usa para comprobar flujos, no para certificar fluidez.
