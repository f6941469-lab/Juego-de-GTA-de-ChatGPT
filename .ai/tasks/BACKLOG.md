# Trabajo pendiente — Mercado Palma 0.5.0

Las fases 2–8 están implementadas y verificadas (`37/37` pruebas en `8` archivos, optimización espacial/gráfica, 9 tiendas reales, vida civil con Pedro/diálogo/acoso, conducción/robo, bus/metro, destrucción conectada, policía con patrullas/barricadas y grabación POV + replay 3D aislado). Contratos en [../SIMULATION.md](../SIMULATION.md), [../NAVIGATION.md](../NAVIGATION.md) y [../RENDERING.md](../RENDERING.md).

- **Fase 9 · Persistencia en disco:** Implementar exportar/importar partida en archivo JSON (`Blob` + `FileReader`) según el contrato de [../PORTABLE.md](../PORTABLE.md) sin depender de `IndexedDB` bajo `file://`.
- **Hardware físico:** Validar `WebGPU` en un adaptador físico utilizable y medir fluidez (FPS), memoria y temperatura en PC y móvil reales (`SwiftShader` solo valida flujos funcionales).
- **Audio y sesiones prolongadas:** Escuchar y ajustar mezcla Web Audio en hardware real y probar sesiones largas continuas entre múltiples incidentes y reintentos.
- **Pruebas manuales en navegador real:** Verificar interacción completa de usuario final (puntero, conducción, Pedro, 9 tiendas, patrullas y visor replay en móvil/PC).

El sistema anterior y sus tareas permanecen en el historial hasta `d565cdc`.
