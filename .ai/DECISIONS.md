---
document_id: CORE-DECISIONS
status: active
last_updated: 2026-11-20
verified_against: "248f8b44b7aebf77fc38a0d5c0bde996e680cec5"
verification_scope: "static-analysis-only"
---

# Registro de Decisiones de Arquitectura (`DECISIONS.md`)

Consolida las decisiones del documento raíz [DECISIONS.md](../DECISIONS.md) junto con decisiones arquitectónicas identificadas en código y propuestas futuras.

---

### `ADR-0001` — Three.js (WebGL 2) y Rapier3D WASM sin motor comercial
- **Fecha:** 2026-11-18
- **Estado:** Implementada
- **Contexto:** Se requiere un juego 3D de mundo abierto en navegador con control total del pipeline y sin motores generalistas (Unity, Unreal, Godot).
- **Decisión:** Utilizar `three@0.183.2` para renderizado WebGL 2 y `@dimforge/rapier3d-compat@0.19.3` (WASM) para física, empaquetados con Vite `7.3.8` como SPA estática.
- **Motivación:** Independencia tecnológica, ejecución sin servidor de simulación, licencias permisivas (MIT / Apache-2.0) y control fino de buffers/shaders.
- **Alternativas consideradas:** Motores comerciales (descartados por restricción de proyecto), WebGL raw sin librería de escena (coste excesivo inicial), Cannon-es (menor robustez de character controller/CCD que Rapier).
- **Consecuencias positivas:** Pipeline transparente, carga estática rápida, árbol de dependencias mínimo.
- **Consecuencias negativas:** Exige implementar manualmente herramientas de streaming, LOD, culling avanzado y UI.
- **Sistemas afectados:** `renderer/`, `physics/`, `world/`, `vehicles/`, `player/`.
- **Referencias:** [package.json](../package.json), [DECISIONS.md](../DECISIONS.md).

### `ADR-0002` — Simulación a paso fijo (`60 Hz`) desacoplada del renderizado interpolado
- **Fecha:** 2026-11-18
- **Estado:** Implementada
- **Contexto:** Los navegadores ejecutan `requestAnimationFrame` a frecuencias variables (30–144+ Hz) y pueden sufrir pausas de pestaña.
- **Decisión:** Integrar lógica y física mediante `FixedLoop(1/60, 0.1)` en `src/core/fixed-loop.ts` y pasar `alpha` a los métodos `render()` para interpolar poses visuales.
- **Motivación:** Respuesta física determinista e independiente del framerate del monitor.
- **Alternativas consideradas:** Paso variable `dt` directo en Rapier (inestable ante caídas de FPS).
- **Consecuencias positivas:** Consistencia entre pruebas headless y navegador.
- **Consecuencias negativas:** Requiere almacenar `previousPosition`/`previousHeading` en cada entidad móvil.
- **Sistemas afectados:** `core/fixed-loop.ts`, `main.ts`, `player.ts`, `vehicle.ts`, `traffic.ts`, `police.ts`.
- **Referencias:** [fixed-loop.ts](../src/core/fixed-loop.ts), [DECISIONS.md](../DECISIONS.md).

### `ADR-0003` — Generación 100 % procedural de mundo, texturas y audio basada en semilla
- **Fecha:** 2026-11-18
- **Estado:** Implementada
- **Contexto:** Minimizar dependencias de assets binarios externos y garantizar reproducibilidad de escenarios.
- **Decisión:** Generar distrito, edificios, vegetación, `DataTexture`s, shaders (cielo/agua/sombras) y síntesis Web Audio íntegramente por código determinista (`makeRandom`).
- **Motivación:** Cero assets multimedia pesados que descargar, fácil diagnóstico por coordenadas/semilla y estética cúbica coherente.
- **Alternativas consideradas:** Modelos `.glb` y texturas PNG externos (mayor peso de red y pipeline de arte).
- **Consecuencias positivas:** Bundle ligero, carga instantánea y determinismo verificable en tests.
- **Consecuencias negativas:** Mayor esfuerzo de programación para lograr variedad visual y detalles orgánicos o interiores complejos.
- **Sistemas afectados:** `world/generation/*`, `shaders/sky.ts`, `audio/*`, `vehicles/vehicle-model.ts`, `characters/avatar.ts`.
- **Referencias:** [layout.ts](../src/world/generation/layout.ts), [audio.ts](../src/audio/audio.ts), [DECISIONS.md](../DECISIONS.md).

