# Viceblock

Viceblock es un juego 3D urbano para navegador. La escena inicial de Mercado Palma conecta exploración a pie, cuatro civiles con rutinas, tres coches autónomos, comercio, pistola, testigos, dos policías y escaparates que se rompen. La ciudad, los materiales y los personajes se generan con código original. El alcance es local y varios sistemas siguen siendo parciales; consulta [.ai/CURRENT_STATE.md](.ai/CURRENT_STATE.md).

## Ejecutar el juego

Usa Node.js 24 LTS. Las versiones admitidas se registran en `package.json`. El entorno de desarrollo en la nube trae Node.js 24 y npm 11. Para jugar necesitas un navegador compatible con WebGL 2.

Ejecuta estos comandos desde la raíz del repositorio.

```sh
npm ci
npm run dev
```

Abre la dirección que indica Vite y selecciona **Explorar distrito** para entrar al distrito.

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

`npm run preview` sirve la compilación de `dist/`. Usa también un navegador para comprobar los controles, las colisiones y la escena con WebGL 2.

Consulta [el estado actual](PROJECT_STATE.md), [la arquitectura](ARCHITECTURE.md) y [la hoja de ruta](ROADMAP.md) antes de extender el juego.
