# Historia y Motor de Cinemáticas — Viceblock (Costa Palmera)

Este documento describe **todo lo que se ha construido para la cinemática de apertura** (*Prólogo: Un Coche, Dos Ladrones*) y documenta **los cimientos narrativos y técnicos** del sistema `src/cinematics/` para que cualquier agente de IA o desarrollador pueda continuar la historia con nuevos capítulos, misiones y escenas in-engine manteniendo la calidad visual, el rendimiento y la coherencia del mundo abierto.

---

## 1. Qué se ha creado en esta entrega

### 1.1. Flujo de experiencia del jugador
1. Al pulsar **«Explorar distrito»** en la pantalla de inicio por primera vez, se desbloquea Web Audio y arranca automáticamente la cinemática de apertura en tiempo real sobre el distrito 3D de Costa Palmera (`mode = 'cinematic'`).
2. Durante la reproducción se ocultan los actores/vehículos aleatorios de `Session` y el avatar jugable (`player.setCinematicHidden(true)`, `session.setCinematicMode(true)`) para disponer de un set cinematográfico limpio, bien iluminado y sin interferencias.
3. El jugador puede **saltar la cinemática** en cualquier momento pulsando `Espacio`, `Esc` o el botón **«Saltar»**, y puede **volver a verla** cuando quiera desde el menú de Pausa (**«Ver cinemática de apertura»**).
4. Al terminar el prólogo (minuto `1:11`), la cámara desliza suavemente sin cortes hasta encajar con la cámara en tercera persona exacta del jugador en **Mercado Palma** (`(15.42, 2.343, 46.547)` mirando a `(15.29, 1.19, 41.3)`, `FOV 58°`), se retraen las barras panorámicas `2.35:1`, se restauran el tráfico y los vecinos autónomos y aparece el aviso inicial de **Valeria** conectando la narrativa con el mundo abierto.

### 1.2. Guion completo del Prólogo: *«Un Coche, Dos Ladrones»* (`71.0 s`)

