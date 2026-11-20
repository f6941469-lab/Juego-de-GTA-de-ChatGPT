---
document_id: SYSTEM-WORLD-STREAMING
status: active
last_updated: 2026-11-20
verified_against: "e2288b5"
verification_scope: "typecheck + vitest (37/37) + vite build (Phase 2)"
related_systems: [PHYSICS_AND_COLLISIONS, RENDERING, TRAFFIC_AND_NAVIGATION, POLICE_AND_WANTED, NPC_AND_PERCEPTION]
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

1. **Propósito:** Construir de forma determinista el mapa conectado de Viceblock (Isla Este, Isla Estrella y Tierra Firme Oeste unidas por puentes sobre Bahía Central), las 9 tiendas funcionales con interior accesible en planta baja, sus colisionadores estáticos y el streaming visual por sectores.
2. **Estado de implementación:** **Implementado con interiores transitables reales en las 9 tiendas (`buildingColliders`, suelo, mostrador, iluminación y escaparate)** sobre los 6 distritos conectados por 3 puentes. Streaming físico Rapier pendiente (`VB-002`).
3. **Responsabilidades:** Definir retícula vial multi-isla y puentes, instanciar edificios (sólidos o con planta baja enterable cuando `interior: true`), parques, muelles, costa, balizas/interiores de tiendas (`InstancedMesh` + `StoreInteriorLayout`) y cargar/descargar sectores visuales `64×64 m`.
4. **Archivos fuente relevantes:** `src/world/district.ts`, `src/world/stores.ts`, `src/world/streaming.ts`, `src/world/generation/{layout,geometry,buildings,streets,coast,vegetation}.ts`.
5. **Clases y funciones principales:** `buildDistrict`, `createStores`, `getStoreInteriorLayout`, `createDistrictStreaming`, `DistrictGeometry`, `DistrictResources`, `disposeInstances`, `makeRandom`, `getDistrictAt`, `addBuilding`, `buildingCollider`, `buildingColliders`, `addStreets`, `addCoast`, `addPalm`, `addPlanter`.
6. **Interfaces públicas:** `District`, `DistrictMap`, `DistrictZone`, `StoreSpec`, `StoreInteriorLayout`, `StoreMapMarker`, `MapRectangle`, `BuildingSpec`, `Finish`, `WorldFocus`.
7. **Dependencias:** `three`, `StaticBox` (`src/physics/physics.ts`).
8. **Sistemas dependientes:** `src/simulation/engine.ts`, `src/main.ts`, `src/physics/physics.ts`, `src/ai/traffic/traffic.ts`, `src/ai/npc/npc-population.ts`, `src/ai/police/police.ts`, `src/ui/minimap.ts`.
9. **Flujo de funcionamiento:** `buildDistrict(scene, seed)` construye masas de tierra, malecones, puentes y lotes; las 9 tiendas (`interior: true`) generan 4 paredes huecas con vano de puerta abierto (`~2.0–2.6 m` × `2.38 m`), mostrador físico interior y bloque superior desde `y = 2.72 m`. `createStores` calcula `StoreInteriorLayout` (entrada, mostrador frontal y posición de dependiente) y permite interactuar/asaltar tanto en puerta como frente al mostrador interior.
10. **Estructuras de datos relevantes:** `districtBounds` (`-480..76` X, `-216..216` Z), `districtZones` (6 distritos), `bridges` (3 puentes), `storeSpecs` (9 tiendas con `width`/`depth`), `specialLots` (7 lotes Este) + `westSpecialBlocks` (4 lotes Oeste), `Sector`.
11. **Invariantes:** Con igual `seed`, `map`, `spawn`, `colliders` y matrices de `InstancedMesh` son idénticos. Puentes y masas de tierra tienen suelo físico en `y = 0`. Todas las entradas de tienda conectan suavemente la acera con el interior sin colisionadores bloqueando la puerta (`verificado en Rapier`).
12. **Restricciones:** Terreno plano (`y = 0`); edificios genéricos siguen siendo volúmenes sólidos cerrados (solo los 9 comercios tienen interior enterable en Fase 2).
13. **Problemas conocidos:** `VB-002` (colisionadores estáticos permanentes sin streaming Rapier, aunque LOS es `O(celdas)`), `VB-003` (reconstrucción síncrona bloqueante de sectores), `VB-006` (aceras a `+0.049 m` sin collider), `VB-008` (`pole`/`trunk`/`crown`/`leaf` sin liberar en `dispose()`), `VB-010` (palmeras costeras/parques y mobiliario sin collider; default seed `61865` vs `240817`).
14. **Consideraciones de rendimiento:** `DistrictGeometry` y `createStores` usan `InstancedMesh` para acotar draw calls; en mapas mayores conviene avanzar `VB-002` y `VB-003`.
15. **Métodos de verificación:** `tests/district.test.ts` (3 tests), `tests/world-streaming.test.ts` (2 tests), `tests/stores.test.ts` (1 test), `tests/urban-life.test.ts` (recorrido físico Rapier por puerta hasta mostrador de las 9 tiendas).
16. **Riesgos de modificación:** Alterar `avenues`, `westAvenues` o `crossStreets` exige actualizar coordenadas de `specialLots`, `westSpecialBlocks` y `storeSpecs`.
17. **Referencias relacionadas:** [PHYSICS_AND_COLLISIONS.md](PHYSICS_AND_COLLISIONS.md), [TRAFFIC_AND_NAVIGATION.md](TRAFFIC_AND_NAVIGATION.md), [UI_AND_DEBUG.md](UI_AND_DEBUG.md), [NPC_AND_PERCEPTION.md](NPC_AND_PERCEPTION.md).
18. **Última verificación:** 2026-11-20 (`typecheck`, Vitest 37/37 y build tras Fase 2).

