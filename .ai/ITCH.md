# Publicación HTML en itch.io · 0.5.0

## Archivo de carga

`publicar/viceblock-itch.zip` es el paquete preparado para subir al proyecto HTML. Contiene exactamente un `index.html` compilado en la raíz del ZIP. Ese HTML integra JavaScript, estilos, fuentes, WASM y las licencias.

La descarga del código fuente desde GitHub conserva la plantilla de desarrollo en el index raíz y la entrega portable en `jugar/`. El problema comunicado se corrige generando un archivo de publicación dedicado a partir de esa entrega portable.

El generador `scripts/build-itch.mjs` usa los módulos fs, crypto y zlib de Node, un CRC-32 y las cabeceras estándar del ZIP. La entrada usa DEFLATE y una fecha DOS fija, permitiendo comparar bytes al recompilar con las mismas herramientas. El archivo generado se incluye en main para descargarlo directamente. Su regla de Git lo trata como binario generado.

## Construir y comprobar

- `npm run build` genera web, HTML portable y ZIP.
- `npm run build:itch` comprueba tipos, reconstruye el portable y genera el ZIP.
- `npm run check:portable` verifica el HTML frente a la fuente.
- `npm run check:itch` verifica el ZIP frente al HTML portable actual.

CI recompila y exige que el HTML y el ZIP versionados coincidan con sus salidas. Se mantiene el artefacto portable de CI, cuyo contenido es el HTML integrado.

## Configurar el proyecto

1. Seleccionar HTML como tipo de proyecto en itch.io.
2. Cargar `viceblock-itch.zip` y activar **This file will be played in the browser**.
3. Usar 960×640 como tamaño inicial de escritorio y habilitar el botón de pantalla completa. La interfaz responde también al tamaño móvil.

README enlaza directamente el ZIP de publicación en main. La carga del archivo al proyecto de itch.io la realiza el propietario desde su cuenta.

## Compatibilidad con iframe

La portada respeta el foco del alojamiento antes de la primera interacción. Se retiró el atributo autofocus del botón de cierre y el foco programático inicial del botón de jugar se aplica cuando el documento ya tiene foco. El foco del canvas al entrar sigue asociado a la interacción del jugador. Esto corrige los avisos de autoenfoque bloqueado en frames de otro origen.

`tests/itch-smoke.mjs` lee el ZIP real, valida sus cabeceras y su entrada única, descomprime el HTML y lo compara con el portable. Sirve ese contenido bajo `/uploads/viceblock/index.html` y lo carga en un iframe de otro origen con sandbox y permisos de scripts, mismo origen, captura del puntero, audio y pantalla completa.

La prueba reutiliza los flujos de `tests/browser-smoke.mjs` sobre el Frame del juego. Observa errores de JavaScript y consola, solicitudes externas, versión, fuentes, inicio, teléfono, compras, disparo/recarga, pausa, reinicio, audio, noche y controles táctiles. También comprueba que el arranque respete el foco del padre. El servidor rechaza rutas ajenas al HTML del paquete.

```sh
VICEBLOCK_PLAYWRIGHT=/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright VICEBLOCK_CHROMIUM=/usr/bin/chromium VICEBLOCK_ARTIFACT_DIR=/tmp/viceblock-050-itch node tests/itch-smoke.mjs
```

Playwright es una herramienta externa de comprobación. El juego y su exportación se construyen con las dependencias ya fijadas del proyecto.

## Resultado histórico de 0.4.1 · 2026-11-21

Tipos, 25 pruebas Vitest en seis archivos, build, check:portable y check:itch aprobados. La librería ZIP estándar de Python comprobó la entrada única, la igualdad del HTML y el CRC del archivo final. El ZIP ocupa 1.169.830 bytes y su SHA-256 es `e0ae161c13fe9bf9587455dcb11d63e54954f787818a47b720f4a46fd5569356`. El HTML integrado ocupa 3.252.614 bytes y su SHA-256 es `7e336147f5212ad4e25a41ca2d1fa5a6568ba2d1c84e591696495c5d4b9cc527`.

Chromium 156.0.8078.79 con SwiftShader aprobó el paquete dentro del iframe sandbox de otro origen en escritorio 960×640 y táctil 390×844. Backend WebGL 2, cero errores de JavaScript o consola, cero solicitudes a orígenes externos y cero rutas faltantes. Pasaron compras, teléfono, disparo/recarga, audio, pausa, reinicio y noche. Se inspeccionaron las capturas de portada y móvil. Informe en `/tmp/viceblock-041-itch/report.json`. Esta verificación usa un alojamiento local de prueba.

