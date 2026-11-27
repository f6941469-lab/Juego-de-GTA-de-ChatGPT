# Estado activo — Mercado Palma 0.5.0 (Fases 3–8 y optimización)

Entrega de desarrollo sobre `main` que conserva a `Session` (`src/simulation/session.ts`) como dueño del único paso físico (`1/60 s`) e integra optimización gráfica/espacial, 9 tiendas transitables, vida civil ("Pedro"), transporte público y conducción/robo, destrucción conectada, respuesta policial en patrullas y grabación POV multiángulo con visor replay aislado.

## Implementado

- **Optimización contra tirones y mapa completado (`geometry.ts`, `buildings.ts`, `avatar.ts`, `actor.ts`, `traffic.ts`, `police.ts`, `feedback.ts`, `game.ts`):** Lotes `core` unificados globalmente por material, sectores `detail` de `64 m` con histéresis (`< 84 m` / `< 96 m`) y umbral de movimiento (`2 m`), simplificación de micro-parteluces en pisos altos (`story >= 2`), consolidación de cada avatar en `1` único `InstancedMesh` con `sharedAvatarMaterial` opaco (eliminando recompilaciones de shader en tiempo de juego y sombras lejanas `>= 26 m`), consolidación de cada vehículo/patrulla en `1` `InstancedMesh` con material compartido, omisión de `computeColliderMovement` en actores en reposo o embarcados, `particleGroup` ocultable, caché de `prompt`/`allActors` y calidad por defecto `medium`. En `F3` (Baja `720×480`) baja de `328` a **`77` llamadas** y de `338.093` a **`207.945` triángulos** (`9.50 ms` render CPU, `15.90 ms` simulación CPU en SwiftShader).
- **Nueve comercios reales y transporte (`shop.ts`, `transit.ts`, `district.ts`):** `Mercado Palma`, `Dulcería Sol`, `Panadería Brisa`, `Cafetería Mar`, `Restaurante Bahía`, `Farmacia Verde`, `Ropa Palmera`, `Armería Norte` y `Minimercado Sur` reemplazan cajas cerradas con interiores, mostradores y cajas propias. Se añaden `4` paradas de autobús y `2` estaciones transitables de metro (`Metro Sur` y `Metro Norte`).
- **Fase 3 · Vida civil autónoma en toda la ciudad, diálogo y eventos (`population.ts`, `dialogue.ts`, `world-state.ts`):** `worldLimits.entities` ampliado a `256`. Todos los civiles móviles (`allPeople`, `21` civiles) alternan autónomamente entre compras reales en las 9 tiendas, viajes en autobús/metro (cualquier pasajero que pierda el bus se desvía a la estación de metro más cercana), lugares de trabajo/ocio (`Jardín Coral`, `Paseo del Mar`, `Torre Alba`, `Hotel Miramar`, `Club Neón`), objetos en mano (`coffee`, `bag`, `phone`, `briefcase`), charlas NPC↔NPC (`0,45 s`) y Jugador↔NPC (`E`), detección de acoso persistente (`stalkScore`/`stalkStage` 1–2) y eventos NPC-vs-NPC acotados, eliminando los antiguos bucles estáticos y funciones obsoletas (`products`/`Item`, `dynamicActors` duplicado, getters duplicados).
- **Fase 4 · Vehículos, robo y tránsito (`traffic.ts`, `player.ts`, `input.ts`):** Conducción con `WASD`, freno `Espacio`, entrada/salida/robo con `F`, expulsión física sin duplicar el actor del conductor (`ejectFromVehicle`), recuperación automática de coches abandonados (`24 s`), autobús circular (`vehicle:bus:0`) y metro lanzadera (`vehicle:metro:0`) con interpolación suave sin hundir la cámara bajo el suelo.
- **Fases 5–7 · Economía, destrucción y patrullas (`model.ts`, `feedback.ts`, `police.ts`):** `Economy` multi-tienda con stock, cajas, consumo y blindaje (`armor`); `18` escaparates y `9` props destructibles (`hydrant`/`crate`) actualizando `Navigation`; `2` patrullas conducibles en `RoadNetwork` con agentes suspendidos (`actor.setSuspended`) mientras viajan y desembarco real, `suspectVehicleId`, fuego recíproco y barricadas dinámicas.
- **Gráficos PBR, atmósfera y shaders TSL (`geometry.ts`, `reflection.ts`, `atmosphere.ts`, `sky.ts`, `water.ts`, `renderer.ts`, `traffic.ts`, `avatar.ts`):** Texturas procedurales `128×128` con `bumpMap` para estuco en edificios (`wall`), baldosas de acera (`pavement`) y asfalto (`asphalt`) sin añadir llamadas de dibujo; cristal reflectivo (`roughness 0.12`, `metalness 0.62`), pintura automotriz brillante en coches/patrullas, sonda de reflejos celestes `256×128`, cielo TSL con contraluz dorado en nubes, agua TSL turquesa con Fresnel y reflejos nocturnos/diurnos, niebla más nítida y exposición `ACESFilmic 1.14`.
- **Comportamiento procedural de NPCs (`npc-mind.ts`, `population.ts`, `dialogue.ts`, `session.ts`):** Sustituye las rutinas cíclicas por una mente procedural basada en utilidad (*Utility AI*) con **5 impulsos** (`hunger`, `energy`, `social`, `errands`, `safety`), **4 rasgos** por personaje (`boldness`, `curiosity`, `sociability`, `punctuality`), **memoria episódica** (hasta `10` recuerdos persistentes de disparos, atracos, robos, amenazas, acoso, compras y charlas), **cautela por zonas** (`zoneCaution` para evitar áreas donde hubo incidentes), **reputación del jugador** (`playerTrust` / `playerWitnessedCrimes`: te saludan con cercanía si charlas bien o te reprochan delitos pasados incluso tras calmarse), **propagación de rumores** (`exchangeGossip` al conversar entre NPCs) y esquiva direccional de vehículos rápidos + reacción a persecuciones (`>= 2★`).
- **Sistema policial de 5 estrellas (`police.ts`, `session.ts`, `gameplay.ts`, `gameplay.css`, `minimap.ts`):** Escalado progresivo `0★–5★` (`heat` + `WANTED_TIERS`: `1★ AVISO POLICIAL`, `2★ PERSECUCIÓN ACTIVA` con patrullas y luces estroboscópicas, `3★ ALERTA DE DISTRITO` con barricadas y refuerzos SWAT, `4★ OPERATIVO SWAT` con helicóptero policial 3D y foco de búsqueda, `5★ ESTADO DE SITIO`). HUD con 5 estrellas animadas (parpadeo sirena en persecución / parpadeo y barra de enfriamiento al evadir) y radar policial en tiempo real en el minimapa (agentes, patrullas y helicóptero).
- **Cinemática de apertura y cimientos narrativos (`src/cinematics/`, `STORY_AND_CINEMATICS.md`):** Prólogo interactivo *«Un Coche, Dos Ladrones»* (`71,0 s`, `17` planos de cámara, `17` diálogos en español) al iniciar partida desde **Explorar distrito** (y repetible desde el menú de pausa).
- **Mapa multi-distrito ampliado, puentes, subidas/bajadas, montañas y 5 edificios funcionales (`expansion.ts`, `physics.ts`, `traffic.ts`, `district.ts`, `session.ts`, `gameplay.ts`, `minimap.ts`):** Mundo ampliado a `332×352 m` (`worldBounds`) conservando intacto **Costa Palmera Centro** y añadiendo **Isla Fortuna** (este tras Bahía Palmera), **Distrito Cívico y Penal** (norte), **Sierra Palmera** (oeste con cordillera prismática hasta `44 m`) y **Colinas del Sur**. Incluye **Puente Fortuna** (`z=7`) y **Puente Mirador** (`z=-63`) a `3,8 m`, carreteras con pendientes físicas reales (colisionadores rotados en Rapier + raycast de elevación en coches conducidos) hacia **Mirador Sierra** (`4,2 m`) y **Alto Mirador** (`7,8 m`), minimapa ampliado con islas/puentes/montañas/iconos y **5 edificios funcionales** interactivos con `E`: **Cárcel de Palma** (arresto real en celda, cumplir condena, fianza o fuga con `3★`), **Comisaría Central** (multas/limpiar estrellas, entrega voluntaria y boletín), **Casino Royale Palma** (ruleta y dados 21), **Restaurante El Mirador** (menús con salud/protección) y **Casa del Mirador** (villa comprable por `$350` con descanso `+6 h`, perfil bajo y respawn).
- `jugar/index.html` y `publicar/viceblock-itch.zip` regenerados con el empaquetado actual sin dependencias nuevas.

