---
document_id: SYSTEM-WORLD-STREAMING
status: archived
last_updated: 2026-11-20
verified_against: "96ef8fc-dirty (Phase 4 working tree)"
verification_scope: "typecheck + vitest (43/43) + vite build (Phase 4)"
related_systems: [PHYSICS_AND_COLLISIONS, RENDERING, TRAFFIC_AND_NAVIGATION, POLICE_AND_WANTED, NPC_AND_PERCEPTION]
related_files:
  - src/world/district.ts
  - src/world/stores.ts
  - src/world/destructibles.ts
  - src/world/streaming.ts
  - src/world/generation/layout.ts
  - src/world/generation/geometry.ts
  - src/world/generation/buildings.ts
  - src/world/generation/streets.ts
  - src/world/generation/coast.ts
  - src/world/generation/vegetation.ts
---


> ARCHIVO HISTÓRICO DEL SISTEMA ANTERIOR (hasta `d565cdc`). Desde 0.3.0 estos contratos no describen el código activo. Consulta [.ai/CURRENT_STATE.md](../CURRENT_STATE.md) y `.ai/SIMULATION.md` para la versión Mercado Palma.

# Sistema: Mundo, Generación Procedural y Streaming (`WORLD_AND_STREAMING.md`)

1. **Propósito:** Construir de forma determinista el mapa conectado de Viceblock (Isla Este, Isla Estrella y Tierra Firme Oeste unidas por puentes sobre Bahía Central), las 9 tiendas funcionales con interior accesible, escaparate fracturable y asalto progresivo, el mobiliario urbano destructible con física Rapier, sus colisionadores estáticos y el streaming visual por sectores.
2. **Estado de implementación:** **Implementado con interiores transitables en 9 tiendas, asaltos progresivos y entorno destructible físico/instanciado (`destructibles.ts`, Fase 4)** sobre los 6 distritos conectados por 3 puentes. Streaming físico Rapier pendiente (`VB-002`).
3. **Responsabilidades:** Definir retícula vial multi-isla y puentes, instanciar edificios (con marcos huecos en tiendas para escaparates rompibles), parques, muelles, costa, gestionar balizas/asaltos (`stores.ts`), simular objetos destructibles + escombros/agua/humo acotados (`destructibles.ts`) y cargar/descargar sectores visuales `64×64 m`.
4. **Archivos fuente relevantes:** `src/world/district.ts`, `src/world/stores.ts`, `src/world/destructibles.ts`, `src/world/streaming.ts`, `src/world/generation/{layout,geometry,buildings,streets,coast,vegetation}.ts`.
5. **Clases y funciones principales:** `buildDistrict`, `createStores`, `getStoreInteriorLayout`, `createDestructibles`, `createDistrictStreaming`, `DistrictGeometry`, `DistrictResources`, `disposeInstances`, `makeRandom`, `getDistrictAt`, `addBuilding`, `buildingCollider`, `buildingColliders`, `addStreets`, `addCoast`, `addPalm`, `addPlanter`.
6. **Interfaces públicas:** `District`, `DistrictMap`, `DistrictZone`, `StoreSpec`, `StoreInteriorLayout`, `StoreHeistState`, `StoreHeistUpdate`, `StoreMapMarker`, `DestructibleProp`, `DestructibleKind`, `DestructionHit`, `MapRectangle`, `BuildingSpec`, `Finish`, `WorldFocus`.
7. **Dependencias:** `three`, `@dimforge/rapier3d-compat`, `StaticBox` (`src/physics/physics.ts`).
8. **Sistemas dependientes:** `src/simulation/engine.ts`, `src/main.ts`, `src/physics/physics.ts`, `src/ai/traffic/traffic.ts`, `src/ai/npc/npc-population.ts`, `src/ai/police/police.ts`, `src/ui/minimap.ts`.
9. **Flujo de funcionamiento:** `buildDistrict(scene, seed)` construye masas de tierra, malecones, puentes y lotes; las 9 tiendas (`interior: true`) dejan huecos enmarcados en `buildings.ts` donde `createDestructibles` coloca `18` vidrieras `store_glass` fracturables y mobiliario urbano con colisionador Rapier (`hydrant`, `bollard`, `crate`, `bench`). Al destruirse por bala o vehículo, retiran su colisionador Rapier al instante, lanzan escombros físicos (`maxDebris = 96`) y chorros de agua/humo (`maxPlumes = 64`), emiten `'glass_broken'` o `'object_destroyed'` y alertan al dependiente si corresponde.
10. **Estructuras de datos relevantes:** `districtBounds` (`-480..76` X, `-216..216` Z), `districtZones` (6 distritos), `bridges` (3 puentes), `storeSpecs` (9 tiendas con `width`/`depth`), `DestructibleProp[]`, `Sector`.
11. **Invariantes:** Con igual `seed`, `map`, `spawn`, `colliders`, matrices de `InstancedMesh` y props destructibles son idénticos. Al romper un prop físico (`broken === true`), `physics.world.removeCollider` abre realmente el paso. `dispose()` libera mallas, geometrías, materiales y colisionadores.
12. **Restricciones:** Terreno plano (`y = 0`); edificios genéricos siguen siendo volúmenes sólidos cerrados (solo los 9 comercios tienen interior enterable y vidrieras destructibles).
13. **Problemas conocidos:** `VB-002` (colisionadores estáticos permanentes sin streaming Rapier, aunque LOS es `O(celdas)`), `VB-003` (reconstrucción síncrona bloqueante de sectores), `VB-006` (aceras a `+0.049 m` sin collider), `VB-008` (`pole`/`trunk`/`crown`/`leaf` sin liberar en `dispose()`), `VB-010` (palmeras costeras/parques sin collider; default seed `61865` vs `240817`).
14. **Consideraciones de rendimiento:** `destructibles.ts` agrupa todos los escaparates, mobiliario, escombros y efectos de agua/humo en solo `4` `InstancedMesh` con buffers circulares acotados (`96` escombros, `64` columnas).
15. **Métodos de verificación:** `tests/district.test.ts` (3 tests), `tests/world-streaming.test.ts` (2 tests), `tests/stores.test.ts` (1 test), `tests/urban-life.test.ts`, `tests/combat-and-heists.test.ts` y `tests/destructibles-and-accidents.test.ts` (vidrieras, liberación de colisionadores Rapier, chorro de hidrante y reset/dispose).
16. **Riesgos de modificación:** Alterar `avenues`, `westAvenues` o `crossStreets` exige actualizar coordenadas de `specialLots`, `westSpecialBlocks`, `storeSpecs` y candidatos de `destructibles.ts`.
17. **Referencias relacionadas:** [PHYSICS_AND_COLLISIONS.md](PHYSICS_AND_COLLISIONS.md), [TRAFFIC_AND_NAVIGATION.md](TRAFFIC_AND_NAVIGATION.md), [UI_AND_DEBUG.md](UI_AND_DEBUG.md), [NPC_AND_PERCEPTION.md](NPC_AND_PERCEPTION.md).
18. **Última verificación:** 2026-11-20 (`typecheck`, Vitest 43/43 y build tras Fase 4).


### Integración Mercado Palma

El lote 3:3:1 contiene Mercado Palma (15,34.2), registrado como décima tienda. El punto inicial es (15,0,41.5). Los interiores incorporan collider del suelo a la cota visible de 0.06 m. Se conserva la carga sectorial y las demás tiendas/distritos.
