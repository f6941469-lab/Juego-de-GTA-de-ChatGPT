# Estado del proyecto — Viceblock 0.5.0

La versión activa es la entrega Mercado Palma de las primeras capturas, restaurada íntegramente sobre main por petición del usuario. Session controla un distrito compacto con diez civiles distribuidos y tres coches autónomos con destinos, comerciante, pistola, testigos, dos policías a pie, teléfono y dos escaparates destructibles. El HUD, mapa, presentación y controles son los de esa entrega.

La conducción y los distritos del sistema anterior no forman parte del runtime activo. Su historial y documentación se conservan. No se trata de la integración anterior con otro HUD.

Consulta [.ai/CURRENT_STATE.md](.ai/CURRENT_STATE.md) para el alcance y verificaciones y [.ai/SIMULATION.md](.ai/SIMULATION.md) para contratos activos.

La primera implementación del plan añade `jugar/index.html`, generado reproduciblemente con JS/CSS/fuentes/WASM/licencias integrados y sin dependencias nuevas. El modo web de desarrollo se conserva. El límite de validación `file://` y el contrato futuro de partidas están en [.ai/PORTABLE.md](.ai/PORTABLE.md). El mismo empaquetado integra la ampliación 0.5.0 descrita a continuación; las nueve tiendas y el replay siguen pendientes.

## Entrega 0.5.0 · Fase 2 funcional

Navegación jerárquica sobre 48 zonas de rejilla, actualizaciones de obstáculos localizadas, conservación de rutas todavía válidas y reservas con cesión de paso. Se incorporan seis residentes con IDs y recorridos propios, además de los cuatro del mercado. Máximo cuatro decisiones civiles y dos búsquedas de rutas por tick.

Los mismos tres coches usan 80 carriles sobre 25 intersecciones, destinos cambiantes y semáforos instanciados. No hay conducción del jugador todavía. Los personajes se atenúan a 64–80 m y se ocultan a 84 m; sus cuerpos y estado continúan simulándose. No se ha incorporado streaming físico.

Las pruebas ejercitan rutas por el distrito real, cruce de peatones, tráfico por otras calles, continuidad de identidad/daño y denuncia de un disparo alejado sin conocimiento policial de la posición posterior del jugador. La fase 3 ampliará actividades, objetos y conversación contextual; fases posteriores añaden aparcamiento, robo, nueve tiendas y replay.

Tipos, 32 pruebas, build y comprobaciones reproducibles aprobados. Web y ZIP real dentro de iframe de otro origen verificados en escritorio/táctil con WebGL 2/SwiftShader, sin errores ni recursos externos. La aceptación WebGPU en hardware utilizable y las mediciones físicas siguen pendientes. Resultados y hashes en `.ai/CURRENT_STATE.md`, `.ai/ITCH.md` y `.ai/PORTABLE.md`.

## Base global de 0.4.0

La primera parte de la fase 2 añade IDs estables, zonas de 24 metros y un historial de hasta 60 muestras. La navegación peatonal cubre el mapa transitable, con dos búsquedas por tick y 8192 visitas por búsqueda. Se conservan las cuatro personas y los tres coches del mercado mientras se prepara su extensión al resto de zonas. Las decisiones civiles se espacian por distancia y las poses continúan mediante el paso físico compartido.

El renderizador usa WebGPU si obtiene un dispositivo compatible y mantiene WebGL 2 como alternativa de ejecución. Ambos comparten shaders TSL. Los perfiles limitan resolución y sombras. El backend y los contadores se consultan con F3. Véase [.ai/RENDERING.md](.ai/RENDERING.md). La ampliación de la red vial, tiendas, población y replay continúa en el plan.

Verificación de 0.4.0 aprobada con tipos, 25 pruebas, compilación y comparación reproducible del HTML. Los flujos web y portable inline offline pasaron en Chromium 156/SwiftShader con WebGL 2, escritorio y táctil. WebGPU en el adaptador de software falla también con un triángulo independiente. Siguen pendientes su aceptación en un dispositivo utilizable, las mediciones físicas y la apertura directa file://.

## Publicación 0.4.1

La exportación para itch.io se guarda en `publicar/viceblock-itch.zip`, con un único `index.html` compilado en la raíz. La corrección cubre formato, reproducción del paquete y comprobación en iframe de otro origen. La base de simulación continúa siendo la entrega 0.4.0. Instrucciones en README y [.ai/ITCH.md](.ai/ITCH.md).

El ZIP pasó su validación de CRC y los flujos completos en iframe sandbox de otro origen, en escritorio y táctil, sin errores de JavaScript o consola ni solicitudes externas. Tipos, 25 pruebas, build y comprobaciones de vigencia aprobados. El registro reproducible está en `.ai/ITCH.md`.