| # | Tiempo | Plano (`shotId`) | Ubicación | Hora / Mood | Acción, cámara y animación |
|---:|---|---|---|---|---|
| 1 | `0.0–3.5s` | `shot_01_establish` | Avenida Central (Hotel Miramar) | `17:21` · `golden_boulevard` | Plano grúa descendente sobre el bulevar dorado. Tarjeta de título `PRÓLOGO · COSTA PALMERA / UN COCHE, DOS LADRONES`. Leo agachado junto al deportivo coral **Palma GT**. |
| 2 | `3.5–8.2s` | `shot_02_lockpick` | Puerta del deportivo (`x = -2.42, z = 23.0`) | `17:21` · `golden_boulevard` | Plano cercano bajo (`FOV 42°`) de Leo agachado forzando la cerradura con ganzúa (`sneak_lockpick`), chispas metálicas, mirada vigilante a ambos lados y leve tirón a la puerta. |
| 3 | `8.2–11.8s` | `shot_03_valeria_enters` | Paso de Hotel Miramar → Deportivo | `17:24` · `golden_boulevard` | Contra-picado heroico: **Valeria** llega decidida, descubre a Leo y le exige que suelte el coche mientras Leo se incorpora sorprendido. |
| 4 | `11.8–15.2s` | `shot_04_argue_leo` | Plano/contraplano sobre Leo | `17:24` · `golden_boulevard` | Leo gesticula (`argue_hands`) señalando que el motor está caliente y el seguro ya venía arañado. |
| 5 | `15.2–18.6s` | `shot_05_argue_valeria` | Plano/contraplano sobre Valeria | `17:27` · `golden_boulevard` | Valeria lo señala furiosa (`argue_point`): acaba de sacarlo del estacionamiento del hotel y le advierte que se marche. |
| 6 | `18.6–22.8s` | `shot_06_police_arrival` | Avenida Central norte → cruce | `17:33` · `police_tension` | **Sirenas y luces estroboscópicas reales** (`sirenBlue` / `sirenRed`). Una patrulla frena en diagonal con chirrido de neumáticos y cabeceo de suspensión; ambos se congelan mirándola. |
| 7 | `22.8–27.6s` | `shot_07_interrogation` | Junto a la patrulla | `17:36` · `police_tension` | Se abre la puerta policial y baja el **Agente Morales** (`cautious_step` → `inspect`) con linterna y placa: informa que el deportivo coral fue reportado robado en la costa. |
| 8 | `27.6–30.2s` | `shot_08_glance` | Two-shot cerrado Leo y Valeria | `17:36` · `police_tension` | Plano tenso (`FOV 40°`): Leo y Valeria cruzan miradas. Valeria susurra que si los detienen con ese coche no salen en cinco años. |
| 9 | `30.2–34.4s` | `shot_09_fake_boyfriend` | Arco dinámico sobre Leo | `17:39` · `police_tension` | **La farsa:** Leo improvisa pose suplicante (`plead`) fingiendo que solo intenta sacar su chaqueta del coche de su novia tras una discusión. |
| 10 | `34.4–38.6s` | `shot_10_fake_girlfriend` | Plano medio sobre Valeria | `17:39` · `police_tension` | Valeria le sigue el juego como exnovia furiosa (`arms_crossed` → `argue_point`): *«¡Exnovio desde hace diez minutos, Leo!»*. |
| 11 | `38.6–42.6s` | `shot_11_officer_approaches` | Dolly-in con leve ángulo holandés | `17:42` · `police_tension` | El Agente Morales desconfía al ver la cerradura forzada, avanza cautelosamente (`cautious_step`) hacia Valeria y pide los papeles. |
| 12 | `42.6–46.0s` | `shot_12_knockout` | Acción en plano bajo + sacudida | `17:45` · `impact_flash` | **Clímax:** Valeria carga cadera y puño (`punch_windup`) y conecta un derechazo explosivo (`punch_strike`) con flash blanco, partículas de impacto, golpe seco (`punch`) y *camera shake*. Morales cae hacia atrás noqueado (`knockback_fall` → `knocked_out`). |
| 13 | `46.0–50.8s` | `shot_13_getaway` | Bulevar hacia el sur | `17:51` · `police_tension` | Ambos corren hacia las puertas abiertas del Palma GT (`run`), suben, golpean las puertas, rugen el motor con humo de escape y salen disparados hacia el sur. |
| 14 | `50.8–56.8s` | `shot_14_montage_chase` | **Montaje A:** Paseo del Mar (`x = 47`) | `18:27` · `sunset_chase` | Tarjeta `NOCHE 1 · PASEO DEL MAR / A TODA VELOCIDAD`. Persecución a toda velocidad frente al océano al atardecer con cámara lateral baja. |
| 15 | `56.8–62.8s` | `shot_15_montage_neon` | **Montaje B:** Club Neón (`x = 4.4, z = 21.4`) | `22:21` · `neon_night` | Tarjeta `DÍA 2 · CLUB NEÓN / SOCIOS EN LA SOMBRA`. Noche con focos magenta/cian, faros encendidos, Leo con café y Valeria con bolsa celebrando su alianza (`celebrate`, `lean_cool`). |
| 16 | `62.8–68.5s` | `shot_16_montage_palma` | **Montaje C:** Mercado Palma (`z = 45`) | `17:15` · `palma_handoff` | Tarjeta `DÍA 4 · MERCADO PALMA / EL COMIENZO`. Llegan frente a Mercado Palma, bajan del coche; Valeria encarga a Leo mantener perfil bajo y hacer caja hasta el golpe grande, se despide (`wave_bye`) y se aleja por la acera. |
| 17 | `68.5–71.0s` | `shot_17_open_world_glide` | Spawn de jugador (`15.0, 0, 41.5`) | `17:15` · `palma_handoff` | Barrido suave hacia la cámara jugable exacta (`follow-camera.ts`), retracción del letterbox y entrega inmediata del control al jugador. |

---

## 2. Biblia de personajes y continuidad narrativa

### 2.1. Reparto principal ya modelado (`ACTOR_SPECS` en `src/cinematics/actor-rig.ts`)

