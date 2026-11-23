# Arquitectura

Vite sirve y compila la aplicación TypeScript. `src/main.ts` conecta los sistemas y posee el ciclo de arranque. Los módulos especializados exportan funciones de creación con interfaces pequeñas para recibir configuración y exponer operaciones.

| Módulo | Responsabilidad |
| --- | --- |
| `src/core/` | Infraestructura transversal, incluido el ciclo de simulación cuando procede |
| `src/world/` | Construcción determinista del distrito, límites, punto de aparición y datos para el mapa |
| `src/physics/` | Mundo Rapier y representación física de los sólidos |
| `src/player/`, `src/characters/` | Movimiento, cámara en tercera persona y apariencia animada del personaje |
| `src/renderer/`, `src/shaders/` | WebGPURenderer, compatibilidad WebGL 2, shaders TSL y presupuestos de resolución |
| `src/ui/` | Portada, estado de juego, pausa, minimapa y presentación de diagnósticos |
| `src/persistence/` | Preferencia gráfica local en IndexedDB |
| `src/config/`, `src/debug/` | Semilla y tiempos del juego, medidas del renderizador |
| `tests/` | Pruebas automatizadas ejecutadas con Vitest |

`src/simulation/` contiene la sesión integrada (`session.ts`), navegación jerárquica y vial, actores, diálogo (`dialogue.ts`), civiles (`population.ts`), policía/patrullas (`police.ts`), tráfico/transporte (`traffic.ts`), comercio/arma/eventos (`model.ts`), feedback destructible (`feedback.ts`) y grabador/visor replay POV (`recorder.ts`). `src/world/generation/` incluye `shop.ts` (`9` comercios) y `transit.ts` (paradas de bus y estaciones de metro). `src/audio/` sintetiza las señales de audio. `src/ui/gameplay.ts` presenta estado, diálogo, tiendas, `Palma Social` y controles del visor `replay`. Sus contratos detallados están en [.ai/SIMULATION.md](.ai/SIMULATION.md).

## Contratos de la primera fase visual

- El mundo usa metros aproximados y +Y hacia arriba. El rumbo cero mira hacia −Z (norte). El minimapa usa X y Z. Un rumbo positivo gira hacia +X.
- `buildDistrict(scene, seed)` añade el distrito en sectores espaciales de `48 m` (`core`/`detail`), las cajas estáticas de edificios, las `9` tiendas abiertas y las `2` estaciones de metro, devolviendo el punto de aparición del jugador y los marcadores para el minimapa. Rapier recibe cajas definidas por centro y semiextensiones.
- El ciclo convierte las entradas en una dirección, envía el estado de carrera/salto o conducción al controlador y avanza la física con un intervalo fijo. El render usa la fracción restante del intervalo para interpolar los estados de simulación. Los tiempos de simulación y animación se expresan en segundos y los ángulos de cámara en radianes.
  En la escena integrada `Session.step` prepara a todos los actores, vehículos y patrullas, avanza Rapier una vez y lee los resultados. `player.step` es únicamente el wrapper para un escenario con un solo personaje; no se debe llamar además del tick de sesión.
- El renderizador recibe la escena y la cámara. La atmósfera recibe una hora decimal y la posición de enfoque. La interfaz recibe posición, rumbo, hora y estado de sesión, y emite acciones mediante callbacks sin mutar la simulación directamente.
- La generación del mundo es determinista con la misma semilla. La posición del jugador y la hora pertenecen a la sesión. IndexedDB guarda el perfil gráfico.

`RoadNetwork` deriva 25 cruces y 80 carriles dirigidos del trazado. Los tres coches civiles (ahora conducibles y robables con `F`), el autobús circular (`4` paradas), la lanzadera de metro y las `2` patrullas policiales navegan por destinos y reservan cruces. Contratos y límites en [.ai/NAVIGATION.md](.ai/NAVIGATION.md). `Journal` y `Recorder` capturan eventos, testimonios y segmentos POV multiángulo para `Palma Social` y el visor 3D aislado.

## Base global e integración Fases 2–8

`Session` registra personas, vehículos, conductores, asientos, las `9` tiendas, los `18` escaparates y props destructibles en `WorldState` (límite de `256` entidades y `60` instantáneas históricas a cuatro muestras por segundo). Las zonas de 24 metros mantienen membresía y daños referenciados a las entidades originales.

`Navigation` cubre el distrito transitable con un espacio A* reutilizable y cola de prioridad. Los actores comparten dos búsquedas por tick (hasta 8192 visitas conjuntas) y jerarquía de 48 zonas. Los cambios de geometría por destrucción de cristales o props urbanos actualizan solo el rectángulo afectado. Las decisiones civiles se espacian por distancia y urgencia (máx. cuatro por tick) mientras el movimiento físico continúa en el paso fijo compartido.

El renderizador inicializa WebGPU de forma asíncrona y utiliza WebGL 2 como compatibilidad, compartiendo shaders TSL. Para mantener el coste GPU contenido, `DistrictGeometry` filtra sectores por distancia, los avatares reutilizan geometría compartida y `Feedback` agrupa un único `PointLight` interior en la tienda más cercana. Los presupuestos y verificaciones se registran en [.ai/RENDERING.md](.ai/RENDERING.md).