### `ADR-0004` — Instanciación por lotes (`InstancedMesh`) y streaming visual por sectores de `64 m`
- **Fecha:** 2026-11-18
- **Estado:** Implementada
- **Contexto:** Al ampliar Costa Palmera en `0.2.0`, dibujar miles de cajas individuales excedería el presupuesto de draw calls.
- **Decisión:** Agrupar primitivas estáticas en `DistrictGeometry` (`InstancedMesh` por geometría/acabado/sombra) y activar/detallar sectores de `64×64 m` según distancia al foco (`69 m` detalle, `142 m` silueta), manteniendo los `StaticBox` físicos residentes.
- **Motivación:** Reducir draw calls preservando continuidad física y de navegación de tráfico/policía.
- **Alternativas consideradas:** Un único mesh estático global (no escala) o streaming físico simultáneo (diferido por complejidad).
- **Consecuencias positivas:** Bajo nº de draw calls y liberación GPU al alejarse de un sector.
- **Consecuencias negativas:** Reconstrucción síncrona en el hilo principal (`VB-003`) y física estática no escalable a múltiples kilómetros (`VB-002`).
- **Sistemas afectados:** `world/streaming.ts`, `world/generation/geometry.ts`, `world/district.ts`.
- **Referencias:** [streaming.ts](../src/world/streaming.ts), [geometry.ts](../src/world/generation/geometry.ts).

### `ADR-0005` — Centralización de `world.step(dt)` en `PhysicsService`
- **Fecha:** 2026-11-20
- **Estado:** Implementada
- **Contexto:** Anteriormente `character.move()` y `vehicle.step()` invocaban `world.step()` internamente (`VB-001`), impidiendo simular más de un cuerpo físico controlado a la vez.
- **Decisión:** Mover `world.step(dt)` a una función única `physics.step(dt)` ejecutada una vez por tick fijo en `main.ts`, usando `prepareStep`/`finishStep` en jugador y vehículo tras el paso. Se mantienen envoltorios de compatibilidad en `move()` y `step()` para pruebas aisladas.
- **Motivación:** Desbloquear múltiples vehículos dinámicos, física de objetos y NPCs simultáneos.
- **Alternativas consideradas:** Mantener ramas `if/else` en `main.ts` (insostenible al añadir 2+ entidades dinámicas).
- **Consecuencias positivas:** Autoridad física única y coherente por tick fijo.
- **Consecuencias negativas:** Exige respetar el orden `prepareStep` → `physics.step(dt)` → `finishStep` en el bucle principal.
- **Sistemas afectados:** `physics/physics.ts`, `player/player.ts`, `vehicles/vehicle.ts`, `main.ts`.
- **Referencias:** [KNOWN_ISSUES.md](KNOWN_ISSUES.md) (`VB-001`), [AUDIT-0001-v0.2.0.md](audits/AUDIT-0001-v0.2.0.md).

### `ADR-0006` — Índice espacial para colisionadores estáticos y streaming físico futuro
- **Fecha:** 2026-11-20
- **Estado:** Parcialmente implementada
- **Contexto:** `clearLine()` recorría linealmente todos los `StaticBox` (`VB-002`) y Rapier retiene todo el mapa en memoria.
- **Decisión:** Indexar `StaticBox` en `SpatialBoxGrid` (`src/physics/spatial-index.ts`, celdas `32×32 m` con sello `Uint32Array` y omisión de losas de suelo `y + halfY <= 0.05`) para consultas `raycast`, `clearLine` y `queryRadius` `O(celdas)`, preparando activación/desactivación física futura.
- **Motivación:** Permitir ciudades extensas con miles de edificios y múltiples agentes con línea de visión simultánea.
- **Alternativas consideradas:** BVH genérico (más complejo que una rejilla uniforme con DDA).
- **Consecuencias positivas:** Acelera `police.ts` y `PerceptionSystem` inmediatamente y deja lista la base de proximidad espacial.
- **Consecuencias negativas:** El streaming de cuerpos rígidos en Rapier queda pendiente para etapas posteriores.
- **Sistemas afectados:** `physics/spatial-index.ts`, `physics/physics.ts`, `ai/police/police.ts`, `ai/perception.ts`.
- **Referencias:** [KNOWN_ISSUES.md](KNOWN_ISSUES.md) (`VB-002`).

