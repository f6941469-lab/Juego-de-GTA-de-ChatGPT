---
document_id: ARCH-DEPENDENCIES
status: active
last_updated: 2026-11-20
verified_against: "248f8b44b7aebf77fc38a0d5c0bde996e680cec5"
verification_scope: "static-analysis-only"
---

# Dependencias Externas e Internas (`DEPENDENCIES.md`)

## 1. Dependencias externas (`package.json` y `package-lock.json`)
Todas las versiones están fijadas exactamente sin rangos semver. Total en lockfile: 97 paquetes.

| Paquete | Versión | Tipo | Licencia | Razón / Uso |
| :--- | :--- | :--- | :--- | :--- |
| `three` | `0.183.2` | Runtime | MIT | Escena 3D, WebGL 2, instanciación, sombras y shaders |
| `@dimforge/rapier3d-compat` | `0.19.3` | Runtime | Apache-2.0 | Motor físico rígido, character controller y raycasts (WASM) |
| `@fontsource/archivo-black` | `5.3.0` | Runtime | OFL-1.1 | Tipografía display local sin petición a CDN |
| `@fontsource/barlow-condensed` | `5.3.0` | Runtime | OFL-1.1 | Tipografía de etiquetas/HUD local |
| `@types/three` | `0.183.1` | Dev | MIT | Definiciones TypeScript para Three.js |
| `typescript` | `5.9.3` | Dev | Apache-2.0 | Comprobación estática `tsc --noEmit` |
| `vite` | `7.3.8` | Dev | MIT | Servidor de desarrollo y empaquetador (`three` y `rapier` en chunks separados) |
| `vitest` | `5.1.1` | Dev | MIT | Runner de pruebas automatizadas |

- **Aviso de seguridad dev conocido:** `picomatch@4.0.7` (dependencia transitiva de herramientas dev) reportado en [KNOWN_ISSUES.md](../KNOWN_ISSUES.md) (`GHSA-fc5q-39xc-vjpf`). No entra en el bundle de producción.
- **Atribución:** Textos completos de licencias en `public/licencias/*.txt`.

## 2. Grafo de dependencias internas (`src/`)
- **Sin dependencias circulares reales:** Existe únicamente un `import type` circular de tipo entre `src/vehicles/vehicle.ts` (`import type { createPlayer }`) y `src/player/player.ts` (interfaz estructural `VehicleRide`), sin ciclo en runtime.
- **Módulos hoja (cero dependencias internas de negocio):** `config/game.ts`, `core/fixed-loop.ts`, `core/input.ts`, `persistence/preferences.ts`, `shaders/sky.ts`, `audio/synths/signals.ts`, `renderer/resolution.ts`, `renderer/lighting/reflection.ts`, `world/generation/layout.ts`, `ai/police/wanted.ts`.
- **Nodos de mayor acoplamiento entrante:**
  - `src/main.ts` importa prácticamente todos los módulos de `src/`.
  - `src/physics/physics.ts` es acoplado directamente por `player.ts`, `vehicle.ts`, `vehicle-obstacles.ts` y `main.ts`.
  - `src/world/generation/layout.ts` (`DistrictMap`, `makeRandom`) conecta `world/`, `navigation/`, `ai/traffic/` y `ui/minimap.ts`.
