# Viceblock

Viceblock es un juego 3D de exploración urbana para navegador. Recorre barrios costeros de arquitectura art déco a pie o en coche, observa el ciclo de día y noche, y prueba el desafío de búsqueda de cinco estrellas. Los modelos, materiales, distritos y sonidos se generan con código.

## Jugar

Usa Node.js 24 LTS y un navegador con WebGL 2. Desde la raíz del repositorio ejecuta:

```sh
npm ci
npm run dev
```

Abre la dirección de Vite y selecciona **Explorar distrito**. El sonido se activa al entrar y puedes regularlo desde Ajustes.

| Control | Acción |
| --- | --- |
| WASD o flechas | Moverse a pie. En coche, acelerar, girar, frenar y retroceder |
| Ratón | Girar la cámara. Haz clic en el juego para capturar el puntero o arrastra sobre el escenario |
| Mayús | Correr a pie |
| Espacio | Saltar a pie o usar el freno de mano |
| E | Entrar cerca del coche o salir cuando esté detenido y haya espacio |
| H | Bocina |
| B | Iniciar o intensificar el desafío de búsqueda |
| Esc | Pausa y ajustes |
| F3 / F4 | Estadísticas / geometría de depuración |
| Mayús + 0–5 | Cambiar estrellas con F3 activo |

La cruceta y los botones táctiles aparecen en pantallas con puntero grueso. El navegador recuerda la calidad gráfica, el volumen y el silencio. Los perfiles ajustan sombras y resolución, y el juego adapta la resolución al ritmo de dibujo.

## Verificar y compilar

```sh
npm test
npm run build
npm run preview
```

La compilación se guarda en `dist/` y se puede servir en cualquier alojamiento estático. [Estado del proyecto](PROJECT_STATE.md) · [Arquitectura](ARCHITECTURE.md) · [Hoja de ruta](ROADMAP.md)
