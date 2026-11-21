# Contexto activo — Viceblock 0.3.1

El usuario solicitó explícitamente sustituir el sistema anterior por la versión de las primeras capturas, publicada originalmente en work@5660edc. La integración de d565cdc que conservaba el runtime anterior queda sustituida. La referencia visual y funcional es Mercado Palma, con el HUD de efectivo/salud a la derecha, minimapa compacto y teléfono verde.

Stack sin cambios de dependencias: TypeScript/Vite/Three.js/Rapier/Web Audio. Una simulación Session a paso fijo 60 Hz; render interpolado. Versión visible en portada y atributo data-build del HTML. Tests npm son 20 pruebas del código activo; las suites del sistema retirado permanecen en Git.

Consultar CURRENT_STATE.md, HANDOFF.md y SIMULATION.md. Los directorios systems/ y architecture/ contienen documentación histórica marcada como archivada.

Primera implementación del plan autorizada: `scripts/build-portable.mjs` usa Vite existente para generar `jugar/index.html` con recursos/licencias integrados. `npm run build` genera ambas entregas; `build:portable` solo la portable y `check:portable` comprueba igualdad. No se han añadido dependencias o funciones de simulación. Ver PORTABLE.md; la política de Chromium bloquea file://, por lo que el modo inline offline no acredita doble clic.
