# Viceblock

Viceblock es un juego 3D de exploración urbana para navegador. Recorre un distrito costero de arquitectura art déco con un personaje cúbico y observa cómo cambia el barrio al avanzar el día. La ciudad, los materiales y el personaje se generan con código original.

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
| Esc | Salir de la captura del puntero y pausar |
| F3 | Mostrar u ocultar los datos de depuración |

En una pantalla táctil, usa las flechas para moverte y arrastra sobre la escena para girar la cámara. Desde la pausa puedes cambiar la calidad gráfica y ajustar la hora. El navegador recuerda el perfil gráfico. Empieza con el perfil Bajo si el movimiento se siente entrecortado.

## Comprobar y compilar

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`npm run preview` sirve la compilación de `dist/`. Usa también un navegador para comprobar los controles, las colisiones y la escena con WebGL 2.

Consulta [el estado actual](PROJECT_STATE.md), [la arquitectura](ARCHITECTURE.md) y [la hoja de ruta](ROADMAP.md) antes de extender el juego.
