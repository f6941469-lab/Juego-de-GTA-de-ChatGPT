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
- **Estado:** Propuesta
- **Contexto:** Actualmente `character.move()` y `vehicle.step()` invocan `world.step()` internamente (`VB-001`), impidiendo simular más de un cuerpo físico controlado a la vez.
- **Decisión:** Mover `world.step()` a una función única `physics.step(dt)` ejecutada una vez por tick fijo en `SimulationEngine`/`main.ts`, leyendo contactos/poses después del paso.
- **Motivación:** Desbloquear múltiples vehículos dinámicos, física de objetos y NPCs simultáneos.
- **Alternativas consideradas:** Mantener ramas `if/else` en `main.ts` (insostenible al añadir 2+ entidades dinámicas).
- **Consecuencias positivas:** Autoridad física única y coherente.
- **Consecuencias negativas:** Requiere refactor menor en `player.ts`, `vehicle.ts` y tests asociados.
- **Sistemas afectados:** `physics/physics.ts`, `player/player.ts`, `vehicles/vehicle.ts`, `main.ts`.
- **Referencias:** [KNOWN_ISSUES.md](KNOWN_ISSUES.md) (`VB-001`), [AUDIT-0001-v0.2.0.md](audits/AUDIT-0001-v0.2.0.md).

### `ADR-0006` — Índice espacial para colisionadores estáticos y streaming físico futuro
- **Fecha:** 2026-11-20
- **Estado:** Propuesta
- **Contexto:** `clearLine()` recorre linealmente todos los `StaticBox` (`VB-002`) y Rapier retiene todo el mapa en memoria.
- **Decisión:** Indexar `StaticBox` por celdas `64×64 m` (alineadas a sectores) para consultas LOS/proximidad `O(celdas)` y preparar activación/desactivación física por ventana activa.
- **Motivación:** Permitir ciudades extensas con miles de edificios y múltiples agentes con LOS.
- **Alternativas consideradas:** BVH genérico (más complejo que una rejilla uniforme alineada con sectores `64 m`).
- **Consecuencias positivas:** Acelera `police.ts` inmediatamente y habilita streaming físico posterior.
- **Consecuencias negativas:** Requiere sincronizar la inserción de cajas entre generadores y rejilla espacial.
- **Sistemas afectados:** `world/district.ts`, `physics/physics.ts`, `ai/police/police.ts`.
- **Referencias:** [KNOWN_ISSUES.md](KNOWN_ISSUES.md) (`VB-002`).
