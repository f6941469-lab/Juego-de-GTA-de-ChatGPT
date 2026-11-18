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
| `src/persistence/` | Calidad gráfica y audio en IndexedDB |
| `src/config/`, `src/debug/` | Semilla y tiempos del juego, medidas del renderizador |
| `src/vehicles/` | Dinámica del coche y modelos de vehículos reutilizables |
| `src/navigation/`, `src/ai/traffic/` | Grafo, búsqueda de rutas, señales y tráfico |
| `src/ai/police/` | Detección, memoria, coordinación de unidades y escalado |
| `src/audio/` | Mezclador, síntesis, fuentes espaciales y ambientes |
| `tests/` | Pruebas automatizadas ejecutadas con Vitest |

## Contratos de simulación

- El mundo usa metros aproximados y +Y hacia arriba. El rumbo cero mira hacia −Z (norte). El minimapa usa X y Z. Un rumbo positivo gira hacia +X.
- `buildDistrict(scene, seed)` añade el distrito a la escena y entrega las cajas estáticas, el punto donde descansan los pies del personaje y los datos para dibujar el mapa. Rapier recibe cajas definidas por centro y semiextensiones.
- El ciclo convierte las entradas en una dirección, envía el estado de carrera y salto al controlador y avanza la física con un intervalo fijo. El render usa la fracción restante del intervalo para interpolar los estados de simulación. Los tiempos de simulación y animación se expresan en segundos y los ángulos de cámara en radianes.
- El renderizador recibe la escena y la cámara. La atmósfera recibe una hora decimal y la posición de enfoque. La interfaz recibe la posición, el rumbo, la hora y el mapa, y emite acciones mediante callbacks.
- La generación del mundo es determinista con la misma semilla. La posición, la salud, las estrellas y la hora pertenecen a la sesión. IndexedDB guarda el perfil gráfico y los ajustes de audio.

La entrada decide si Rapier avanza desde el controlador del personaje o desde el coche. El tráfico y la policía usan un grafo derivado de las reglas del distrito. Los vehículos cercanos reciben cajas cinemáticas en Rapier. Las patrullas actualizan la posición compartida tras una observación o un aviso.

Las geometrías de sectores se crean o eliminan en función de la posición de enfoque. Los colisionadores estáticos se conservan para mantener la continuidad de navegación y física. El renderizador separa las medidas de CPU del tiempo entre cuadros. El audio empieza con el gesto de entrada y recibe una muestra de la escena a menor frecuencia que la simulación.
