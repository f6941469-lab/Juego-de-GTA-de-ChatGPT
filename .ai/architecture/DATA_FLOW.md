---
document_id: ARCH-DATA-FLOW
status: active
last_updated: 2026-11-20
verified_against: "248f8b44b7aebf77fc38a0d5c0bde996e680cec5"
verification_scope: "static-analysis-only"
---

# Flujo de Datos (`DATA_FLOW.md`)

```mermaid
flowchart LR
    DOM["Eventos DOM / Pointer / Touch"] -->|createInput.read| CTRL["{ x, z, run, jump, handbrake, interact, horn, challenge }"]
    SEED["gameConfig.seed (240817)"] -->|buildDistrict| STATIC["StaticBox[] (x,y,z,halfX,halfY,halfZ)"]
    SEED -->|buildDistrict| DMAP["DistrictMap { bounds, roads, water, landmarks }"]

    STATIC -->|createPhysics| RAPIER["Rapier World"]
    STATIC -->|createPolice| LOS["clearLine()"]
    DMAP -->|createTraffic| RGRAPH["RoadGraph (nodes, lanes, outgoing)"]
    DMAP -->|ui.setWorld| MINIMAP["Canvas 2D estático"]

    CTRL --> PLAYER_OR_CAR["Player / Vehicle step(dt)"]
    PLAYER_OR_CAR -->|Fuerzas/Deltas| RAPIER
    RAPIER -->|Poses + Velocity| POS["Focus { x, y, z, heading, speed }"]

    POS -->|Interpolación alpha| CAM["FollowCamera + Renderer"]
    POS -->|focus| STREAM["Streaming sectores 64m"]
    POS -->|AudioFrame @ ~24Hz| AUDIO["Web Audio Mixer"]
    POS -->|HudState| UI["DOM HUD + Minimapa"]
```

## Contratos principales de datos
1. **`MovementInput` / `read()` (`core/input.ts`):** Ejes `x, z ∈ {-1, 0, 1}`, flags mantenidos (`run`, `handbrake`) y acciones de un solo pulso consumidas al leer (`jump`, `interact`, `horn`, `challenge`).
2. **`StaticBox` (`physics/physics.ts`):** Caja alineada a ejes por centro `(x, y, z)` y semiextensiones `(halfX, halfY, halfZ)`.
3. **`DistrictMap` (`world/generation/layout.ts`):** Rectángulos de calles/agua, límites y pines de interés compartidos entre grafo vial y minimapa.
4. **`ContactShadowSource` (`renderer/postprocessing/contact-shadows.ts`):** Hasta 10 elementos con `(x, y, z, radiusX, radiusZ, heading?)`.
5. **`HudState` (`ui/ui.ts`):** `{ x, z, heading, hour, health, driving, canInteract, speed, wanted, policeStatus }`.
6. **`AudioFrame` (`audio/audio.ts`):** Muestreado cada `0.042 s` (~24 Hz) en `frame()`, incluye posición del oyente, velocidad, `coastDistance`, `police[]` y `traffic[]`.
7. **Persistencia (`persistence/preferences.ts`):** Claves `'quality'` (`Quality`) y `'audio'` (`{ volume, muted }`) en almacén `'preferences'` de IndexedDB `'viceblock'` v1. Estado de partida (posición, salud, hora, estrellas) es efímero en memoria.
