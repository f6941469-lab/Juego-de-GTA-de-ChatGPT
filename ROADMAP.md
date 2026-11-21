# Plan de implementación — ciudad viva y entrega en un solo HTML

Base de gameplay: Mercado Palma 0.3.0, commit `038456a`. La primera implementación, 0.3.1, incorpora el empaquetador y el entregable `jugar/index.html`; la apertura directa file:// sigue pendiente por política del navegador del entorno. La entrega 0.4.0 inicia la fase 2 con IDs, registro por zonas, historial acotado y navegación peatonal global, además del renderizador WebGPU solicitado. La entrega 0.5.0 completa la base funcional de la fase 2 con navegación jerárquica, cambios locales, residentes alejados y red vial con destinos y reservas. Las fases posteriores siguen planificadas. Se conserva la presentación elegida por el usuario y se amplía el runtime de `src/simulation/session.ts`.

## Resultado que se entregará al jugador

Un `index.html` autocontenido que se abre con doble clic, funciona sin conexión y no requiere instalar Node, ejecutar npm ni mantener un servidor. JavaScript, CSS, fuentes, física WASM y licencias se integran en el archivo. El repositorio conserva código TypeScript modular; la compilación se hace al preparar cada entrega. La descarga jugable contendrá únicamente el HTML preparado y una marca visible de versión.

El objetivo es que todo el mapa actual comparta NPC, comercios, vehículos, incidentes, destrucción y respuesta policial. Los edificios que funcionen como tiendas tendrán interiores y entradas reales. Ampliar el mapa en el futuro reutilizará estas mismas reglas; no se restaurará automáticamente el sistema anterior descartado por el usuario.

## Punto de partida comprobado · base 0.3.0

- Hay una tienda comercial y asaltable, una pistola, cuatro civiles, tres coches en un circuito y dos policías a pie.
- La navegación usa una rejilla local alrededor del mercado (`navigation.ts`); no cubre toda la ciudad. Comercios y población contienen posiciones y personajes fijados para esa escena.
- La policía no conduce ni dispara; las publicaciones no tienen replay. Se rompen dos cristales. No existe guardado de partida.
- La compilación web Vite produce varios archivos y módulos; desde 0.3.1 también genera `jugar/index.html`, distinto del index de desarrollo, con recursos integrados. Contrato y comprobación: [.ai/PORTABLE.md](.ai/PORTABLE.md).
- Una prueba temporal con las herramientas ya instaladas empaquetó la versión actual en 2.953.784 bytes de HTML. En Chromium 156, el contenido HTML integrado inició WebGL/Rapier, permitió movimiento y teléfono con la red deshabilitada, sin solicitudes HTTP(S) ni excepciones.
- El navegador administrado del entorno bloquea navegar a `file://` (`ERR_BLOCKED_BY_ADMINISTRATOR`). La prueba anterior usó contenido HTML inline en una página vacía: no acredita doble clic en archivo local. La aceptación de la fase 1 exige probar `file://` en un navegador que permita archivos locales. No se deshabilitarán políticas ni se exigirán parámetros inseguros al jugador.

## Orden de ejecución y aceptación