Contratos en [SIMULATION.md](SIMULATION.md), [NAVIGATION.md](NAVIGATION.md), [RENDERING.md](RENDERING.md) y [../STORY_AND_CINEMATICS.md](../STORY_AND_CINEMATICS.md). Pendientes para cierre de fase 9 y hardware real: guardado/carga en archivo JSON, perfilado WebGPU/FPS en GPU física y escucha de audio en hardware real.

## Verificación reciente

- `npm run typecheck`: aprobado (`0` errores).
- `npm test`: `11` archivos, **`45/45` pruebas aprobadas** (`tests/world-expansion.test.ts`, `police-npc.test.ts`, `cinematics.test.ts`, `fases-3-8.test.ts`, `city-simulation.test.ts`, `simulation.test.ts`, `world-state.test.ts`, `district.test.ts`, `player.test.ts`, `input.test.ts`, `fixed-loop.test.ts`).
- `npm run build`, `npm run check:portable`, `npm run check:itch`: aprobados (ver tamaños y SHA-256 en [PORTABLE.md](PORTABLE.md) e [ITCH.md](ITCH.md)).
- Navegador (`Google Chrome 158` + SwiftShader WebGL 2, `dist/` `960×640`): arranque de portada, cinemática de apertura, salto limpio al mundo abierto, verificación del HUD de `5` estrellas (`starsCount: 5`) y compilación limpia de materiales PBR/bump y shaders TSL con `0` errores de consola/JS.

