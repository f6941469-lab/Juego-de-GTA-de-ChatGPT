# Estado del proyecto — Viceblock 0.4.0

La versión activa es la entrega Mercado Palma de las primeras capturas, restaurada íntegramente sobre main por petición del usuario. Session controla un distrito compacto con cuatro civiles, tres coches autónomos, comerciante, pistola, testigos, dos policías a pie, teléfono y dos escaparates destructibles. El HUD, mapa, presentación y controles son los de esa entrega.

La conducción y los distritos del sistema anterior no forman parte del runtime activo. Su historial y documentación se conservan. No se trata de la integración anterior con otro HUD.

Consulta [.ai/CURRENT_STATE.md](.ai/CURRENT_STATE.md) para el alcance y verificaciones y [.ai/SIMULATION.md](.ai/SIMULATION.md) para contratos activos.

La primera implementación del plan añade `jugar/index.html`, generado reproduciblemente con JS/CSS/fuentes/WASM/licencias integrados y sin dependencias nuevas. El modo web de desarrollo se conserva. El límite de validación `file://` y el contrato futuro de partidas están en [.ai/PORTABLE.md](.ai/PORTABLE.md). Esta entrega no incorpora todavía la ampliación de NPC, vehículos, nueve tiendas o replay.

## Base global de 0.4.0

La primera parte de la fase 2 añade IDs estables, zonas de 24 metros y un historial de hasta 60 muestras. La navegación peatonal cubre el mapa transitable, con dos búsquedas por tick y 8192 visitas por búsqueda. Se conservan las cuatro personas y los tres coches del mercado mientras se prepara su extensión al resto de zonas. Las decisiones civiles se espacian por distancia y las poses continúan mediante el paso físico compartido.

El renderizador usa WebGPU si obtiene un dispositivo compatible y mantiene WebGL 2 como alternativa de ejecución. Ambos comparten shaders TSL. Los perfiles limitan resolución y sombras. El backend y los contadores se consultan con F3. Véase [.ai/RENDERING.md](.ai/RENDERING.md). La ampliación de la red vial, tiendas, población y replay continúa en el plan.

Verificación de 0.4.0 aprobada con tipos, 25 pruebas, compilación y comparación reproducible del HTML. Los flujos web y portable inline offline pasaron en Chromium 156/SwiftShader con WebGL 2, escritorio y táctil. WebGPU en el adaptador de software falla también con un triángulo independiente. Siguen pendientes su aceptación en un dispositivo utilizable, las mediciones físicas y la apertura directa file://.
