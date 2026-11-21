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

`src/simulation/` contiene la sesión integrada, navegación local, actores, civiles, policía, tráfico, comercio/arma/eventos y feedback destructible. `src/audio/` sintetiza las señales de audio. `src/ui/gameplay.ts` presenta el estado y emite comandos sin aplicar compras, daño o IA. Sus contratos detallados y límites están en [.ai/SIMULATION.md](.ai/SIMULATION.md).

## Contratos de la primera fase visual

- El mundo usa metros aproximados y +Y hacia arriba. El rumbo cero mira hacia −Z (norte). El minimapa usa X y Z. Un rumbo positivo gira hacia +X.
- `buildDistrict(scene, seed)` añade el distrito a la escena y entrega las cajas estáticas, el punto donde descansan los pies del personaje y los datos para dibujar el mapa. Rapier recibe cajas definidas por centro y semiextensiones.
- El ciclo convierte las entradas en una dirección, envía el estado de carrera y salto al controlador y avanza la física con un intervalo fijo. El render usa la fracción restante del intervalo para interpolar los estados de simulación. Los tiempos de simulación y animación se expresan en segundos y los ángulos de cámara en radianes.
  En la escena integrada `Session.step` prepara a todos los actores, avanza Rapier una vez y lee los resultados. `player.step` es únicamente el wrapper para un escenario con un solo personaje; no se debe llamar además del tick de sesión.
- El renderizador recibe la escena y la cámara. La atmósfera recibe una hora decimal y la posición de enfoque. La interfaz recibe la posición, el rumbo, la hora y el mapa, y emite acciones mediante callbacks.
- La generación del mundo es determinista con la misma semilla. La posición del jugador y la hora pertenecen a la sesión. IndexedDB guarda el perfil gráfico.

El circuito vial actual es un conjunto de puntos con curvas, independiente de sus mallas. No sustituye al futuro grafo vial con destinos e intersecciones arbitrarias. Journal entrega evidencia temporal a civiles, policía y teléfono; sus eventos y testimonios tienen límites de memoria.

## Base global de la entrega 0.4.0

`Session` registra personas, vehículos, conductores, asientos, tienda y cristales en `WorldState`. Los IDs son estables durante la sesión y tras reiniciar. Las zonas de 24 metros mantienen membresía y daños referenciados a las entidades originales. El historial conserva hasta 60 instantáneas a un máximo de cuatro muestras por segundo, con un máximo de 128 entidades. Se prepara así el estado histórico que necesitará el replay.

`Navigation` cubre el distrito transitable con un espacio A* reutilizable y cola de prioridad. Los actores comparten dos búsquedas por tick y cada búsqueda visita hasta 8192 celdas. Una petición diferida conserva la ruta y se reintenta en el siguiente tick. Los cambios de geometría invalidan las rutas mediante una revisión. Las decisiones civiles se espacian por distancia y urgencia, mientras sus movimientos continúan en el paso fijo compartido.

El renderizador inicializa WebGPU de forma asíncrona y obtiene un dispositivo WebGPU compatible. Si no lo obtiene usa el backend WebGL 2 de Three. Cielo y agua se expresan en TSL para ambos backends. Cada perfil limita píxeles y mapas de sombras. Los presupuestos y el alcance de las verificaciones se registran en [.ai/RENDERING.md](.ai/RENDERING.md).
