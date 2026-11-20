---
document_id: ARCH-EXECUTION-FLOW
status: archived
last_updated: 2026-11-20
verified_against: "248f8b44b7aebf77fc38a0d5c0bde996e680cec5"
verification_scope: "static-analysis-only"
---


> ARCHIVO HISTÓRICO DEL SISTEMA ANTERIOR (hasta `d565cdc`). Desde 0.3.0 estos contratos no describen el código activo. Consulta [.ai/CURRENT_STATE.md](../CURRENT_STATE.md) y `.ai/SIMULATION.md` para la versión Mercado Palma.

# Flujo de Ejecución (`EXECUTION_FLOW.md`)

## 1. Inicialización (`startGame` en `src/main.ts`)
1. Obtiene `#game-canvas`, instancia `FixedLoop(1/60)`, `FrameStats`, `createGameAudio()`, `createUI(...)` (estado `'loading'`) y `createInput(...)` (inactivo).
2. Crea `Scene`, dos `PerspectiveCamera` (`camera` 58° juego, `intro` 54° portada) y `createRenderer(canvas)`.
3. Construye síncronamente el mundo base vía `buildDistrict(scene, gameConfig.seed)` (asfalto/aceras base, skyline, agua, sectores iniciales y `StaticBox[]`) y `createAtmosphere(scene, hour)`.
4. Carga en paralelo (`Promise.all`): inicialización WASM de Rapier + inserción de todos los `StaticBox` (`createPhysics`), y preferencias guardadas (`loadQuality`, `loadAudioPreference`).
5. Instancia `player`, `vehicle`, `traffic`, `police`, `physicalTraffic`, `shadows` y `overlay`.
6. Configura `ResizeObserver` en el canvas, pasa a `mode = 'start'` y arranca `requestAnimationFrame(frame)`.

## 2. Ciclo principal (`frame` y `step`)

```mermaid
sequenceDiagram
    participant RAF as requestAnimationFrame
    participant LOOP as FixedLoop (1/60 s)
    participant AI as Traffic + Police + Obstacles
    participant PHY as Player / Vehicle (Rapier step)
    participant VIS as Render + Atmosphere + Streaming + Audio + UI

    RAF->>LOOP: advance(dt, step) [solo si mode === 'playing']
    loop Mientras pendingSeconds >= 1/60 s (máx 0.1 s/frame)
        LOOP->>AI: input.read() -> traffic.step() -> police.step() -> physicalTraffic.update()
        LOOP->>PHY: vehicle.active ? vehicle.step() : player.step()
        Note over PHY: Ejecuta Rapier world.step() internamente
        LOOP->>LOOP: Evaluar daño por impacto, detención, respawn y hora del día
    end
    LOOP-->>RAF: alpha ∈ [0, 1)
    RAF->>VIS: vehicle.render() -> player.render() -> traffic.render() -> police.render()
    RAF->>VIS: atmosphere.update() -> district.update() -> shadows.update()
    RAF->>VIS: ui.update() -> audio.update() (cada 42 ms) -> display.render()
```

## 3. Reglas de actualización y estados de sesión
- **Modos (`GameMode`):** `'loading'` -> `'start'` <-> `'playing'` <-> `'paused'` (o `'error'`).
- En `'start'`: el reloj de simulación está detenido; gira suavemente la cámara `intro` mirando a `(-12, 7.2, -32)`, se actualizan atmósfera, agua y streaming alrededor de `intro.position`.
- En `'paused'`: `FixedLoop` no avanza, `audio.setPaused(true)` silencia `world.gain` y se muestra `<dialog>` modal.
- En `'playing'`: `audio.unlock()` se dispara en el primer clic (`play()`), `input` captura Pointer Lock si el dispositivo tiene puntero fino (`any-pointer: fine`).

## 4. Cierre y liberación de recursos
- `audio.ts` escucha `window.pagehide` y cierra `AudioContext` si `!event.persisted`.
- Existen `dispose()` en `physics`, `player`, `avatar`, `vehicle`, `traffic`, `signals`, `traffic-visuals`, `district`, `streaming`, `contact-shadows`.
- **Brecha (`VB-008`):** `renderer`, `atmosphere`, `police`, `overlay`, `input` y las geometrías top-level de `streets.ts`/`vegetation.ts` no tienen `dispose()`.
