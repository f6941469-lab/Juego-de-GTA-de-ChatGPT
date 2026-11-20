---
document_id: ARCH-OVERVIEW
status: active
last_updated: 2026-11-20
verified_against: "45aefd3-dirty (Phase 3)"
verification_scope: "typecheck-tests-build-phase3"
---

# Visión General de Arquitectura (`OVERVIEW.md`)

## Patrón arquitectónico real
**Arquitectura modular funcional con orquestador separado en `SimulationEngine` (`src/simulation/engine.ts`), bus de eventos espacial (`WorldEventBus`) y registro de entidades (`EntityRegistry`).** `src/main.ts` queda limitado a arranque, bucle `rAF`, UI, audio y herramientas de diagnóstico; cada tick fijo (`60 Hz`) ejecuta una única llamada centralizada `physics.step(dt)`.

```mermaid
flowchart TD
    MAIN["src/main.ts (Arranque + rAF + Audio + Debug)"]
    UI["src/ui/ (DOM, HUD, Minimapa)"]
    IN["src/core/input.ts + fixed-loop.ts + events.ts (WorldEventBus)"]
    PERS["src/persistence/preferences.ts"]
    ENG["src/simulation/engine.ts (SimulationEngine)"]

    subgraph SIM ["Simulación 60 Hz"]
        ENT["src/simulation/entities.ts (EntityRegistry + LOD Tiers)"]
        PHY["src/physics/ (Rapier WASM + SpatialBoxGrid + step centralizado)"]
        PLR["src/player/ (Movimiento + Weapons + FollowCamera)"]
        VEH["src/vehicles/ (vehicle-manager + Rayo GT + robados)"]
        TRF["src/ai/traffic/ + navigation/ (road-graph + pedestrian-graph)"]
        NPC["src/ai/perception.ts + ai/npc/ (Población instanciada + Testigos + Utility/FSM)"]
        POL["src/ai/police/ (Patrullas + Combate LOS + Wanted)"]
    end

    subgraph WORLD ["Mundo Procedural"]
        DIST["src/world/district.ts + stores.ts (9 tiendas enterables) + streaming.ts"]
        GEN["src/world/generation/*"]
    end

    subgraph PRES ["Presentación"]
        REN["src/renderer/ + shaders/sky.ts"]
        MOD["avatar.ts + vehicle-model.ts + traffic-visuals.ts + npc-visuals.ts + signals.ts"]
        AUD["src/audio/"]
        DBG["src/debug/ (stats + overlay + inspector)"]
    end

    MAIN --> IN & UI & PERS & ENG & PRES
    ENG --> SIM & DIST
    DIST -- "StaticBox[]" --> PHY
    PHY -- "SpatialBoxGrid" --> POL & NPC
    DIST -- "DistrictMap" --> TRF & UI
    PHY --> PLR & VEH
    ENT <--> NPC & POL & TRF & VEH
    IN -- "WorldEventBus" --> NPC & DBG
```

## Límites entre componentes y separación de responsabilidades
- **Lógica vs. UI (`src/ui/`):** Separación limpia. `ui.ts` no importa física, mundo ni renderizador; recibe `HudState`/`DistrictMap` y el prompt ya calculado en `SimulationEngine.getInteractionPrompt()`.
- **Arranque vs. Simulación (`main.ts` vs `simulation/engine.ts`):** `SimulationEngine` encapsula toda la lógica de mundo sin depender de DOM, audio o canvas WebGL, permitiendo ejecutar pruebas de integración completas headless.
- **No omnisciencia de eventos:** `WorldEventBus` acota eventos por radio y TTL; los observadores filtran mediante `evaluatePerception` (FOV + `SpatialBoxGrid.clearLine` a altura ocular `1.15 m` + atenuación acústica).
- **Fronteras todavía sensibles:**
  1. `vehicle.render()` debe ejecutarse antes que `player.render()` dentro de `engine.render()` para leer la pose interpolada del coche (`VB-012`).
  2. `coast.ts` busca la luz solar dinámicamente en `scene.children`.

