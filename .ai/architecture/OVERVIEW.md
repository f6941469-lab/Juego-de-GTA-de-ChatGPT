---
document_id: ARCH-OVERVIEW
status: active
last_updated: 2026-11-20
verified_against: "248f8b44b7aebf77fc38a0d5c0bde996e680cec5"
verification_scope: "static-analysis-only"
---

# Visión General de Arquitectura (`OVERVIEW.md`)

## Patrón arquitectónico real
**Arquitectura modular funcional con orquestador (`src/main.ts`), bus de eventos espacial (`WorldEventBus`) y registro de entidades (`EntityRegistry`).** Cada subsistema se crea mediante una función fábrica (`create*` / `build*`) o clase focalizada (`FixedLoop`, `SpatialBoxGrid`) y avanza a paso fijo de `60 Hz` con `physics.step(dt)` centralizado.

```mermaid
flowchart TD
    MAIN["src/main.ts (Bootstrap + Loop + Orquestación)"]
    UI["src/ui/ (DOM, HUD, Minimapa)"]
    IN["src/core/input.ts + fixed-loop.ts + events.ts (WorldEventBus)"]
    PERS["src/persistence/preferences.ts"]

    subgraph SIM ["Simulación 60 Hz"]
        ENT["src/simulation/entities.ts (EntityRegistry + LOD Tiers)"]
        PHY["src/physics/ (Rapier WASM + SpatialBoxGrid + step centralizado)"]
        PLR["src/player/ (Movimiento + FollowCamera)"]
        VEH["src/vehicles/ (Rayo GT)"]
        TRF["src/ai/traffic/ + navigation/ (road-graph + pedestrian-graph)"]
        NPC["src/ai/perception.ts + ai/npc/ (Percepción + Utility/FSM)"]
        POL["src/ai/police/ (Patrullas + Wanted)"]
    end

    subgraph WORLD ["Mundo Procedural"]
        DIST["src/world/district.ts + stores.ts + streaming.ts"]
        GEN["src/world/generation/*"]
    end

    subgraph PRES ["Presentación"]
        REN["src/renderer/ + shaders/sky.ts"]
        MOD["avatar.ts + vehicle-model.ts + traffic-visuals.ts + signals.ts"]
        AUD["src/audio/"]
        DBG["src/debug/ (stats + overlay + inspector)"]
    end

    MAIN --> IN & UI & PERS & SIM & WORLD & PRES
    DIST -- "StaticBox[]" --> PHY
    PHY -- "SpatialBoxGrid" --> POL & NPC
    DIST -- "DistrictMap" --> TRF & UI
    PHY --> PLR & VEH
    ENT <--> NPC & POL & TRF
    IN -- "WorldEventBus" --> NPC & DBG
```

## Límites entre componentes y separación de responsabilidades
- **Lógica vs. UI (`src/ui/`):** Separación limpia. `ui.ts` no importa física, mundo ni renderizador; solo recibe `HudState`/`DistrictMap` y dispara callbacks.
- **Simulación vs. Render (`FixedLoop` vs `rAF`):** Las entidades guardan estado actual/anterior e interpolan con `alpha`. `physics.step(dt)` se ejecuta una única vez por tick fijo (`VB-001` resuelto).
- **No omnisciencia de eventos:** `WorldEventBus` acota eventos por radio y TTL; los observadores deben filtrar mediante `evaluatePerception` (FOV + `SpatialBoxGrid.clearLine` + atenuación acústica).
- **Fronteras todavía sensibles:**
  1. `src/main.ts` aún concentra reglas de sesión/salud; su extracción a `SimulationEngine` queda para consolidación posterior.
  2. `vehicle.render()` debe ejecutarse antes que `player.render()` para que la cámara lea la pose interpolada del coche (`VB-012`).
  3. `coast.ts` busca la luz solar dinámicamente en `scene.children`.
