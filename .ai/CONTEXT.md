# Contexto activo — Viceblock 0.4.1

El usuario solicitó explícitamente sustituir el sistema anterior por la versión de las primeras capturas, publicada originalmente en work@5660edc. La integración de d565cdc que conservaba el runtime anterior queda sustituida. La referencia visual y funcional es Mercado Palma, con el HUD de efectivo/salud a la derecha, minimapa compacto y teléfono verde.

Stack sin cambios de dependencias: TypeScript/Vite/Three.js/Rapier/Web Audio. Una simulación Session a paso fijo 60 Hz; render interpolado. Versión visible en portada y atributo data-build del HTML. Tests npm son 25 pruebas del código activo; las suites del sistema retirado permanecen en Git.

Consultar CURRENT_STATE.md, HANDOFF.md y SIMULATION.md. Los directorios systems/ y architecture/ contienen documentación histórica marcada como archivada.

Primera implementación del plan autorizada: `scripts/build-portable.mjs` usa Vite existente para generar `jugar/index.html` con recursos/licencias integrados. `npm run build` genera ambas entregas; `build:portable` solo la portable y `check:portable` comprueba igualdad. No se han añadido dependencias o funciones de simulación. Ver PORTABLE.md; la política de Chromium bloquea file://, por lo que el modo inline offline no acredita doble clic.

La entrega 0.4.0 inicia la base global de la fase 2. Navigation cubre el mapa transitable con cuotas A*. WorldState registra IDs, zonas y muestras de historia sin duplicar las entidades existentes. El renderizador usa WebGPU si obtiene un dispositivo y WebGL 2 como compatibilidad, con cielo/agua TSL y límites de píxeles. Los límites activos están en RENDERING.md. La ampliación de población, nueve tiendas, conducción y replay siguen pendientes.

La entrega 0.4.1 añade el ZIP de carga para itch.io en `publicar/viceblock-itch.zip`. El archivo contiene exclusivamente el HTML compilado como `index.html` en la raíz. El siguiente hito de simulación continúa tras esta corrección de exportación. Véase ITCH.md.
