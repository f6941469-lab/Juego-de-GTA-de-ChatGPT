# Viceblock 0.5.0 · Mercado Palma

Viceblock es un juego 3D urbano para navegador en el distrito de Costa Palmera. Conecta exploración a pie y conducción (`F` + `WASD`), `9` comercios abiertos con interior, `21` civiles con rutinas y conversación en español (`Pedro`, seguimiento persistente y eventos callejeros), autobús y metro transitables, destrucción de escaparates y mobiliario, patrullas policiales coordinadas, red social `Palma Social` y visor replay 3D desde el POV de testigos. La ciudad, materiales y audio se generan con código original. Consulta [.ai/CURRENT_STATE.md](.ai/CURRENT_STATE.md).

## Sustitución del sistema anterior

Esta versión conserva íntegramente la escena de Mercado Palma de las primeras capturas: HUD de efectivo/salud, minimapa compacto, teléfono verde y `Session` (`src/simulation/session.ts`) como autoridad física única. El motor de simulación anterior queda archivado en el historial de Git.

La entrega portable se identifica como **MERCADO PALMA · VERSIÓN 0.5.0 · SIN CONEXIÓN**. La versión web/de desarrollo muestra **VERSIÓN 0.5.0**.

## Ciudad viva · Fases 2–8 e interior comercial

- **9 tiendas reales:** `Mercado Palma`, `Dulcería Sol`, `Panadería Brisa`, `Cafetería Mar`, `Restaurante Bahía`, `Farmacia Verde`, `Ropa Palmera`, `Armería Norte` y `Minimercado Sur`, cada una con interior abierto, mostrador, stock, caja y clientes NPC.
- **Vida civil ("Pedro") y conversación:** Civiles con trabajos, objetos en mano (`café`, `bolsa`, `teléfono`, `maletín`), charlas entre ellos y con el jugador (`E`), reacción al sentirse seguidos reiteradamente y eventos urbanos acotados.
- **Conducción, robo y tránsito público:** Sube/baja o roba vehículos con `F`, viaja en el autobús circular (`4` paradas) o en la lanzadera de metro entre `Metro Sur` y `Metro Norte`.
- **Destrucción y policía coordinada:** `18` escaparates y `9` objetos callejeros destructibles actualizan la navegación en tiempo real; `2` patrullas conducen, desembarcan agentes, responden disparos y montan barricadas según evidencia real.
- **Grabación POV y Palma Social:** Los testigos graban en segmentos progresivos (si caen, se conserva el tramo enviado incluida la caída de cámara); revisa el feed y el replay 3D multiángulo en el teléfono (`↑`) o tras un arresto/derrota.
- **Optimización:** Sectores espaciales de `48 m` con lotes `core`/`detail`, avatares con geometría compartida y luz interior agrupada. Queda pendiente el guardado por archivo JSON (Fase 9) y perfilado en GPU física.

## Publicar en itch.io

Descarga el archivo **viceblock-itch.zip** preparado para cargar en itch.io. [Descargar ZIP de publicación](https://github.com/f6941469-lab/Juego-de-GTA-de-ChatGPT/raw/refs/heads/main/publicar/viceblock-itch.zip)

1. Elige **HTML** como tipo de proyecto en itch.io.
2. Sube `viceblock-itch.zip` y activa **This file will be played in the browser** para ese archivo.
3. Configura el área de juego en **960 × 640** y habilita el botón de pantalla completa. La interfaz también se adapta a pantallas táctiles.

El ZIP contiene un único `index.html` compilado en su raíz, con estilos, fuentes, física y licencias integrados. El archivo se genera en `publicar/viceblock-itch.zip` mediante `npm run build` o `npm run build:itch`. `npm run check:itch` comprueba que coincide con el HTML compilado.

## Jugar sin servidor

Descarga el [ZIP de la rama main](https://github.com/f6941469-lab/Juego-de-GTA-de-ChatGPT/archive/refs/heads/main.zip), extráelo y abre `jugar/index.html`. Si abres el `index.html` de la raíz, pulsa **Abrir juego sin conexión** para acceder al archivo preparado.

Abre **[jugar/index.html](jugar/index.html)** en un navegador con WebGPU o WebGL 2. Ese archivo integra JavaScript, estilos, fuentes, física WASM y licencias: puedes copiar únicamente ese HTML y jugar sin conexión, sin Node, npm o servidor. El `index.html` de la raíz es la plantilla para desarrollar; el archivo preparado para jugar está en la carpeta `jugar`.

`jugar/index.html` se validó en Chrome `158` vía `file://` con red desactivada (`0` peticiones HTTP y `0` errores); en navegadores administrados que bloqueen `file://`, usa un servidor local (`npm run preview`); consulta [la comprobación y sus límites](.ai/PORTABLE.md).

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
| W, A, S, D | Moverse / Conducir |
| Ratón | Girar la cámara. Haz clic en el juego para capturar el puntero |
| Mayús | Correr |
| Espacio | Saltar / Frenar vehículo |
| E | Hablar con NPC o comerciante / comprar en el mostrador |
| F | Subir, bajar o robar coche / subir a autobús o metro |
| 1 | Equipar o guardar pistola |
| Botón derecho / izquierdo | Apuntar / disparar |
| R | Recargar |
| Flecha arriba | Abrir teléfono (`Palma Social`, `Mochila`, `Guía`); guarda la pistola |
| Flechas, Enter, Escape | Navegar, cambiar de cámara en replay y volver en teléfono o tienda |
| Esc | Salir de la captura del puntero y pausar |
| F3 | Mostrar u ocultar los datos de depuración |

En una pantalla táctil, usa las flechas y botones táctiles para moverte, hablar, entrar en vehículos, disparar o abrir el teléfono, y arrastra sobre la escena para girar la cámara. Desde la pausa puedes cambiar la calidad gráfica y ajustar la hora. El navegador recuerda el perfil gráfico. Empieza con el perfil Bajo si el movimiento se siente entrecortado.

Acércate a cualquiera de las `9` tiendas con el arma guardada y pulsa `E` para comprar comida, munición o protección; desde la mochila del teléfono puedes usar tus productos. Mantener la mira sobre un comerciante durante tres segundos inicia un asalto. Los testigos avisan a la policía y graban el incidente desde su cámara POV para verlo luego en `Palma Social` o tras arresto/muerte. No se guardan partidas en disco aún (Fase 9); reiniciar desde pausa comienza una nueva sesión.

## Comprobar y compilar

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`npm run build` produce `dist/` para hosting, el HTML autocontenido en `jugar/` y el ZIP para itch.io en `publicar/`. `npm run preview` sirve `dist/`; no hace falta ejecutarlo para usar el archivo portable. Usa también un navegador para comprobar los controles, las colisiones y la escena con WebGL 2.

Consulta [el estado actual](PROJECT_STATE.md), [la arquitectura](ARCHITECTURE.md) y [la hoja de ruta](ROADMAP.md) antes de extender el juego.