### `ADR-0007` — Bus central de eventos no omnisciente y registro dinámico de entidades por nivel de detalle
- **Fecha:** 2026-11-20
- **Estado:** Implementada
- **Contexto:** Los sistemas de juego se acoplaban directamente en `main.ts` sin propagación espacial ni memoria temporal de acontecimientos del mundo.
- **Decisión:** Introducir `WorldEventBus` (`src/core/events.ts`, historial acotado a 256 eventos y TTL `30 s`, consultas espaciales `queryNear`) y `EntityRegistry` (`src/simulation/entities.ts`, cubetas espaciales `32 m`, arrays reutilizados y `computeSimulationTier` con umbrales `high <= 65 m`, `medium <= 135 m`, `low > 135 m`).
- **Motivación:** Habilitar situaciones emergentes donde cada agente o sistema reacciona únicamente a eventos percibibles dentro de su radio e intensidad reales.
- **Alternativas consideradas:** Callbacks directos entre módulos (alto acoplamiento y ausencia de filtrado espacial/temporal).
- **Consecuencias positivas:** Desacopla emisor y oyentes y evita asignaciones por frame en consultas de proximidad.
- **Consecuencias negativas:** Requiere mantener sincronizadas las altas/bajas de entidades y avanzar el reloj del bus por tick.
- **Sistemas afectados:** `core/events.ts`, `simulation/entities.ts`, `main.ts`, `debug/inspector.ts`.
- **Referencias:** [NPC_AND_PERCEPTION.md](systems/NPC_AND_PERCEPTION.md), [CORE_AND_INPUT.md](systems/CORE_AND_INPUT.md).

### `ADR-0008` — Percepción realista, cerebro NPC híbrido Utilidad/FSM y grafo peatonal con evitación local
- **Fecha:** 2026-11-20
- **Estado:** Implementada
- **Contexto:** Para dotar de vida autónoma y reaccionar de forma creíble en fases sucesivas, los NPC necesitan un modelo sensorial, cognitivo y de navegación separado del renderizado y de `src/ui/`.
- **Decisión:** Implementar `PerceptionSystem` (`src/ai/perception.ts` con cono visual + LOS + temporizador de reconocimiento `0.35 s` y atenuación auditiva por muros `0.42`), perfiles deterministas (`src/ai/npc/profiles.ts`, 10 roles), `NpcBrain` híbrido Utilidad/FSM (`src/ai/npc/npc-brain.ts`, 17 estados emocionales, 9 intenciones, memoria limitada a 8 entradas y `TTL = 26 s` con histéresis) y `PedestrianGraph` (`src/navigation/pedestrian-graph.ts` con A* MinHeap sobre aceras, cruces, puentes y puertas de tiendas + evitación local `steerPedestrian`).
- **Motivación:** Preparar una base determinista y testeable sin lógica en UI antes de instanciar multitudes y rutinas completas en Fase 2.
- **Alternativas consideradas:** Máquina de estados rígida sin puntuaciones ni memoria (comportamientos repetitivos y poco creíbles).
- **Consecuencias positivas:** Comportamiento emergente calibrable y verificado con pruebas unitarias deterministas.
- **Consecuencias negativas:** Mayor número de parámetros de calibración emocional y de navegación por rol.
- **Sistemas afectados:** `ai/perception.ts`, `ai/npc/profiles.ts`, `ai/npc/npc-brain.ts`, `navigation/pedestrian-graph.ts`, `world/district.ts`.
- **Referencias:** [NPC_AND_PERCEPTION.md](systems/NPC_AND_PERCEPTION.md).

