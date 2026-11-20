---
document_id: SYSTEM-WORLD-STREAMING
status: active
last_updated: 2026-11-20
verified_against: "248f8b44b7aebf77fc38a0d5c0bde996e680cec5"
verification_scope: "static-analysis-only"
related_systems: [PHYSICS_AND_COLLISIONS, RENDERING, TRAFFIC_AND_NAVIGATION, POLICE_AND_WANTED]
related_files:
  - src/world/district.ts
  - src/world/streaming.ts
  - src/world/generation/layout.ts
  - src/world/generation/geometry.ts
  - src/world/generation/buildings.ts
  - src/world/generation/streets.ts
  - src/world/generation/coast.ts
  - src/world/generation/vegetation.ts
---

# Sistema: Mundo, Generación Procedural y Streaming (`WORLD_AND_STREAMING.md`)

1. **Propósito:** Construir de forma determinista el distrito Costa Palmera, generar sus colisionadores estáticos y datos de mapa, y gestionar la carga/detalle visual por sectores.
2. **Estado de implementación:** Implementado para 1 distrito acotado; streaming físico y expansión multi-distrito no implementados.
3. **Responsabilidades:** Definir retícula vial, instanciar edificios art déco/torres/porches, parques, costa y skyline; agrupar geometrías en `InstancedMesh`; cargar/descargar sectores visuales `64×64 m`.
4. **Archivos fuente relevantes:** `src/world/district.ts`, `src/world/streaming.ts`, `src/world/generation/{layout,geometry,buildings,streets,coast,vegetation}.ts`.
5. **Clases y funciones principales:** `buildDistrict`, `createDistrictStreaming`, `DistrictGeometry`, `DistrictResources`, `disposeInstances`, `makeRandom`, `addBuilding`, `buildingCollider`, `addStreets`, `addCoast`, `addPalm`, `addPlanter`.
6. **Interfaces públicas:** `District`, `DistrictMap`, `MapRectangle`, `BuildingSpec`, `Finish`, `WorldFocus`.
7. **Dependencias:** `three`, `StaticBox` (`src/physics/physics.ts`).
8. **Sistemas dependientes:** `src/main.ts`, `src/physics/physics.ts`, `src/ai/traffic/traffic.ts`, `src/ai/police/police.ts`, `src/ui/minimap.ts`.
9. **Flujo de funcionamiento:** `buildDistrict(scene, seed)` crea el suelo/asfalto/aceras base, el skyline norte y el océano en una escena fija (`landscape`), registra lotes, parques, marcas viales, bordillos, farolas y flora en `createDistrictStreaming`, y recolecta `colliders` estáticos (`createTerrainColliders` + `buildingCollider` + palmeras de bulevar). `update(elapsed, hour, focus)` actualiza streaming (si `focus` movió `≥ 5 m`), intensidad emisiva nocturna y shader del agua.
10. **Estructuras de datos relevantes:** `districtBounds` (`-183..76` X, `-208..208` Z), `avenues` (8), `crossStreets` (11), `specialLots` (7 lotes con nombre/rótulo), `Sector` (`left`, `near`, `draw[]`, `instance?`, `detailed?`).
11. **Invariantes:** Con igual `seed`, `map`, `spawn`, `colliders` y matrices de `InstancedMesh` son idénticos. `detailRadius = 69m`, `loadRadius = 142m`, `transitionMargin = 15m`. Los colisionadores estáticos permanecen activos aunque el sector visual se descargue.
12. **Restricciones:** Terreno plano (`y = 0`); muros invisibles en límites del distrito; los edificios no tienen interiores.
13. **Problemas conocidos:** `VB-002` (colisionadores permanentes sin partición espacial), `VB-003` (reconstrucción síncrona bloqueante de sectores), `VB-006` (aceras a `+0.049 m` sin collider), `VB-008` (`pole`/`trunk`/`crown`/`leaf` sin liberar en `dispose()`), `VB-010` (palmeras costeras/parques y mobiliario sin collider; `specialLots` y `spawn` hardcoded; default seed `61865` vs `240817`).
14. **Consideraciones de rendimiento:** `DistrictGeometry` reduce drásticamente draw calls agrupando por `(geometry, finish, castsShadow)`. Sin embargo, `drawWordmark` añade decenas de instancias por rótulo y `addPalm` asigna `Vector3`/`Euler`/`Quaternion` por segmento durante reconstrucciones síncronas.
15. **Métodos de verificación:** `tests/district.test.ts` (2 tests), `tests/world-streaming.test.ts` (2 tests).
16. **Riesgos de modificación:** Alterar `avenues`/`crossStreets` invalida coordenadas fijas de `specialLots`, `landmarkPins`, `spawn` y `vehicle`.
17. **Referencias relacionadas:** [PHYSICS_AND_COLLISIONS.md](PHYSICS_AND_COLLISIONS.md), [TRAFFIC_AND_NAVIGATION.md](TRAFFIC_AND_NAVIGATION.md).
18. **Última verificación:** 2026-11-20 (análisis estático sobre `248f8b4`).
