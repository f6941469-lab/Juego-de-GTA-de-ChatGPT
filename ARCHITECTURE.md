# Arquitectura

Vite sirve y compila la aplicación TypeScript. `src/main.ts` conecta los sistemas y posee el ciclo de arranque. Los módulos especializados exportan funciones de creación con interfaces pequeñas para recibir configuración y exponer operaciones.

| Módulo | Responsabilidad |
| --- | --- |
| `src/core/` | Infraestructura transversal, incluido el ciclo de simulación cuando procede |
| `src/world/` | Construcción determinista del distrito, límites, punto de aparición y datos para el mapa |
| `src/physics/` | Mundo Rapier y representación física de los sólidos |
| `src/player/`, `src/characters/` | Movimiento, cámara en tercera persona y apariencia animada del personaje |
| `src/renderer/`, `src/shaders/` | Renderizador WebGL 2, perfiles gráficos, iluminación y cielo procedural |
| `src/ui/` | Portada, estado de juego, pausa, minimapa y presentación de diagnósticos |
| `src/persistence/` | Preferencia gráfica local en IndexedDB |
| `src/config/`, `src/debug/` | Semilla y tiempos del juego, medidas del renderizador |
| `tests/` | Pruebas automatizadas ejecutadas con Vitest |

Las carpetas de navegación, tráfico, policía y audio se incorporarán cuando exista un sistema que mantener.

## Contratos de la primera fase visual

- El mundo usa metros aproximados y +Y hacia arriba. El rumbo cero mira hacia −Z (norte). El minimapa usa X y Z. Un rumbo positivo gira hacia +X.
- `buildDistrict(scene, seed)` añade el distrito a la escena y entrega las cajas estáticas, el punto donde descansan los pies del personaje y los datos para dibujar el mapa. Rapier recibe cajas definidas por centro y semiextensiones.
- El ciclo convierte las entradas en una dirección, envía el estado de carrera y salto al controlador y avanza la física con un intervalo fijo. El render usa la fracción restante del intervalo para interpolar los estados de simulación. Los tiempos de simulación y animación se expresan en segundos y los ángulos de cámara en radianes.
- El renderizador recibe la escena y la cámara. La atmósfera recibe una hora decimal y la posición de enfoque. La interfaz recibe la posición, el rumbo, la hora y el mapa, y emite acciones mediante callbacks.
- La generación del mundo es determinista con la misma semilla. La posición del jugador y la hora pertenecen a la sesión. IndexedDB guarda el perfil gráfico.

Cuando se incorporen vehículos y tráfico, las rutas deben describir la red vial como datos y el grafo debe quedar separado de la geometría visible. Un sistema de eventos será útil cuando varios sistemas necesiten reaccionar a la misma interacción.