| Fase | Entrega | Criterio para cerrarla |
| --- | --- | --- |
| 1. Entrega portable | Empaquetador reproducible de un solo HTML, versión visible y descarga jugable. | Copiar solo el HTML a otra carpeta, desconectar Internet y abrir por doble clic. Funcionan escena, movimiento, compras, arma, teléfono y audio tras interacción. Sin recursos HTTP, CDN, módulos relativos o fetch de WASM. |
| 2. Simulación de todo el mapa | Entidades identificadas, definiciones de zonas/tiendas, eventos compartidos, navegación peatonal/vial y estado persistente por zona. | Un incidente funciona junto a Mercado Palma y en zonas alejadas usando el mismo código. Atravesar límites no duplica ni reinicia entidades o daños. |
| 3. Vida civil | Rutinas, destinos, horarios, necesidades, personalidad, percepción, memoria, decisiones e interrupciones recuperables; conversación contextual. | Desde el inicio hay NPC con destinos y objetos acordes con su actividad. El jugador puede detenerse a hablar con ellos; compran, esperan y reaccionan a lo percibido. No conocen sucesos que no hayan observado o recibido. |
| 4. Vehículos y ocupantes | Red vial, cruces, distancias de seguridad, destinos, aparcamiento, conductores/pasajeros y contrato compartido para IA/jugador/policía; robo de coches. | Un NPC aparca, compra y regresa al mismo coche; el jugador puede sustraer uno vacío o expulsar a su conductor mediante una transición válida. No se duplican ocupantes; testigos y conductor reaccionan según percepción. |
| 5. Nueve tiendas, armas y asaltos | Generalizar catálogo, caja, stock, inventario, comerciantes/clientes, consumo, amenaza reconocible, balística y daño. | Nueve locales reales, contando Mercado Palma, permiten comprar a jugador y NPC. Comida consumible. Disparar fuera de una tienda también activa daño, testigos y avisos; el asalto no es un requisito para estos sistemas. |
| 6. Destrucción conectada | Materiales, resistencia, cristales, señales, mobiliario, objetos móviles y daños de vehículos; después paredes por piezas. | Cada rotura modifica aspecto, collider, navegación y estado de zona; NPC y tráfico evitan obstáculos. Las partículas no sustituyen la eliminación física. |
| 7. Respuesta policial | Despacho de incidentes, radio, patrullas, asientos, persecución, búsqueda, detención, combate y barricadas. | Una patrulla recibe un aviso, conduce, se detiene, los agentes descienden, actúan y pueden volver al coche. La búsqueda y los cortes usan información observada/recibida, sin seguimiento omnisciente. |
| 8. Grabaciones y teléfono | Cámara de testigo, capturas de estado/eventos, publicación y reproducción aislada dentro del móvil. | ↑ abre el móvil, flechas navegan y Enter reproduce el hecho desde el POV del testigo. Si muere grabando, se conserva el tramo capturado y enviado, incluida la caída de cámara; el replay no modifica el presente. |
| 9. Cierre de integración | Guardado/carga, presupuestos de simulación, pruebas prolongadas, audio, animación y mediciones de hardware. | Cadena completa de compra/asaltos/testigos/tráfico/policía/destrucción/replay en varias zonas; recursos acotados y perfilado real. Cada fase incorpora estas verificaciones antes de este cierre. |

La grabación necesita que el historial de estados/eventos se diseñe en la fase 2. Su almacenamiento básico se introduce entonces, aunque la reproducción se entregue en la fase 8. Los bloqueos y cambios de materiales también deben formar parte de los contratos iniciales del mundo.

## Aceptación de la base global · 0.5.0

- IDs y estado de sesión compartidos entre las zonas, sin recrear personas, ocupantes, coches o cristales al cambiar el foco.
- Rejilla jerárquica peatonal, cambios locales y reservas de paso. Red vial derivada del trazado completo: 25 cruces y 80 carriles dirigidos, con destinos y reservas.
- Diez civiles, incluidos seis residentes fuera del bloque inicial. Un disparo real lejos del mercado genera percepción, aviso y última posición conocida mediante el mismo código que los incidentes cercanos.
- Cuotas de cuatro decisiones civiles y dos rutas por tick; continuidad física y ocultación visual distante. Los cuerpos siguen residentes: no se presenta streaming físico ni simulación lejana por horarios como implementados.

La aceptación funcional de fase 2 está cubierta por `tests/city-simulation.test.ts` junto a las suites de gameplay existentes. La fase 3 sigue con objetivos, objetos y conversaciones. Las reservas de puertas/colas de comercio, transferencias de asientos, aparcamiento y patrullas corresponden a sus fases posteriores. La apertura file:// de fase 1 y la aceptación WebGPU en hardware utilizable continúan pendientes por los límites documentados del entorno.

## Decisiones para ampliar lo existente

### Un único mundo con estado compartido

