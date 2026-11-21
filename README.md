# Viceblock 0.4.0 · Mercado Palma

Viceblock es un juego 3D urbano para navegador. La escena inicial de Mercado Palma conecta exploración a pie, cuatro civiles con rutinas, tres coches autónomos, comercio, pistola, testigos, dos policías y escaparates que se rompen. La ciudad, los materiales y los personajes se generan con código original. El alcance es local y varios sistemas siguen siendo parciales; consulta [.ai/CURRENT_STATE.md](.ai/CURRENT_STATE.md).

## Sustitución del sistema anterior

Esta versión usa íntegramente la escena de Mercado Palma de las primeras capturas: HUD de efectivo/salud, minimapa compacto, teléfono verde y la tienda de Mara. El motor de simulación, interfaz y mapa de la integración anterior fueron sustituidos por esta entrega por petición del usuario. La conducción, los distritos adicionales y la policía avanzada anteriores quedan fuera de la versión activa; su código permanece en el historial de Git.

La entrega portable se identifica como **MERCADO PALMA · VERSIÓN 0.4.0 · SIN CONEXIÓN**. La versión web/de desarrollo muestra **VERSIÓN 0.4.0**. Ambas conservan la escena de Mercado Palma; la ampliación global de NPC, tiendas y vehículos está descrita en la hoja de ruta.

## Jugar sin servidor

Descarga el [ZIP de la rama main](https://github.com/f6941469-lab/Juego-de-GTA-de-ChatGPT/archive/refs/heads/main.zip), extráelo y abre `jugar/index.html`. Si abres el `index.html` de la raíz, pulsa **Abrir juego sin conexión** para acceder al archivo preparado.

Abre **[jugar/index.html](jugar/index.html)** en un navegador con WebGPU o WebGL 2. Ese archivo integra JavaScript, estilos, fuentes, física WASM y licencias: puedes copiar únicamente ese HTML y jugar sin conexión, sin Node, npm o servidor. El `index.html` de la raíz es la plantilla para desarrollar; el archivo preparado para jugar está en la carpeta `jugar`.

El contenido integrado se comprueba con red desactivada. La apertura directa mediante `file://` sigue pendiente de validación porque el Chromium administrado de este entorno la bloquea por política. No se requieren cambios de seguridad para el entregable; consulta [la comprobación y sus límites](.ai/PORTABLE.md).

## Desarrollar o preparar una nueva entrega

El renderizador selecciona WebGPU cuando puede obtener un dispositivo y utiliza WebGL 2 como compatibilidad. F3 muestra el backend activo, la resolución interna y los contadores de entidades, rutas e historial.

Usa Node.js 24 LTS. Las versiones admitidas se registran en `package.json`. El entorno de desarrollo en la nube trae Node.js 24 y npm 11. Para jugar necesitas un navegador compatible con WebGPU o WebGL 2.

Ejecuta estos comandos desde la raíz del repositorio.

```sh
npm ci
npm run dev
```

Abre la dirección que indica Vite y selecciona **Explorar distrito** para entrar al distrito.

Para actualizar solo el HTML portable después de cambiar el código:

```sh
npm run build:portable
```

El archivo generado `jugar/index.html` se incluye en cada entrega. `npm run check:portable` comprueba que coincide con la fuente actual sin modificarlo.

| Control | Acción |
| --- | --- |
| W, A, S, D | Moverse |
| Ratón | Girar la cámara. Haz clic en el juego para capturar el puntero |
| Mayús | Correr |
| Espacio | Saltar |
| E | Hablar con Mara / comprar cerca del mostrador |
| 1 | Equipar o guardar pistola |
| Botón derecho / izquierdo | Apuntar / disparar |
| R | Recargar |
| Flecha arriba | Abrir teléfono; guarda la pistola |
| Flechas, Enter, Escape | Navegar, seleccionar y volver en teléfono o tienda |
| Esc | Salir de la captura del puntero y pausar |
| F3 | Mostrar u ocultar los datos de depuración |

En una pantalla táctil, usa las flechas para moverte y arrastra sobre la escena para girar la cámara. Desde la pausa puedes cambiar la calidad gráfica y ajustar la hora. El navegador recuerda el perfil gráfico. Empieza con el perfil Bajo si el movimiento se siente entrecortado.

La entrada central del mercado está abierta. Acércate al mostrador de Mara y pulsa E con el arma guardada. Las compras van a la mochila del teléfono; selecciona un producto para usarlo. Mantener la mira sobre Mara durante tres segundos provoca un asalto. Los testigos pueden avisar a la policía, que busca a partir de lo observado. Los escaparates laterales reciben impactos y pierden su colisión al romperse.

El teléfono muestra testimonios de incidentes percibidos por vecinos. La grabación de video figura como no disponible: todavía no hay replay. No se guardan partidas; reiniciar desde pausa, ser detenido o perder toda la salud comienza una nueva escena. Los coches aún no se pueden conducir.

## Comprobar y compilar

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`npm run build` produce `dist/` para hosting y el HTML autocontenido en `jugar/`. `npm run preview` sirve `dist/`; no hace falta ejecutarlo para usar el archivo portable. Usa también un navegador para comprobar los controles, las colisiones y la escena con WebGL 2.

Consulta [el estado actual](PROJECT_STATE.md), [la arquitectura](ARCHITECTURE.md) y [la hoja de ruta](ROADMAP.md) antes de extender el juego.