### `ADR-0009` — Multitud NPC en `InstancedMesh`, multi-vehículo con robo de tráfico e interiores locales en Fase 2
- **Fecha:** 2026-11-20
- **Estado:** Implementada
- **Contexto:** Tras completar los cimientos de Fase 1, `main.ts` seguía concentrando la orquestación de simulación y faltaban peatones reales, conductores dentro del tráfico e interiores accesibles en las tiendas.
- **Decisión:**
  1. Extraer la orquestación fija de mundo a `createSimulationEngine` (`src/simulation/engine.ts`).
  2. Renderizar hasta 72 NPCs mediante 7 `InstancedMesh` compartidos (`npc-visuals.ts`) simulados por tiers (`npc-population.ts`) y elevar la altura ocular de `PerceptionSystem` a `minY = 1.15 m` para ver por encima de mostradores (`1.04 m`) sin atravesar muros.
  3. Añadir conductores deterministas en `traffic.ts` + `traffic-visuals.ts`, robo cercano (`hijackNearest`) y un pool físico multi-vehículo (`createVehicleManager` en `src/vehicles/vehicle-manager.ts`, máx. 4 coches).
  4. Convertir las 9 tiendas en edificios con planta baja hueca (`buildingColliders` en `buildings.ts`, `StoreInteriorLayout` en `stores.ts`) accesibles caminando desde la acera hasta el mostrador.
- **Motivación:** Lograr vida urbana auténtica, sistémica y verificable físicamente con Rapier manteniendo draw calls mínimos en GPU.
- **Alternativas consideradas:** Clonar `createAvatar()` por cada NPC (~1.500 mallas individuales inaceptables en WebGL); teletransportar a escenas interiores separadas (rompe continuidad espacial y percepción puerta-calle).
- **Consecuencias positivas:** ~7 draw calls para toda la multitud NPC, 9 tiendas enterables verificadas físicamente y transición continua al robar coches del tráfico.
- **Consecuencias negativas:** Los mostradores interior/puerta requieren mantener `minY >= 1.1` en consultas LOS humanas.
- **Sistemas afectados:** `simulation/engine.ts`, `ai/npc/npc-{visuals,population}.ts`, `ai/perception.ts`, `ai/traffic/traffic*.ts`, `vehicles/vehicle*.ts`, `world/generation/buildings.ts`, `world/{district,stores}.ts`, `main.ts`.
- **Referencias:** [NPC_AND_PERCEPTION.md](systems/NPC_AND_PERCEPTION.md), [VEHICLES.md](systems/VEHICLES.md), [WORLD_AND_STREAMING.md](systems/WORLD_AND_STREAMING.md).

### `ADR-0010` — Balística por `SpatialBoxGrid`, testigos 911 interrumpibles y asalto progresivo sin omnisciencia (Fase 3)
- **Fecha:** 2026-11-20
- **Estado:** Implementada
- **Contexto:** Faltaban armas jugables, percepción real de amenazas armadas, asaltos complejos con cooperación/botín y combate recíproco policial sin que la policía reaccionara mágicamente ante delitos aislados.
- **Decisión:**
  1. Implementar `createWeaponSystem` (`src/player/weapons.ts`) con 3 ranuras (`unarmed`, `pistol`, `carbine`), trazadores instanciados (`InstancedMesh`) y raycast balístico detenido por edificios en `SpatialBoxGrid.raycast` (`minY: 1.15, maxY: 1.8`).
  2. Emitir eventos perceptibles `weapon_drawn`, `weapon_aimed`, `shot_fired`, `npc_injured`, `witness_detected` y `robbery_finished` en `WorldEventBus`, interrumpiendo llamadas 911 si el testigo es intimidado o derribado antes de `2.1 s`.
  3. Sustituir el robo instantáneo por `beginHeist` / `stepHeist` en `stores.ts` con cooperación del dependiente (`intimidateStoreClerk`), aceleración bajo apuntado/tiros y pago de botín (`cash`) parcial o completo.
  4. Añadir fuego recíproco policial en `police.ts` (`wanted.level >= 2`, `< 25 m`, `clearLine` real) respetando cobertura sólida.
