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


