---
document_id: SYSTEM-WORLD-STREAMING
status: active
last_updated: 2026-11-20
verified_against: "248f8b44b7aebf77fc38a0d5c0bde996e680cec5"
verification_scope: "static-analysis-only"
related_systems: [PHYSICS_AND_COLLISIONS, RENDERING, TRAFFIC_AND_NAVIGATION, POLICE_AND_WANTED]
related_files:
  - src/world/district.ts
  - src/world/stores.ts
  - src/world/streaming.ts
  - src/world/generation/layout.ts
  - src/world/generation/geometry.ts
  - src/world/generation/buildings.ts
  - src/world/generation/streets.ts
  - src/world/generation/coast.ts
  - src/world/generation/vegetation.ts
---

# Sistema: Mundo, Generación Procedural y Streaming (`WORLD_AND_STREAMING.md`)

1. **Propósito:** Construir de forma determinista el mapa conectado de Viceblock (Isla Este, Isla Estrella y Tierra Firme Oeste unidas por puentes sobre Bahía Central), las tiendas interactuables iniciales, sus colisionadores estáticos y datos de mapa, y gestionar la carga/detalle visual por sectores.
2. **Estado de implementación:** Implementado para 6 distritos conectados (`Costa Palmera`, `Punta Palmera`, `Isla Estrella`, `Centro Financiero`, `Pequeña Palmera`, `Puerto y Muelles`) + 3 puentes (`Puente Norte`, `Calzada Central`, `Puente Sur`) y 9 tiendas interactuables (`stores.ts`). Streaming físico y expansión a interiores siguen pendientes.
3. **Responsabilidades:** Definir retícula vial multi-isla y puentes, instanciar edificios por estilo de distrito, parques, muelles, costa, balizas de tiendas (`InstancedMesh`) y skyline; agrupar geometrías en `InstancedMesh`; cargar/descargar sectores visuales `64×64 m`.
4. **Archivos fuente relevantes:** `src/world/district.ts`, `src/world/stores.ts`, `src/world/streaming.ts`, `src/world/generation/{layout,geometry,buildings,streets,coast,vegetation}.ts`.
5. **Clases y funciones principales:** `buildDistrict`, `createStores`, `createDistrictStreaming`, `DistrictGeometry`, `DistrictResources`, `disposeInstances`, `makeRandom`, `getDistrictAt`, `addBuilding`, `buildingCollider`, `addStreets`, `addCoast`, `addPalm`, `addPlanter`.
6. **Interfaces públicas:** `District`, `DistrictMap`, `DistrictZone`, `StoreSpec`, `StoreMapMarker`, `MapRectangle`, `BuildingSpec`, `Finish`, `WorldFocus`.
7. **Dependencias:** `three`, `StaticBox` (`src/physics/physics.ts`).
8. **Sistemas dependientes:** `src/main.ts`, `src/physics/physics.ts`, `src/ai/traffic/traffic.ts`, `src/ai/police/police.ts`, `src/ui/minimap.ts`.
9. **Flujo de funcionamiento:** `buildDistrict(scene, seed)` crea las masas de tierra (Este, Oeste e Isla Estrella), rompeolas/parapetos de bahía, puentes con pilares y océano global en `landscape`, registra manzanas por distrito, parques, marcas viales, farolas y flora en `createDistrictStreaming`, y recolecta `colliders`. `createStores` dibuja aros/balizas instanciadas en las puertas de las 9 tiendas, detecta cercanía a pie (`2.75 m`) y gestiona el enfriamiento (`90 s`) tras un asalto básico.
10. **Estructuras de datos relevantes:** `districtBounds` (`-480..76` X, `-216..216` Z), `districtZones` (6 distritos), `bridges` (3 puentes), `storeSpecs` (9 tiendas), `specialLots` (7 lotes Este) + `westSpecialBlocks` (4 lotes Oeste), `Sector` (`left`, `near`, `draw[]`, `instance?`, `detailed?`).
11. **Invariantes:** Con igual `seed`, `map`, `spawn`, `colliders` y matrices de `InstancedMesh` son idénticos. `detailRadius = 69m`, `loadRadius = 142m`, `transitionMargin = 15m`. Puentes y masas de tierra tienen suelo físico en `y = 0`. Las entradas de tiendas descansan sobre acera libre de colisionadores de edificios.
12. **Restricciones:** Terreno plano (`y = 0`) con parapetos costeros y en puentes; los edificios siguen sin interiores.
13. **Problemas conocidos:** `VB-002` (colisionadores permanentes sin partición espacial), `VB-003` (reconstrucción síncrona bloqueante de sectores), `VB-006` (aceras a `+0.049 m` sin collider), `VB-008` (`pole`/`trunk`/`crown`/`leaf` sin liberar en `dispose()`), `VB-010` (palmeras costeras/parques y mobiliario sin collider; default seed `61865` vs `240817`).
14. **Consideraciones de rendimiento:** `DistrictGeometry` y `createStores` usan `InstancedMesh` para acotar draw calls; en mapas mayores conviene avanzar `VB-002` y `VB-003`.
15. **Métodos de verificación:** `tests/district.test.ts` (3 tests), `tests/world-streaming.test.ts` (2 tests), `tests/stores.test.ts` (1 test).
16. **Riesgos de modificación:** Alterar `avenues`, `westAvenues` o `crossStreets` exige actualizar coordenadas de `specialLots`, `westSpecialBlocks` y `storeSpecs`.
17. **Referencias relacionadas:** [PHYSICS_AND_COLLISIONS.md](PHYSICS_AND_COLLISIONS.md), [TRAFFIC_AND_NAVIGATION.md](TRAFFIC_AND_NAVIGATION.md), [UI_AND_DEBUG.md](UI_AND_DEBUG.md).
18. **Última verificación:** 2026-11-20 (`typecheck`, `vitest` y `vite build` ejecutados tras los cambios).