- **Motivación:** Conseguir delitos emergentes coherentes donde el sigilo, la cobertura arquitectónica y la intimidación tengan impacto real en la respuesta de ciudadanos y patrullas.
- **Alternativas consideradas:** Usar solo sensores de proximidad sin `SpatialBoxGrid` (las balas y la policía atravesarían paredes); activar estrellas automáticamente al disparar sin testigos.
- **Consecuencias positivas:** Balística y combate policial deterministas, bajo coste gráfico (`1` `InstancedMesh` de trazadores) y asaltos con riesgo/recompensa reales.
- **Consecuencias negativas:** Requiere cobertura de tests específica ante futuros ajustes de alcance o tiempos de llamada (`tests/combat-and-heists.test.ts`).
- **Sistemas afectados:** `player/{weapons,player}.ts`, `characters/avatar.ts`, `core/input.ts`, `world/stores.ts`, `ai/npc/npc-population.ts`, `ai/police/police.ts`, `simulation/engine.ts`, `audio/audio.ts`, `ui/ui.ts`.
- **Referencias:** [PLAYER_AND_CAMERA.md](systems/PLAYER_AND_CAMERA.md), [NPC_AND_PERCEPTION.md](systems/NPC_AND_PERCEPTION.md), [POLICE_AND_WANTED.md](systems/POLICE_AND_WANTED.md).

### `ADR-0011` — Entorno destructible instanciado sobre Rapier y accidentes viales con eyección (Fase 4)
- **Fecha:** 2026-11-20
- **Estado:** Implementada
- **Contexto:** Faltaban escaparates fracturables, mobiliario urbano con colisión destructible, efectos acotados de escombros/agua/humo, daño vehicular y accidentes reales con huida de ocupantes.
- **Decisión:**
  1. Sustituir los cristales estáticos de planta baja en `buildings.ts` por marcos huecos y delegar las `18` vidrieras fracturables más mobiliario físico (`hydrant`, `bollard`, `crate`, `bench`) en `createDestructibles` (`src/world/destructibles.ts`) con `4` `InstancedMesh` y colisionadores Rapier removibles dinámicamente al romperse.
  2. Acotar escombros (`maxDebris = 96`) y chorros de hidrante/humo (`maxPlumes = 64`) en anillo fijo con caída y limpieza por TTL.
  3. Añadir salud/degradación mecánica (`health`, `damage`, `wrecked`, `applyDamage`) a `vehicle.ts` y `traffic.ts` (`damageVehicle`, `resolveVehicleCrash`), emitiendo `'traffic_accident'`, humo instanciado, tinte de daño en `traffic-visuals.ts`, evacuación del conductor (`fromAccident: true`) y aproximación cívica de transeúntes cercanos.
- **Motivación:** Lograr destrucción reactiva real sin reconstruir sectores estáticos de `streaming.ts` y mantener draw calls constantes en GPU.
- **Alternativas consideradas:** Reconstruir chunks de `DistrictGeometry` en cada cristal roto (causaría microcortes en el hilo principal); crear cuerpos `Dynamic` permanentes para cientos de fragmentos en Rapier (mayor coste WASM y GC).
- **Consecuencias positivas:** Cero reconstrucciones de sectores al romper props, apertura física real del camino en Rapier al destruir cajas/hidrantes/bolardos, y eventos reales `'glass_broken'`, `'object_destroyed'` y `'traffic_accident'` integrados en `WorldEventBus`.
- **Consecuencias negativas:** Los props destructibles se definen deterministamente en `createDestructibles` separados del mapa de sectores estáticos.
- **Sistemas afectados:** `world/{destructibles,generation/buildings}.ts`, `vehicles/vehicle.ts`, `ai/traffic/traffic*.ts`, `ai/npc/npc-population.ts`, `player/weapons.ts`, `audio/audio.ts`, `simulation/engine.ts`.
- **Referencias:** [WORLD_AND_STREAMING.md](systems/WORLD_AND_STREAMING.md), [VEHICLES.md](systems/VEHICLES.md), [TRAFFIC_AND_NAVIGATION.md](systems/TRAFFIC_AND_NAVIGATION.md).