Session mantiene la coordinación, no absorbe toda la IA. Actor, economía, armas y física se conservan y evolucionan mediante interfaces pequeñas. Se incorporan módulos de mundo/entidades, navegación vial, comportamiento civil, vehículos, despacho policial, daños y replay conforme haya una responsabilidad verificable.

- ID estable para cada persona, vehículo, asiento, tienda y objeto dañable.
- Definiciones de tiendas con puertas, mostrador, caja, estantes y puntos de actividad; eliminar el acoplamiento a un único `shop`/cajero.
- Un bus de incidentes locales con posición, tiempo, fuente, testigo y calidad de identificación. Los consumidores reciben la evidencia que les corresponde.
- Navegación jerárquica por zonas y conexiones. Evitación cercana y reservas de pasos/puertas/asientos; actualización localizada cuando cambie la geometría.
- Simulación cercana completa, intermedia simplificada y lejana por objetivos/horarios. El estado continúa; los detalles gráficos/físicos se activan según proximidad. La lógica reducida no puede reaparecer personas o coches a la vista saltándose su recorrido.
- La física sigue avanzando una sola vez por tick. El render interpola; ningún subsistema adelanta el mundo por su cuenta.

### NPC y vehículos con vida propia

La inteligencia será local: percepción, memoria y selección de acciones según objetivos. No dependerá de servicios de IA por Internet.

Cada civil tendrá identidad, ocupación, destino, horario, tolerancia al riesgo y recuerdos limitados. Las decisiones consideran si vio el arma, oyó un disparo, tiene salida/cobertura, está herido, lleva pasajeros o tiene cerca a la policía. Reacciones posibles: observar, retroceder, paralizarse, huir, esconderse, avisar o grabar. Incluyen demora, duración y retorno a actividades; las variaciones serán comprensibles, no cambios aleatorios continuos.

Desde el primer momento jugable se distribuyen civiles en actividades ya iniciadas: ir al trabajo, buscar comida, comprar, pasear, esperar o regresar a su vehículo. Cada uno tiene un objetivo y puede llevar un objeto coherente con su actividad, como bolsa, bebida o teléfono. Animaciones y objetos cambian con la acción; no todos caminan por el mismo circuito.

Al acercarse e interactuar, un NPC disponible se detiene de forma segura, orienta la mirada y responde con texto en español. Los temas iniciales serán saludo, destino, barrio, comercios y sucesos conocidos. Las respuestas consideran ocupación, prisa, miedo, relación y memoria; un testigo puede recordar al jugador. No todos aceptan conversar y una emergencia interrumpe la charla. El diálogo no ocupa un cruce ni bloquea una puerta indefinidamente. Voz sintetizada queda como mejora posterior: las voces instaladas y su disponibilidad sin conexión varían por dispositivo.

Los conductores siguen rutas a destinos, ceden paso, frenan, aparcan y reaccionan a incidentes/accidentes. Personas y coches comparten ocupación real de asientos. Entrar/salir reserva un espacio libre, reproduce una transición y transfiere el control sin duplicar o teletransportar entidades. Ese contrato también sirve al jugador y a las patrullas.

El robo distingue vehículos vacíos y ocupados, propietario, puerta accesible y asientos. Un conductor expulsado puede huir, protestar, pedir ayuda o intentar recuperar el coche según peligro y personalidad. Testigos pueden filmar o avisar; robar un coche sin ser visto no genera conocimiento policial automático. Colisiones, disparos al azar, amenazas y robo usan la misma canalización de incidentes que un asalto comercial.

### Viabilidad de un modelo de lenguaje local en móvil

Decisión propuesta: conversaciones contextuales ligeras como base obligatoria; LLM local opcional para redactar respuestas breves en equipos que superen una prueba real. La simulación de objetivos, tráfico, combate, policía y economía no depende del modelo. Un LLM por NPC ni una consulta por tick serían incompatibles con el presupuesto del juego.

