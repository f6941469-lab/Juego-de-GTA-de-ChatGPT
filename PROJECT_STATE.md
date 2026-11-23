# Estado del proyecto — Viceblock 0.5.0

La versión activa conserva la escena Mercado Palma (`src/simulation/session.ts` como autoridad física única a 60 Hz) e integra las ampliaciones de Fases 2–8 junto con optimización gráfica/espacial: `9` tiendas transitables, `21` civiles (`allPeople`) con rutinas/objetos/diálogo en español (`Pedro`, acoso y eventos callejeros), conducción/robo con `F`, autobús y metro, destrucción de `18` escaparates y `9` props, `2` patrullas policiales coordinadas y grabación POV multiángulo con `Palma Social` y replay 3D aislado.

El motor/HUD anterior permanece descartado en el historial de Git. Consulta [.ai/CURRENT_STATE.md](.ai/CURRENT_STATE.md) para el alcance y verificaciones y [.ai/SIMULATION.md](.ai/SIMULATION.md) para contratos activos.

El empaquetado portable sigue generando `jugar/index.html` y `publicar/viceblock-itch.zip` sin dependencias nuevas; ver [.ai/PORTABLE.md](.ai/PORTABLE.md) e [.ai/ITCH.md](.ai/ITCH.md).

## Entrega 0.5.0 · Fases 3–8 y optimización

- **Rendimiento y mapa:** Sectores de `48 m` con lotes `core`/`detail` (`updateVisibility`), sombras desactivadas en follaje/detalle, vegetación reducida, `sharedBoxGeometry` en avatares, desaceleración distante (`> 42 m`) y `1` único `PointLight` agrupado que sigue al comercio más cercano al foco (`328` llamadas y `237.161` triángulos en `F3` Baja).
- **Nueve comercios y transporte:** `Mercado Palma` más `8` locales nuevos con interior y comerciante independiente; `4` paradas de autobús y `2` estaciones transitables de metro (`Metro Sur`, `Metro Norte`).
- **Vida civil, tráfico y policía:** Rutinas de trabajo/compras/bus/metro, charla con NPCs (`E`), seguimiento persistente (`Pedro`), conducción/expulsión de conductores (`F`), `2` patrullas en `RoadNetwork` con desembarco, fuego recíproco y barricadas.
- **Grabación POV y replay:** Muestreo de testigos y `streetCams` multiángulo con envío progresivo (los clips parciales sobreviven si cae el testigo) y visor 3D aislado desde `Palma Social` o al terminar arrestado/abatido.

Tipos, `37` pruebas en `8` archivos, `build`, `check:portable` y `check:itch` aprobados. Chrome `158` (`WebGL 2` SwiftShader) validó `dist/`, `jugar/index.html` vía `file://` offline y `publicar/viceblock-itch.zip` en `iframe` móvil `390×844` sin excepciones JS. Siguen pendientes Guardar/Cargar JSON (Fase 9), aceptación `WebGPU` en hardware físico y mediciones reales de FPS/audio. Resultados y hashes en `.ai/CURRENT_STATE.md`, `.ai/ITCH.md` y `.ai/PORTABLE.md`.

## Base global de 0.4.0

La primera parte de la fase 2 añade IDs estables, zonas de 24 metros y un historial de hasta 60 muestras. La navegación peatonal cubre el mapa transitable, con dos búsquedas por tick y 8192 visitas por búsqueda. Se conservan las cuatro personas y los tres coches del mercado mientras se prepara su extensión al resto de zonas. Las decisiones civiles se espacian por distancia y las poses continúan mediante el paso físico compartido.

El renderizador usa WebGPU si obtiene un dispositivo compatible y mantiene WebGL 2 como alternativa de ejecución. Ambos comparten shaders TSL. Los perfiles limitan resolución y sombras. El backend y los contadores se consultan con F3. Véase [.ai/RENDERING.md](.ai/RENDERING.md). La ampliación de la red vial, tiendas, población y replay continúa en el plan.

Verificación de 0.4.0 aprobada con tipos, 25 pruebas, compilación y comparación reproducible del HTML. Los flujos web y portable inline offline pasaron en Chromium 156/SwiftShader con WebGL 2, escritorio y táctil. WebGPU en el adaptador de software falla también con un triángulo independiente. Siguen pendientes su aceptación en un dispositivo utilizable, las mediciones físicas y la apertura directa file://.

## Publicación 0.4.1

La exportación para itch.io se guarda en `publicar/viceblock-itch.zip`, con un único `index.html` compilado en la raíz. La corrección cubre formato, reproducción del paquete y comprobación en iframe de otro origen. La base de simulación continúa siendo la entrega 0.4.0. Instrucciones en README y [.ai/ITCH.md](.ai/ITCH.md).

El ZIP pasó su validación de CRC y los flujos completos en iframe sandbox de otro origen, en escritorio y táctil, sin errores de JavaScript o consola ni solicitudes externas. Tipos, 25 pruebas, build y comprobaciones de vigencia aprobados. El registro reproducible está en `.ai/ITCH.md`.