| ID (`CinematicActorId`) | Nombre | Paleta visual | Rasgos distintivos del rig | Rol y voz |
|---|---|---|---|---|
| `'leo'` | **Leo** (Protagonista) | Camisa turquesa `#247c81`, vivo coral `#f2a772`, pantalón grafito `#333848` | Emblema solar en la espalda, reloj de pulsera, idéntico al avatar jugable (`src/characters/avatar.ts`) | Improvisador, ingenioso, carismático bajo presión; recién llegado al circuito criminal de Costa Palmera. |
| `'valeria'` | **Valeria** (Coprotagonista) | Chaqueta carmesí `#c42b52`, top crema `#fff0d4`, detalles dorados `#ffd57e` | Silueta estilizada, melena larga + **coleta con movimiento secundario dinámico**, pendientes y colgante dorados | Ladrona veterana, audaz, directa, con contactos en Club Neón y Hotel Miramar. Actúa como mentora/socia y disparadora de misiones principales. |
| `'officer'` | **Agente Morales** | Uniforme azul marino `#264166`, placa y galones `#f3cc58` | Gorra policial con visera y escudo, gafas oscuras, cinturón táctico con hebilla dorada | Policía meticuloso y desconfiado; tras el golpe del bulevar, tiene motivos personales para rastrear a Leo y Valeria por el distrito. |

### 2.2. Banderas narrativas iniciales (`NarrativeState`)
Al completar o saltar el prólogo, `CinematicDirector` registra automáticamente:
- `currentChapter`: `'prologue_stolen_car'`
- `completedChapters`: `['prologue_stolen_car']`
- `flags`:
  - `prologue_completed: true`
  - `met_valeria: true`
  - `escaped_police_boulevard: true`
  - `valeria_contact_active: true`

### 2.3. Mapa sugerido de capítulos futuros (guía para siguientes IAs)
- **Capítulo 1 — *«Caja Chica en el Barrio»* (`chapter_01_mercado_cash`):**
  - *Disparador:* Cuando el jugador acumula efectivo (`economy.cash >= 120`) o completa su primer atraco/compra y abre el teléfono (`Palma Social` / futuro buzón de mensajes).
  - *Historia:* Valeria cita a Leo en **Club Neón** de noche (`x = 4.5, z = 21.4`) porque Morales está revisando las grabaciones virales de *Palma Social* y necesitan limpiar matrículas en **Taller Sur**.
- **Capítulo 2 — *«El Deportivo Caliente»* (`chapter_02_hot_wheels`):**
  - *Disparador:* Acudir con un coche robado al punto de entrega junto a **Torre Alba** (`x = 15, z = -51.2`).
  - *Historia:* El dueño real del deportivo coral resulta ser un empresario vinculado a **Hotel Miramar**; ofrece un trato peligroso o desencadena una emboscada policial coordinada.
- **Capítulo 3 — *«El Golpe Grande»* (`chapter_03_grand_heist`):**
  - *Disparador:* Completar Capítulos 1 y 2 + tener pistola equipada y vehículo preparado.
  - *Historia:* Golpe coordinado con Valeria en el distrito financiero (Torre Alba / Metro Norte) con escape hacia el **Paseo del Mar**, múltiples testigos grabando para *Palma Social* y desenlace con replay multicámara POV.

---

## 3. Arquitectura técnica de cimientos (`src/cinematics/`)

El motor está diseñado bajo principios **data-driven**, **desacoplado de la física Rapier** y **con coste GPU/CPU cero cuando no hay una cinemática activa**.

