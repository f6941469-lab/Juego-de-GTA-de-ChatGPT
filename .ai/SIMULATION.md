# Contratos de la escena Mercado Palma

La entrega 0.5.0 amplía navegación, población, vehículos, comercio, policía y replay sobre el contrato de sesión único (`src/simulation/session.ts`). Conserva el empaquetado portable mediante `scripts/build-portable.mjs`; ver [PORTABLE.md](PORTABLE.md).

## Tiempo y física

`createSession.step()` es el dueño del tick integrado: `player.prepareStep` → decisiones de civiles/policía → preparar actores/tráfico/patrullas → `Physics.step(1/60)` una vez → `finishStep` de poses → armas/incidentes/grabación POV/feedback. `player.step()` conserva un wrapper para pruebas con un único personaje.

Rapier mantiene autoridad para cuerpos, rayos, colisiones y obstrucciones de cámara. Pausar o reproducir un replay detiene la entrada del jugador en el presente. Abrir teléfono, tienda o diálogo bloquea entradas de combate/movimiento del jugador mientras el barrio sigue simulándose (los replays aislados se ejecutan sobre un grupo visual separado sin mutar el estado vivo).

## Escena, tiendas y navegación

`shop.ts` y `transit.ts` reemplazan los lotes de nueve comercios reales (`Mercado Palma` en `3:3:1`, `Dulcería Sol`, `Panadería Brisa`, `Cafetería Mar`, `Restaurante Bahía`, `Farmacia Verde`, `Ropa Palmera`, `Armería Norte` y `Minimercado Sur`) y dos estaciones transitables de metro (`Metro Sur` y `Metro Norte`), además de `4` paradas de autobús en el núcleo central (`districtBounds`).

`expansion.ts` y `house-mansion.ts` amplían el mundo explorable a **`1.100 × 1.100 m`** (`worldBounds: x ∈ [-560, 540], z ∈ [-560, 540]`): **Isla Fortuna** conectada por `2` puentes colgantes de `162 m` (`Puente Fortuna` y `Puente Mirador`), **Distrito Cívico Norte** (**Comisaría Central**), **Barrio del Sol** (casas residenciales), **Distrito Penal Norte** (**Cárcel de Palma**), **Colinas del Sur** (**Restaurante El Mirador** en terraza panorámica a `y = 6 m`) y **Sierra Palmera** (cordillera hasta `86 m` y carretera de montaña en `3` tramos hasta la mansión moderna **Casa del Mirador** a `y = 24 m`, con `4` estancias amuebladas a escala humana `1,75 m`, cochera y piscina infinita mirando a la ciudad).

Navigation mantiene su rejilla A* de celdas de `0,6 m` en el núcleo urbano (jerarquía de `48` zonas, `2` búsquedas/tick, máx. `8192` visitas conjuntas y actualización localizada de los `18` escaparates + `9` props). En los distritos exteriores, `Actor.goTo` navega suavemente hacia los waypoints de barrios, casas y trabajos con la cápsula física de Rapier.

## Vida civil, eventos y percepción

`population.people` conserva `10` civiles base por compatibilidad y `allPeople` suma los `8` comerciantes adicionales, `3` viajeros multimodales (`Pedro`, `Valeria`, `Marcos`) y **`12` residentes distribuidos** en **Isla Fortuna**, **Barrio del Sol**, **Colinas del Sur** y **Sierra Palmera** (`33` civiles en total, `37` NPCs con policía). Cada civil posee mente procedural (`npc-mind.ts`), casa real (`homeLocation`), lugar de trabajo (`workLocation`) y punto social (`socialHub`), memoria episódica, reputación del jugador y propagación de rumores.

`Journal` conserva eventos, testimonios y `WitnessClip` (`Palma Social`). Un testimonio sin fotogramas mantiene `recording: 'unavailable'`. `recorder.ts` muestrea cada `0.18 s` desde testigos y `streetCams` multiángulo y consolida segmentos progresivamente: si un testigo cae mientras graba, el clip parcial (incluida la cámara caída) sobrevive sin atribuir acciones posteriores a un NPC incapacitado. El visor `replay` renderiza sobre `replayGroup` aislado sin generar nuevo dinero, alertas ni daño.

## Policía

Dos agentes a pie (`units[0..1]`) más dos patrullas conducibles en `RoadNetwork` con agentes embarcados (`units[2..3]`) que descienden al aproximarse. Mantienen conocimiento no omnisciente separado del jugador real: posición denunciada, última observación visual y `suspectVehicleId` (reducir huella visual fuera de vista acorta su detección a `11 m` frente a `19 m`). Responden con fuego recíproco (`onPlayerShot`) y colocan `barricades` sobre vías alcanzables.

## Comercio, armas y destrucción

`Economy` gestiona inventarios, cajas y stock por tienda (`stores`, `buyFrom`, `npcBuyFrom`, `robStore`), consumo de comida/bebida, munición y blindaje (`armor`). Cualquier amenaza sostenida sobre un comerciante activa el asalto en su local. Disparos en calle sin asalto previo generan alertas, daño y huida con el mismo sistema de incidentes. `Feedback` unifica los 18 escaparates y 9 props destructibles (`hydrant`/`crate`) con actualización inmediata de `Navigation`.

## Tráfico, transporte y recursos

Tres coches (`traffic.cars`, `vehicle:traffic:0..2`), autobús (`vehicle:bus:0`) y metro lanzadera (`vehicle:metro:0`) recorren `RoadNetwork` (`25` cruces, `80` carriles). Con `F` el jugador sube/baja de autobús, metro o vehículos civiles, expulsando al conductor (`ejectFromVehicle`) con reacción coherente de conductor y testigos (`theft`). En conducción, `WASD` acelera/gira y `Espacio` frena.

Web Audio sintetiza pasos, motores, disparos, recarga, roturas, compras y sirenas con voces acotadas. `Dispose` libera controladores, mallas instanciadas, geometrías compartidas, `PointLight` único agrupado y audio. Detención o salud cero reinician la escena (ofreciendo acceso al replay si existen clips capturados en sesión); `worldLimits.entities` es `256`.