Aceptación `WebGPU` en hardware físico y mediciones sostenidas de FPS en GPU/móvil siguen pendientes. El estado por zonas continúa en sesión (sin JSON en disco).

## Registro de 0.4.1

### Exportación para itch.io 0.4.1

La corrección de publicación añade `publicar/viceblock-itch.zip`, con el HTML compilado en su raíz. El ZIP del repositorio incluía la plantilla de desarrollo en esa ubicación y el juego compilado en una subcarpeta. La exportación actual toma `jugar/index.html` y lo empaqueta como único archivo. Instrucciones y comprobaciones en [ITCH.md](ITCH.md).

La validación del ZIP y su CRC pasó, al igual que tipos, 25 pruebas, compilación y comprobaciones reproducibles. El paquete completo pasó la prueba en iframe sandbox de otro origen, en escritorio y táctil, con cero errores y solicitudes externas. Informe en `/tmp/viceblock-041-itch/report.json`.

## Base funcional 0.4.0

Entrega del 2026-11-21. Se inicia la fase 2 del plan con navegación peatonal global, registro de entidades y zonas e historial con cuotas. Session sigue siendo dueño del único avance físico. La población, el mercado y el circuito de tráfico conservan su comportamiento de gameplay.

El backend gráfico es WebGPURenderer con shaders TSL y compatibilidad WebGL 2. Los presupuestos activos están en [RENDERING.md](RENDERING.md). Las decisiones civiles se espacian por distancia y urgencia. F3 muestra backend, resolución, entidades, historial y rutas diferidas.

La fase 2 permanece en curso. Quedan navegación jerárquica/vial y reservas, simulación de actividades en otras zonas y actualización localizada de obstáculos. Los hitos de tiendas, robo de coches, conversaciones y replay se mantienen en ROADMAP.md.

## Verificación de 0.4.0

Tipos, 25 pruebas en seis archivos, compilación web/portable y comparación reproducible aprobados. Chromium 156.0.8078.79/SwiftShader aprobó los flujos web y portable inline offline en escritorio y táctil. El backend fue WebGL 2, con cero errores de JavaScript o consola. Informes en `/tmp/viceblock-040-web/` y `/tmp/viceblock-040-portable/`. El HTML tiene 3.252.603 bytes y su hash se registra en PORTABLE.md.

El intento de WebGPU en el adaptador de software falló también con un triángulo independiente. Quedan pendientes la aceptación WebGPU en un dispositivo utilizable, el rendimiento físico y la apertura file://. Los límites y los diagnósticos están en RENDERING.md.

## Registro de entregas anteriores

### Mercado Palma 0.3.1

Fecha: 2026-11-20. El usuario solicitó sustituir todo el sistema anterior por la entrega de la primera captura y después autorizó iniciar el plan de ampliación. La base de gameplay sigue siendo la sustitución de 0.3.0; 0.3.1 añade la entrega portable sin modificar Session.

## Sistema ejecutado

- Entrada: `src/main.ts` → `createSession` (`src/simulation/session.ts`). Física compartida, interpolación y cámara de la entrega original.
- Distrito compacto con Mercado Palma/Mara, cuatro civiles autónomos, tres vehículos en circuito y dos policías a pie.
- Compras validadas, mochila, pistola 8/24, amenazas/asaltos, avisos de testigos, búsqueda con última ubicación y dos escaparates destructibles.
- Presentación de la primera captura: HUD de $120/salud/manos libres, minimapa compacto, teléfono verde y controles WASD/E/1/↑. Inicio frente a la tienda a las 17:15.
- Sin runtime anterior, conducción del jugador ni mapa de múltiples distritos. Su código permanece en el historial de Git; no hay dos implementaciones activas.
- Portada: **MERCADO PALMA · VERSIÓN 0.3.1**; portable añade **SIN CONEXIÓN**. HTML: `data-build="mercado-palma-0.3.1"`; portable añade `data-delivery="portable"`. Título: **Viceblock 0.3.1 — Mercado Palma**.

## Verificación histórica de la sustitución 0.3.0