La documentación oficial de [WebLLM](https://webllm.mlc.ai/docs/user/get_started.html) permite inferencia en navegador y exige WebGPU compatible. La disponibilidad efectiva depende de navegador, sistema y GPU; un móvil con WebGL 2 no garantiza WebGPU utilizable. También hay que validar el modo de apertura local del HTML. Un worker evita trabajo de JavaScript en la interfaz, pero no elimina la competencia de memoria/GPU con Three.js. Una alternativa WASM/CPU se evaluaría aparte; no constituye una garantía de fluidez móvil.

Como referencias de tamaño, [SmolLM2](https://huggingface.co/HuggingFaceTB/SmolLM2-135M-Instruct) ofrece modelos de 135M/360M parámetros orientados principalmente al inglés, por lo que su calidad de diálogo en español requiere comprobarse. [Qwen2.5-0.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct) declara español entre sus idiomas y 0,49 mil millones de parámetros: es un candidato a comparar, no una dependencia elegida. A 4 bits, 490 millones de parámetros representan aproximadamente 245 MB solo de pesos teóricos; formato real, escalas, tokenizer, contexto, buffers y runtime añaden memoria. Integrar esos bytes en base64 aumenta su tamaño alrededor de un tercio. No equivale al tamaño final ni a una medición de RAM.

Por eso no se incorporará por defecto un modelo grande al HTML ligero. Si la variante con LLM supera las pruebas, sus pesos, tokenizer y runtime también se integrarían en su HTML para mantener la entrega de un solo archivo y sin conexión, con tamaño claramente indicado. La descarga automática de un modelo o una API remota no satisfacen ese requisito. Licencia y dependencias se revisarían antes de incorporar un candidato.

Se usará como máximo un modelo compartido, contexto corto con hechos del personaje, generación asíncrona, respuestas acotadas, caché y cancelación al surgir peligro. El modelo solo propone texto: no cambia dinero, salud, inventario, conocimiento o misiones. Una respuesta tardía, inválida o incoherente usa diálogo preparado; la conversación básica sigue funcionando con el modelo desactivado.

Criterio para decidir su incorporación: medir español y coherencia factual, carga inicial, tiempo hasta primera respuesta, RAM, tiempos de frame y comportamiento térmico durante una sesión sostenida con el juego activo, en móviles físicos identificados. Debe funcionar con red desconectada y degradar a las respuestas preparadas sin bloquear. Esta revisión es documental; no se ha ejecutado ni medido un LLM en un teléfono.

### Comercio y asalto como interacción continua

Se construirán nueve tiendas funcionales en total, incluida Mercado Palma con Mara; no se presume que existan nueve interiores en el runtime actual. Propuesta de variedad: Mercado Palma, dulcería, panadería, cafetería, restaurante, farmacia, ropa, armería y minimercado. Se aprovecharán fachadas y parcelas de la ciudad elegida con puertas, interiores y colisiones coherentes, preservando su identidad visual. Las tiendas intentadas en la versión anterior no cuentan como entregadas.

Todas comparten el contrato comercial, con catálogos y presentación propios. Jugador y NPC usan las mismas validaciones: llegar, entrar, elegir producto, reservar turno, pagar, recibirlo y salir. Un cliente lleva presupuesto, objetivo de compra y producto adquirido; el comercio actualiza caja y existencias. Un NPC sin dinero o ante una cola interrumpida puede desistir sin duplicar cobros o productos. El consumo de comida/bebida se diferencia de comprar: descuenta una unidad y aplica su efecto definido con límites, sin curación repetida por frame. No hace falta añadir una barra de hambre para permitir comer.

Secuencia válida en cualquier tienda:

1. Entrada normal y clientes/comerciante realizando actividades.
2. Compra de golosinas, comida u otros productos; validar precio, dinero, stock y entrega.
3. Arma visible: reacciones solo de quienes la ven. Mostrarla no concede conocimiento automático a la policía.
4. Mira sobre el comerciante y amenaza sostenida: reconocimiento del asalto.
5. El comerciante puede cooperar, ganar tiempo, activar una alarma o intentar escapar según su situación. Se comunican las señales antes de consecuencias importantes.
6. Clientes interrumpen su actividad y eligen salidas/cobertura/llamada/grabación disponibles.
7. Caja e inventario cambian una sola vez por transacción; el dinero no se duplica al interrumpir o repetir el asalto.
8. La escena sigue simulándose: huida, lesiones, tráfico, avisos e intervención policial comparten los eventos.

Se amplía la pistola actual con poses/transiciones, retroceso, recarga, munición, sonido, impactos y daño. Un disparo debe seguir un trayecto físico y afectar al primer objetivo válido; ningún agente puede disparar a través de una pared por conocer un ID.

### Policía con información y coordinación reales

Separar central de incidentes, asignación de unidades, conducción, estado de agentes y conocimiento del sospechoso. Registrar ubicación denunciada, última observación y descripción/confianza por separado de la posición real del jugador.

Las unidades intercambian mensajes con información y demora; coordinan rutas, aparcamiento y aproximación. Responden en patrulla, descienden, advierten/buscan/persiguen, usan cobertura y disparan con percepción y balística. Pueden reagruparse y volver al coche; hay límites de refuerzos.

Las barricadas se eligen sobre rutas e intersecciones alcanzables usando la dirección/posición conocida del incidente. Su colocación incorpora agentes/vehículos u objetos físicos, reservas de carril, colisiones y cambios de tráfico. No aparecen encima del jugador ni bloquean todas las salidas por conocer su ubicación oculta. Se retiran al finalizar o cancelar el operativo.

### Destrucción con consecuencias

Primero extender a todas las zonas vidrio, señales, mobiliario y elementos de vehículos. Después añadir superficies ligeras y paredes por piezas; la destrucción estructural compleja tiene una etapa propia, sujeta a presupuesto medido.

Cada material define resistencia y respuesta. Un daño persistente modifica malla, collider, rutas y guardado. Los restos físicos tienen límites y pasan a una representación simplificada al estabilizarse. Las explosiones/accidentes no pueden generar fragmentos, cuerpos, eventos o sonidos ilimitados. NPC, tráfico y policía consideran los nuevos obstáculos y vías abiertas.

### Grabaciones del hecho ocurrido

Primera implementación: replay renderizado, sin exigir codificar MP4. Registrar el intervalo real de la cámara del testigo, sus actores relevantes, poses, eventos, daños y cambios del escenario. Combinar fotogramas clave y deltas/interpolación; usar el reloj de simulación y una instantánea suficiente de la zona al inicio.

Un clip tendrá autor, momento, lugar, miniatura y estado real de disponibilidad. El testigo necesita estar en condiciones de observar/grabar. Si no existe información suficiente, se indica la limitación y no se reemplaza por un video genérico.

Se registra desde la cámara del teléfono del NPC, con encuadre y oclusión reales, no desde la cámara del jugador. El dispositivo y la captura tienen estado propio. La publicación puede usar subida automática progresiva o una transmisión simulada: la red social del juego es local y no necesita Internet. Los segmentos enviados permanecen disponibles aunque el autor muera. El impacto, interrupción y caída del teléfono se incluyen si fueron capturados; el clip termina al dejar de registrar. Si el dispositivo resulta destruido antes de enviar un segmento, no se inventan esos fotogramas ni se atribuye una publicación posterior al NPC muerto.

La información histórica conserva actores, poses y daños relevantes aunque la entidad original ya no exista. Reproducir la muerte del testigo no lo revive, ni vuelve a infligir daño, ni usa su posición actual. La interfaz indica si un clip es parcial o quedó interrumpido.

El reproductor usa entidades y estado aislados, sin emitir de nuevo denuncias, daño o dinero al mundo vivo. Limitar duración, número de clips y memoria total con cuotas configurables y eliminación de los más antiguos. Las miniaturas y replays no deben bloquear el frame del juego. La exportación a formatos de video queda como opción posterior, independiente de esta función del teléfono.

### Bloque reservado para historia y cinemáticas futuras

La historia y las cinemáticas se implementarán después, como pidió el usuario. Este bloque identifica los puntos de extensión para evitar rehacer la arquitectura; no añade ahora una campaña, un guion o módulos vacíos al runtime.

- IDs estables de personajes —incluida Mara—, locales, vehículos y zonas; referencias por ID y no por índices o nombres de malla.
- Eventos con instante, participantes y resultado que una misión futura pueda observar sin controlar la IA desde la UI. La futura narrativa dispondrá de su propio estado versionado.
- Un futuro director de escenas podrá reservar temporalmente un actor, una ruta o una zona y devolverlos a sus rutinas. No necesitará duplicar personajes ni congelar toda la ciudad.
- Cesión y devolución explícita de cámara/controles, compatible con pausa y reproductor. Finalización, omisión o interrupción liberarán la reserva y restaurarán el control.
- No se borra ni sustituye la arquitectura de las tiendas para dejar hueco a una futura escena. Al incorporar cada contrato se marcará su punto de extensión para narrativa, sin implementar todavía su director.

## Entrega portable y partidas

El empaquetador producirá un HTML con script integrado sin importaciones externas, estilos/fuentes integrados y Rapier inicializado desde bytes embebidos. No habrá CDN, módulos relativos, solicitudes de texturas, fetch de WASM ni necesidad de Service Worker. Mantener licencias dentro del entregable.

Las partidas usarán un formato versionado: semilla, reloj, jugador, dinero/inventario, daños de zonas e incidentes/entidades persistentes. Ofrecer Guardar/Cargar mediante archivo local porque el almacenamiento automático bajo `file://` depende del navegador. Puede existir una preferencia local oportunista, pero su fallo no impedirá jugar o recuperar una partida exportada.

Plataforma de aceptación inicial propuesta: PC con Chrome/Edge y WebGL 2. Verificar permiso de audio tras clic, captura/fallback del ratón, teclado, pausa y guardado. Otros navegadores y móviles se comprobarán de forma explícita antes de anunciarlos como soportados en apertura de archivo local.

## Verificación continua y criterio global

- Mantener las pruebas vigentes y añadir casos de transacciones, percepción/oclusión, navegación, asientos, denuncias, disparos, destrucción y replay según la fase.
- Tipos, pruebas y compilación más prueba gráfica de cada sistema modificado. Comprobar el HTML distribuido, no solo el servidor de desarrollo.
- Repetir el escenario en varias tiendas y puntos alejados del mapa, de día/noche y tras guardar/cargar. Comprar sin delito debe seguir siendo posible.
- Probar incidentes simultáneos, puertas y cruces obstruidos, baja munición, ausencia de testigos, pérdida de contacto policial, evacuación y limpieza de recursos.
- Verificar conversación normal y su interrupción, compra real de NPC en cada uno de los nueve locales, consumo de una unidad y robo de coche ocupado/vacío. Repetir la respuesta a disparos en la calle sin haber iniciado ningún asalto.
- Grabar un incidente, incapacitar al testigo durante la captura, alejarse o retirar su entidad y reproducir el tramo efectivamente enviado desde su POV. Probar también teléfono destruido antes del envío, clip parcial, límite de memoria y repetición sin efectos sobre el presente.
- Registrar CPU/GPU, entidades activas, llamadas de dibujo y memoria en hardware/viewport/perfil identificados. Establecer capacidades de población y cuotas de grabación con esas mediciones; no prometer 60 FPS por compilar o por una prueba en software.
- Verificar una sesión prolongada con varios ciclos de incidentes: sin acumulación de cuerpos, fragmentos, publicaciones o audio.
- Capturas de cada entrega deben provenir de su artefacto y versión publicados. Mantener la identidad visual y no mezclar de nuevo los dos runtimes.

El cierre funcional es una cadena completa: entrar normalmente a una tienda, comprar, decidir amenazar al comerciante, provocar reacciones civiles, recibir una denuncia/grabación, huir entre tráfico y obstáculos destruidos, afrontar patrullas y agentes coordinados, perder contacto y reproducir después el hecho real desde el teléfono. Debe funcionar como conjunto de reglas reutilizadas en todo el mapa.