### `ADR-0012` — Teléfono móvil diegético, viralización urbana y resolución de `VB-015` (Fase 5)
- **Fecha:** 2026-11-20
- **Estado:** Implementada
- **Contexto:** Faltaba un teléfono diegético integrado con el mundo simulado y las flechas direccionales (`ArrowUp`/`Down`/`Left`/`Right`) compartían acciones de movimiento en `input.ts` (`VB-015`).
- **Decisión:**
  1. Desacoplar las flechas del movimiento (`WASD` exclusivo para caminar/conducir) y asignar `ArrowUp`/`KeyM`/`#touch-phone` para abrir/alternar el teléfono, manteniendo `ArrowUp`/`Down`/`Left`/`Right`, `Enter`, `Backspace` y `Esc` como navegación contextual mientras el dispositivo está abierto (`input.setPhoneOpen`).
  2. Implementar `createPhoneSystem` (`src/simulation/phone.ts`) en la capa de simulación con cuatro aplicaciones (`camera`, `feed`, `emergency`, `alerts`), cámara capaz de emitir `'recording_started'` (`auditory: true, visual: true, radius: 16`) y publicar clips (`'video_published'`) con crecimiento de reproducciones según gravedad urbana.
  3. Mantener `src/ui/ui.ts` puramente presentacional: renderiza `PhoneSnapshot` en `#phone-device` mediante DOM seguro (`textContent`/`replaceChildren`) y reenvía comandos a `SimulationEngine.sendPhoneCommand`.
  4. Confirmar estímulos visuales cercanos (`distance <= 14`) dentro de FOV+LOS directo en `perception.ts` y modelar la reacción NPC ante cámaras apuntando en `npc-brain.ts` (`filmedRecently`).
- **Motivación:** Mantener toda la lógica temporal/social del teléfono dentro de `SimulationEngine` (verificable en Node/Vitest sin navegador) y eliminar el conflicto de teclas `VB-015`.
- **Alternativas consideradas:** Gestionar clips y alertas directamente dentro de `src/ui/ui.ts` (rompería la regla de separación simulación/UI e impediría pruebas headless deterministas).
- **Consecuencias positivas:** Teléfono completamente determinista, integración nativa con `WorldEventBus`, reacciones diferenciadas de NPCs según rol (`citizen`, `criminal`, `merchant`) y cierre limpio de `VB-015`.
- **Consecuencias negativas:** Los jugadores acostumbrados a flechas para caminar deben usar `WASD` (documentado explícitamente en portada/controles).
- **Sistemas afectados:** `simulation/{phone,engine}.ts`, `core/input.ts`, `ai/{perception,npc/npc-brain}.ts`, `ui/ui.ts`, `ui/hud.css`, `index.html`, `main.ts`.
- **Referencias:** [CORE_AND_INPUT.md](systems/CORE_AND_INPUT.md), [NPC_AND_PERCEPTION.md](systems/NPC_AND_PERCEPTION.md), [UI_AND_DEBUG.md](systems/UI_AND_DEBUG.md).

### `ADR-0013` — Policía avanzada, patrullas GPU-instanciadas, memoria descriptiva y cerco a pie (Fase 6)
- **Fecha:** 2026-11-20
- **Estado:** Implementada
- **Contexto:** Faltaban perímetros tácticos reales, unidades a pie para investigar tiendas/callejones y memoria de descripción del sospechoso, además de resolver `VB-004` (evitación de tráfico civil y margen real) y `VB-005` (draw calls por patrulla).
- **Decisión:**
  1. Sustituir `createVehicleModel()` por `createPoliceVisuals(scene, 8)` (`src/ai/police/police-visuals.ts`) usando 4 `InstancedMesh` compartidos (`shells`, `wheels`, `lights`, `officers`) con luces/sirenas estroboscópicas y `dispose()` completo (`VB-005`, `VB-008`).
  2. Pasar `traffic.vehicles` como obstáculos a `police.step(..., obstacles)` en `SimulationEngine` y añadir doble sonda física (`0.94m` lateral + `1.15m` frontal) más frenado/evasión ante tráfico en cono frontal (`VB-004`).
  3. Añadir `SuspectDescription`, `ReportMetadata` (`kind`, `storeSiege`) y `matchesSuspect` en `wanted.ts`: al cambiar de vehículo o ir a pie desarmado fuera de línea de visión policial, el alcance de reconocimiento cae (`<= 16 m`) hasta identificarlo de cerca (`Búsqueda · Vehículo distinto`).
  4. Desplegar perímetros (`perimeter`) y cerco de tiendas (`storeSiege`) aparcando las patrullas al acercarse a `lastKnown` (`< 26 m` en tienda / `< 16 m` general) para que su oficial a pie (`foot_search`) inspeccione la zona con cono visual y `clearLine` propios.