- `npm run typecheck`: aprobado.
- `npm test`: 20 pruebas aprobadas en cinco archivos del sistema seleccionado.
- `npm run build`: aprobado, 45 módulos compilados.
- El código de `src/` coincide con 5660edc excepto el estilo de la nueva etiqueta de versión.
- Chromium 156 + SwiftShader, producción: identificador 0.3.0, ausencia del HUD anterior, teléfono por teclado, compra ($120→$112), disparo/recarga, reinicio, vista de calle de referencia, noche y movimiento/teléfono táctil 390×844 aprobados sin excepciones. Se inspeccionaron visualmente las capturas de portada y calle. Reporte: `/tmp/viceblock-030/report.json`; capturas: `entry.png`, `desktop.png`, `traffic.png`, `night.png` y `mobile.png`.

## Límites

Conducción, otros distritos, policía avanzada y replay no pertenecen a esta versión. El teléfono muestra testimonios de eventos reales con grabación no disponible. No se ha acreditado fluidez en GPU física; SwiftShader se usa para comprobar flujos. La referencia de 61 pruebas de la integración anterior no corresponde al árbol actual.

## Plan de ampliación solicitado

El usuario pidió un plan para entregar un único index.html y extender NPC, vehículos, tiendas/asaltos, destrucción, policía y grabaciones a todo el mapa. Ver [../ROADMAP.md](../ROADMAP.md). No se modificó el runtime al elaborar el plan.

Prueba técnica temporal fuera del repositorio: esbuild ya instalado produjo un HTML de 2.953.784 bytes, con JS/CSS/fuentes/WASM integrados. Chromium 156 con red deshabilitada ejecutó ese contenido inline en about:blank: WebGL/Rapier, movimiento y teléfono, con cero solicitudes HTTP(S) y cero excepciones. La navegación file:// fue bloqueada por una política administrativa del navegador del entorno; no se considera validada la apertura por doble clic. Informe temporal: `/tmp/viceblock-offline-spike/report.json`.

El usuario amplió la planificación con conversaciones, objetivos/objetos de NPC desde el inicio, robo de coches, nueve tiendas con clientes/consumo y POV de un testigo que puede morir mientras graba. Se detallan en ROADMAP.md, incluyendo conservación solo de segmentos capturados/enviados y contratos para historia/cinemáticas futuras, expresamente aplazadas. El LLM móvil se revisó con fuentes oficiales: viable de forma condicional, propuesto como redactor opcional; la base será diálogo contextual sin modelo. No hay inferencia ni mediciones en móvil, dependencias nuevas o cambios de gameplay por esta revisión.

## Primera implementación autorizada: portable 0.3.1

`jugar/index.html` ya es un entregable generado dentro del proyecto, no un experimento en /tmp. `scripts/build-portable.mjs` usa Vite existente, integra JS/CSS/fuentes/WASM/licencias y comprueba versión, imports, assets y sintaxis clásica. `build` produce web y portable; `build:portable` solo portable; `check:portable` exige igualdad sin escribir. CI verifica vigencia y adjunta el HTML. Detalles y diseño del futuro guardado por archivo: [PORTABLE.md](PORTABLE.md).

La prueba portable inline offline en Chromium 156/SwiftShader pasó: escritorio 960×640, táctil 390×844, compras ($120→$112), arma/recarga, teléfono, reinicio, noche, fuentes y AudioContext activo tras clic/suspendido al pausar; cero solicitudes HTTP(S), cero excepciones. Reporte `/tmp/viceblock-031-portable/report.json`. Inspeccionadas las capturas entry.png, traffic.png y mobile.png, conservando la presentación elegida. La apertura file:// real se intentó y fue bloqueada por `ERR_BLOCKED_BY_ADMINISTRATOR`; no se acredita doble clic. La fase 1 conserva ese punto pendiente.

Verificación 0.3.1: `npm run typecheck` (dentro de build), `npm test` (20/20 en cinco archivos), `npm run build` (web y portable) y `npm run check:portable` aprobados. Recompilación idéntica, 2.962.673 bytes. Smoke web también aprobado en los dos tamaños; reporte `/tmp/viceblock-031-web/report.json`. Intento file:// fallido registrado en `/tmp/viceblock-031-file/report.json`. No se midió FPS en GPU física ni se verificó audio por escucha.

## Publicación del HTML solicitada el 2026-11-21

Base sincronizada desde `main` en `765bc51`, con Mercado Palma 0.3.1. El index raíz permite acceder al portable mediante **Abrir juego sin conexión** y README enlaza el ZIP de main. HTML regenerado de 2.962.864 bytes, con SHA-256 y resultados en [PORTABLE.md](PORTABLE.md). Tipos, 20 pruebas, ambas compilaciones y comprobación reproducible aprobados. Smoke portable inline offline aprobado en escritorio y táctil, sin solicitudes HTTP(S) ni excepciones. Se reprodujo el bloqueo administrativo de file://.