La prueba web directa también pasó en escritorio y táctil con cero errores de JavaScript o consola. Informe en `/tmp/viceblock-041-web/report.json`.

## Entrega 0.5.0 · 2026-11-21

Tipos, 32 pruebas Vitest en siete archivos, build web/portable/ZIP, check:portable y check:itch aprobados. Python zipfile confirmó entrada única `index.html`, CRC e igualdad exacta con el HTML portable.

| Archivo | Bytes | SHA-256 |
| --- | --- | --- |
| `jugar/index.html` | 3.261.299 | `b43f69f9433e1b6c6dee3de540064a3deefd6834fcfa083be755b0fec7af1408` |
| `publicar/viceblock-itch.zip` | 1.173.095 | `0b330516c87db81a07b0ca5308a66c0a8c02197e9f71b7127176e20023c7d691` |

El ZIP final pasó los flujos completos en iframe sandbox de otro origen: escritorio 960×640 y táctil 390×844, Chromium 156.0.8078.79/SwiftShader, backend WebGL 2. Cero errores de JavaScript/consola, solicitudes externas o rutas faltantes. Informe `/tmp/viceblock-050-itch/report.json`.

La entrega web de producción también pasó en ambos tamaños, sin errores. Informe `/tmp/viceblock-050-web/report.json`. Se inspeccionaron las vistas de calle y móvil; la captura web nocturna muestra el mercado a las 22:00. El smoke espera ahora el cierre del diálogo y la actualización del reloj antes de capturar la noche.

La prueba del ZIP usa alojamiento local; no publica en una cuenta de itch.io. WebGPU en hardware utilizable y mediciones físicas mantienen los límites de validación documentados.

## Actualización Fases 3–8 y optimización · 0.5.0

Tipos, `37` pruebas en `8` archivos, `build`, `check:portable` y `check:itch` aprobados. `zipfile` de Python comprobó entrada única `index.html` y CRC sin errores.

| Archivo | Bytes | SHA-256 |
| --- | --- | --- |
| `jugar/index.html` | 3.321.838 | `56e4e8bb5372dab14d7ecef601057bdb8126442d15cab5cfec760a1f0f71e14a` |
| `publicar/viceblock-itch.zip` | 1.193.459 | `37eb4c0106654e2d03442a4cc66c853b9987d7b58b7190606f4263cfe0995dc0` |

En Google Chrome `158.0.8127.36` (SwiftShader WebGL 2, Playwright Python), servido en `iframe` sandbox de otro origen (`390×844` táctil): arrancó en `WebGL 2`, mostró HUD y `13` botones táctiles ajustados sin desbordar horizontalmente, respetó el foco inicial del padre, `0` solicitudes externas y `0` excepciones JS (`failed_urls: []`; al pulsar `#play-button` mediante script en contexto de otro origen Chrome registra el aviso estándar `focus-without-user-activation` y los 404 locales de `/favicon.ico`).

## Actualización Cinemática de apertura · 0.5.0

Tipos, `40` pruebas en `9` archivos, `build`, `check:portable` y `check:itch` aprobados.

| Archivo | Bytes | SHA-256 |
| --- | --- | --- |
| `jugar/index.html` | 3.374.415 | `555736727757d5a352699b3ac6bd76b6bfa60360e055a250671653f25d983033` |
| `publicar/viceblock-itch.zip` | 1.210.944 | `6d6d760b84b2c868ddc71efa91c6cbc76571572294e3d805332aafad70cad098` |

## Actualización Gráficos PBR, NPCs y Policía 5 estrellas · 0.5.0

Tipos, `42` pruebas en `10` archivos, `build`, `check:portable` y `check:itch` aprobados.

| Archivo | Bytes | SHA-256 |
| --- | --- | --- |
| `jugar/index.html` | 3.386.892 | `0e5620025791291cc520e921e37bb2df7e0875dddf760923124dff6c7c91878f` |
| `publicar/viceblock-itch.zip` | 1.215.790 | `f4f8ee7c4f801bc64c76e08eddc063b9928758bde1fb353dc7b6a15192a1de28` |

## Actualización Comportamiento Procedural NPC (`npc-mind.ts`) · 0.5.0

Tipos, `43` pruebas en `10` archivos, `build`, `check:portable` y `check:itch` aprobados.

| Archivo | Bytes | SHA-256 |
| --- | --- | --- |
| `jugar/index.html` | 3.395.179 | `a4ce41f54b52d7e6c7c1505bbc7cba96a4c716d5bb6592ab5bf8dd5533412bdf` |
| `publicar/viceblock-itch.zip` | 1.218.959 | `32e8742a306cc51491d6ec1e5bbd79bbbe9903e2ff01a2a6d4b7f2541f8336cf` |