- **Motivación:** Reducir draw calls policiales a coste constante, evitar omnisciencia policial tras cambiar de vehículo e integrar respuesta escalonada física y visual.
- **Alternativas consideradas:** Mantener un `createVehicleModel()` por patrulla con flag oculto o ignorar cambios de vehículo en `wanted.ts` (rompería la coherencia no omnisciente y mantendría `VB-004`/`VB-005`).
- **Consecuencias positivas:** `4` `InstancedMesh` fijos para hasta 8 patrullas + agentes a pie (`194` draw calls totales con `3` patrullas en vivo), sigilo vehicular real y cerco táctico verificable.
- **Consecuencias negativas:** Los agentes a pie usan navegación directa asistida por `clearLine` + sonda lateral sobre `SpatialBoxGrid` en lugar de grafos completos para mantener coste bajo.
- **Sistemas afectados:** `ai/police/{police-visuals,police,wanted}.ts`, `simulation/engine.ts`, `main.ts`.
- **Referencias:** [POLICE_AND_WANTED.md](systems/POLICE_AND_WANTED.md), [TRAFFIC_AND_NAVIGATION.md](systems/TRAFFIC_AND_NAVIGATION.md), [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

### `ADR-0014` — Streaming físico Rapier, presupuesto sectorial, heurística CPU 30 Hz y cierre de ciclo de vida (Fase 7)
- **Fecha:** 2026-11-20
- **Estado:** Implementada
- **Contexto:** Cerrar la deuda técnica P1/P2 restante del ecosistema urbano: `514` colisionadores estáticos cargados al arranque en Rapier (`VB-002`), reconstrucciones síncronas ilimitadas en `streaming.ts` (`VB-003`), asignaciones por tick en `vehicle-obstacles.ts`/`engine.ts`/`main.ts` (`VB-009`), falsa degradación de resolución en pantallas 30 Hz (`VB-011`), `dispose()` pendientes (`VB-008`) y cobertura E2E (`VB-014`).
- **Decisión:**
  1. Añadir `streamingRadius` opcional e incremental `streamFocus(x, z, force?)` en `createPhysics` (`src/physics/physics.ts`) con histéresis `+16 m` y distancia AABB 2D, manteniendo `SpatialBoxGrid` completo en memoria para balística y LOS a larga distancia (`VB-002`). En `main.ts` se activa con `streamingRadius = 112 m`, reduciendo los colisionadores vivos en Rapier de `514` a `131` en el punto de inicio.
  2. Limitar `createDistrictStreaming.update()` (`src/world/streaming.ts`) a `maxRebuilds = 1` sector sucio (el más cercano al foco) por frame tras la carga inicial, exponiendo `flush(focus)` y `pending` en `stats()` (`VB-003`).
  3. Añadir medición opcional `renderCpuMs` en `createRenderer` -> `createFrameBudget.sample(now, adaptive, renderCpuMs)` (`src/renderer/resolution.ts`) para evitar rebajas de resolución en 30 Hz cuando el trabajo CPU de render es `< 6.5 ms` (`VB-011`).
  4. Preasignar colecciones scratch en `vehicle-obstacles.ts`, `engine.ts` y `main.ts` (`VB-009`) y añadir `dispose()` en `renderer.ts`, `atmosphere.ts` e `input.ts` (`AbortController`) + evento `pagehide` en `main.ts` (`VB-008`).
- **Motivación:** Reducir picos de frame time en desplazamientos rápidos, rebajar presión física/GC y prevenir fugas de listeners/GPU.
- **Alternativas consideradas:** Reconstruir todos los sectores en Web Workers con serialización `Transferable` (complejidad innecesaria cuando el presupuesto `1 sector/frame` ya distribuye la carga sin tirones); descargar también `SpatialBoxGrid` (rompería la balística y visión policial a larga distancia).
- **Consecuencias positivas:** `74.5 %` menos colisionadores activos en Rapier al inicio (`131` vs `514`), reconstrucción visual progresiva sin bloqueos de frame y suite de `53/53` pruebas incluyendo ciclo E2E completo.
- **Consecuencias negativas:** En teletransportes instantáneos muy lejanos, la malla visual termina de hidratarse en varios frames salvo invocación explícita de `flush()`.
- **Sistemas afectados:** `physics/{physics,vehicle-obstacles}.ts`, `world/streaming.ts`, `renderer/{renderer,resolution,lighting/atmosphere}.ts`, `core/input.ts`, `simulation/engine.ts`, `main.ts`.
- **Referencias:** [PHYSICS_AND_COLLISIONS.md](systems/PHYSICS_AND_COLLISIONS.md), [RENDERING.md](systems/RENDERING.md), [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

## Integrar Mercado Palma sobre el motor de main

La rama work partía de `2ee553f`; main ya había evolucionado hasta `d0c70d9`. La integración conserva sus contratos de vehículos, mundo, streaming, NPC, armas, teléfono y policía. Se trasladan mercado, comercio/inventario y correcciones de entradas/cámara; los controladores de prototipo equivalentes se resuelven a favor de los sistemas existentes. El historial de work queda como segundo padre del merge. No se añaden dependencias.

## Sustitución completa por Mercado Palma 0.3.0

El usuario rechazó conservar el sistema y presentación anteriores tras comparar las capturas. Se sustituye todo el árbol operativo de src/ y sus pruebas por la entrega `5660edc`, y se retiran los módulos ajenos a ella. Cambia la entrada de SimulationEngine a Session y vuelven el HUD, teléfono, distrito compacto y controles de la captura de referencia. El historial de main se mantiene mediante un commit normal posterior a d565cdc. Los contratos anteriores quedan archivados, no se combinan ni se ejecutan como alternativa.

## Entrega portable de Mercado Palma 0.3.1

El usuario autorizó iniciar el plan que exige un solo HTML y conservar el runtime elegido. Se añade un generador basado en la API pública de Vite, sin introducir dependencias. El código permanece modular, la compilación web sigue en dist/ y la distribución autocontenida se incluye como jugar/index.html para que descargar el repositorio también traiga el archivo preparado. Se integran fuentes, CSS, JS clásico, WASM compat y licencias, con comprobación de igualdad reproducible; no se depende de módulos locales, CDN, servidor o Service Worker.

La restricción administrativa de file:// se respeta: prueba inline offline y apertura directa se registran como verificaciones diferentes. El guardado futuro será exportación/importación explícita por archivo y tendrá validación previa a aplicar estado; IndexedDB será solo una preferencia opcional. El alcance de esta entrega no incluye todavía guardado de partidas, ampliación de IA, LLM o historia.

## 2026-11-21 · Backend gráfico compartido y trabajo acotado

El usuario solicitó continuar el plan y utilizar WebGPU respetando los límites de carga. Se usa WebGPURenderer de la versión de Three ya fijada, con dispositivo WebGPU y compatibilidad WebGL 2. Cielo y agua se comparten como TSL. El renderizador inicializa y compila antes de habilitar la partida.

La base global conserva Session como coordinador y un único avance físico. Navigation limita las búsquedas de cada tick y reutiliza el espacio de trabajo. WorldState referencia las entidades originales y conserva instantáneas copiadas con cuotas. El alcance de 0.4.0 es la primera parte de la fase 2. Los contratos y verificaciones activas están en RENDERING.md y SIMULATION.md.