### 3.1. Mapa de módulos
- [`src/cinematics/types.ts`](src/cinematics/types.ts): Contratos TypeScript de secuencias (`CinematicSequence`), estados por fotograma (`CinematicFrameState`), poses (`CinematicPosePreset`), vehículos (`VehicleSample`), diálogos (`DialogueCue`), tarjetas (`TitleCardCue`), audio (`TimedAudioCue`), partículas (`TimedParticleCue`) y estado narrativo (`NarrativeState`).
- [`src/cinematics/actor-rig.ts`](src/cinematics/actor-rig.ts): Rig esquelético cinematográfico en **1 único `InstancedMesh` por actor** (mismo principio de rendimiento que `src/characters/avatar.ts`), con articulación independiente de cadera, torso, cabeza (con *look-at* automático a coordenadas del mundo), coleta secundaria, hombros 3-ejes, codos, piernas y 6 props de mano (`lockpick`, `badge`, `flashlight`, `coffee`, `bag`, `keys`).
- [`src/cinematics/vehicles.ts`](src/cinematics/vehicles.ts): Vehículos cinematográficos articulados (`sportsCar` Palma GT y `patrolCar` Costa Palmera PD) con **puertas pivotantes** (`driverDoor`, `passengerDoor`), ruedas con giro y rotación (`steer`, `wheelSpeed`), cabeceo/balanceo de suspensión (`pitch`, `roll`), faros y barra de luces policiales alternante.
- [`src/cinematics/lighting.ts`](src/cinematics/lighting.ts): Iluminación de estudio de 3 puntos (`keyLight`, `fillLight`, `rimLight`) orientada dinámicamente respecto al eje cámara→sujeto según 6 *moods* (`golden_boulevard`, `police_tension`, `impact_flash`, `sunset_chase`, `neon_night`, `palma_handoff`), más focos estroboscópicos rojo/azul de patrulla, foco frontal del coche y piscina de 28 partículas (`sparks`, `impact`, `exhaust`).
- [`src/cinematics/opening-story.ts`](src/cinematics/opening-story.ts): Implementación completa de `OPENING_SEQUENCE` (`prologue_stolen_car`).
- [`src/cinematics/overlay.ts`](src/cinematics/overlay.ts) y [`src/ui/cinematic.css`](src/ui/cinematic.css): Capa HTML panorámica `2.35:1` con barras letterbox animadas, subtítulos codificados por color de hablante, tarjetas de capítulo/montaje, fundidos negros, destellos blancos de impacto, barra de progreso y control de salto.
- [`src/cinematics/director.ts`](src/cinematics/director.ts): `createCinematicDirector` orquesta el escenario (`CinematicStage`), los rigs, el audio procedural (`audio.playCinematic`), la cámara (`shake`, `roll`, `fov`), los disparadores únicos de audio/partículas, las banderas narrativas y la limpieza total al finalizar.

### 3.2. Catálogo de poses listas para usar (`CinematicPosePreset`)
Cualquier nueva escena puede usar directamente estos 19 presets en `ActorSample.pose`:
- Locomoción y reposo: `'idle'`, `'walk'`, `'run'`, `'cautious_step'`, `'lean_cool'`.
- Interacción y sigilo: `'sneak_lockpick'`, `'inspect'`, `'wave_bye'`, `'celebrate'`.
- Interpretación dramática / diálogo: `'argue_point'`, `'argue_hands'`, `'plead'`, `'arms_crossed'`.
- Acción y combate: `'punch_windup'`, `'punch_strike'`, `'knockback_fall'`, `'knocked_out'`.
- Vehículos: `'drive_seated'`, `'passenger_seated'`.

*(Todos aceptan además `talking: 0..1` para gestualidad vocal, `lookAt: {x, y, z}` para seguimiento ocular/cabeza y `prop` para accesorios en mano).*

### 3.3. Convenciones de coordenadas y escenarios verificados para rodar en Costa Palmera
Reglas de ejes del proyecto (`AGENTS.md`):
- `1 unidad ≈ 1 metro`, `+Y` arriba.
- `heading = 0` mira al **Norte (`-Z`)**; `heading = +π/2` mira al **Este (`+X`)**; `heading = π` mira al **Sur (`+Z`)**; `heading = -π/2` mira al **Oeste (`-X`)**.
- Fórmula estándar para orientar un actor hacia un punto: `Math.atan2(to.x - from.x, -(to.z - from.z))`.
- En `vehicles.ts`, `driverDoor` está en `-X` local y `passengerDoor` en `+X` local.

**Platos naturales despejados y verificados sin colisión con edificios ni farolas:**
1. **Avenida Central (Hotel Miramar / Club Neón):** Calzada libre `x ∈ [-5.5, +5.5]`, `z ∈ [14, 38]` (farolas/palmeras en `x = ±6.54 / ±7.08`). Ideal para escenas urbanas diurnas o nocturnas frente a **Club Neón** (`x = 15.15, z = 21`) o **Hotel Miramar** (`x = -12.15, z = 20.8`).
2. **Avenida Costera / Paseo del Mar:** Calzada `x ∈ [44, 50]`, `z ∈ [-45, 65]`; paseo despejado para cámara lateral en `x ∈ [52, 58]` con el océano en `x > 62`. Ideal para persecuciones al atardecer o amanecer.
3. **Esquina Mercado Palma (Spawn):** Calzada `z ∈ [41, 49]`, `x ∈ [-5, 22]`. Punto exacto de entrega al jugador:
   - Posición de pie de Leo: `{ x: 15.0, y: 0, z: 41.5 }`, `heading: 0`.
   - Posición exacta de cámara en tercera persona (`src/player/follow-camera.ts`): `pos = (15.42, 2.343, 46.547)`, `lookAt = (15.29, 1.19, 41.3)`, `fov = 58`.
4. **Cruce Norte / Torre Alba:** Calzada `x ∈ [24, 32]`, `z ∈ [-60, -35]` frente a la torre de 12 plantas (`x = 15, z = -51.2`).
5. **Jardín Coral (Parque):** Área verde abierta en `x ∈ [34, 41]`, `z ∈ [14, 32]`.

---

## 4. Receta paso a paso para que una IA continúe la historia

Si eres un agente de IA continuando la narrativa de Viceblock, sigue este protocolo:

1. **Crear el archivo del nuevo capítulo** en `src/cinematics/chapter-XX-nombre.ts` exportando un objeto que cumpla `CinematicSequence`:
   - Define `id: 'chapter_01_...'`, `title`, `duration`, `completionFlags`, `completionNotice`, `shots`, `dialogues`, `titleCards`, `audioCues`, `particleCues` y `evaluate(time)`.
   - Usa la misma lógica determinista pura en `evaluate(time)` (sin estado mutable interno) para que cualquier `time` sea reproducible y testeable.
2. **Añadir personajes o poses nuevas (si el guion lo requiere):**
   - Añade el nuevo ID a `CinematicActorId` en `src/cinematics/types.ts` y su paleta/geometría a `ACTOR_SPECS` + `createCinematicActorRig` en `src/cinematics/actor-rig.ts`, manteniendo **siempre 1 único `InstancedMesh` por personaje**.
   - Añade nuevos `CinematicPosePreset` en el `switch (sample.pose)` de `actor-rig.ts`.
3. **Conectar el disparador desde el mundo abierto (`src/main.ts` y `src/simulation/session.ts`):**
   - Mantén la lógica de simulación dentro de `Session` (por ejemplo, detectar llegada a una zona, saldo acumulado o llamada contestada en el teléfono) y emite un callback `onTriggerCinematic(sequenceId)` hacia `main.ts`.
   - En `main.ts`, ejecuta la misma rutina limpia que `startPrologue()` (`session.closeOverlay()`, `input.setActive(false)`, `player.setCinematicHidden(true)`, `session.setCinematicMode(true)`, `cinematics.start(sequence)`).
   - Para una transición sin cortes desde cualquier posición del jugador `(px, py, pz)` y rumbo `yaw`, calcula la pose de cámara destino usando la fórmula de `src/player/follow-camera.ts` (`distance = 5.15`, `pitch = 0.20`, `shoulder = 0.42`, `pivot.y = py + 1.32`).
4. **Persistir el progreso narrativo (opcional en entregas futuras):**
   - `director.narrative` (`NarrativeState`) es JSON-serializable directamente; puede guardarse en IndexedDB junto a `src/persistence/preferences.ts` o el futuro guardado de partida (`PORTABLE.md`).
5. **Garantizar rendimiento y verificación obligatoria:**
   - **Nunca** dejes luces dinámicas encendidas ni mallas de `CinematicStage` visibles al salir de una cinemática (`stage.visible = false`, intensidades en `0`).
   - Añade pruebas del nuevo capítulo en `tests/cinematics.test.ts` verificando continuidad de planos, diálogos no vacíos ni solapados, coordenadas finitas y banderas narrativas.
   - Ejecuta siempre: `npm run typecheck && npm test && npm run build && npm run check:portable && npm run check:itch`.
