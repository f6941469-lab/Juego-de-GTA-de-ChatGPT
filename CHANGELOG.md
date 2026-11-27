# Historial de cambios

## 0.5.0 · Expansión multi-distrito, puentes, montañas y 5 edificios funcionales (2026-11-27)

- **Mapa ampliado con múltiples distritos y puntos de interés:** Conserva el centro original (**Costa Palmera Centro**) y expande el mundo a `332×352 m` con **Isla Fortuna**, **Distrito Cívico y Penal**, **Sierra Palmera** (cordillera montañosa hasta `44 m` y miradores panorámicos) y **Colinas del Sur**, optimizado con lotes `InstancedMesh` y culling espacial de `64 m` + minimapa actualizado con islas, puentes, montañas e iconos por categoría.
- **Puentes y subidas/bajadas reales:** Dos puentes sobre la bahía (**Puente Fortuna** y **Puente Mirador**) y carreteras con pendientes físicas hacia **Mirador Sierra** (`4,2 m`) y **Alto Mirador** (`7,8 m`), transitables tanto a pie como conduciendo vehículos.
- **Cinco edificios funcionales interactivos (`E`):** **Cárcel de Palma** (arresto real en celda, cumplir condena, fianza o fuga con alerta `3★`), **Comisaría Central** (pagar multas/limpiar estrellas, entrega voluntaria y boletín), **Casino Royale Palma** (ruleta y dados 21 con apuestas reales), **Restaurante El Mirador** (menús con salud y protección) y **Casa del Mirador** (villa comprable por `$350` para descansar `+6 h`, bajar perfil y fijar punto de aparición).

## 0.5.0 · Comportamiento procedural de NPCs con memoria episódica y rumores (2026-11-27)

- **Mente procedural (*Utility AI* en `npc-mind.ts`):** Cada vecino decide sus metas dinámicamente según sus impulsos (`hunger`, `energy`, `social`, `errands`, `safety`), rasgos personales, hora del día y cautela por zonas.
- **Memoria episódica, reputación y rumores:** Los NPCs recuerdan delitos, amenazas, acosos, compras y charlas pasadas, evitan zonas donde presenciaron incidentes, recuerdan si el jugador fue amable o peligroso al hablar con `E` y propagan rumores entre sí al encontrarse en la calle.

## 0.5.0 · Mejora gráfica PBR, comportamiento NPC y policía de 5 estrellas (2026-11-23)

- **Gráficos mejorados sin perder fluidez:** Texturas procedurales con relieve (`bumpMap`) en edificios de estuco, aceras con baldosas y asfalto, cristal reflectivo, pintura automotriz brillante, sonda celeste `256×128`, cielo y agua TSL con mejor luz dorada/Fresnel y niebla más nítida.
- **Comportamiento avanzado de los NPCs:** Rutinas según la hora del día (mañana, tarde y noche), esquiva activa de vehículos rápidos en trayectoria de colisión, reacciones realistas ante persecuciones policiales (`>= 2★`) y armas cercanas, mirada social natural y diálogos ampliados.
- **Sistema policial de 5 estrellas (`1★–5★`):** Escalado táctico completo con patrullas estroboscópicas, barricadas, refuerzos SWAT (`3★+`), helicóptero policial 3D con foco de búsqueda (`4★–5★`), barra de evasión, HUD de 5 estrellas animadas y radar policial en el minimapa.

## 0.5.0 · Cinemática de apertura y cimientos narrativos (2026-11-23)

- **Prólogo in-engine *«Un Coche, Dos Ladrones»*:** Al iniciar partida se reproduce una cinemática de `71 s` con `17` planos de cámara, iluminación de estudio de 3 puntos, luces policiales estroboscópicas, audio procedural, subtítulos codificados por hablante, animaciones detalladas (`Leo`, `Valeria`, `Agente Morales`), vehículos con puertas articuladas, montaje de 3 aventuras (*Paseo del Mar*, *Club Neón*, *Mercado Palma*) y transición fluida a la cámara del mundo abierto. Puede saltarse con `Espacio`/`Esc` y repetirse desde el menú de Pausa.
- **Guía narrativa para IAs ([STORY_AND_CINEMATICS.md](STORY_AND_CINEMATICS.md)):** Documentación completa del guion, biblia de personajes, motor `src/cinematics/`, coordenadas verificadas de rodaje y receta paso a paso para construir futuros capítulos.

## 0.5.0 · Fases 3–8 y optimización contra tirones (2026-11-23)

- **Optimización del distrito, avatares y vehículos:** Lotes `core` unificados globalmente, sectores `detail` de `64 m`, simplificación de micro-parteluces en pisos altos, cada avatar y cada vehículo/patrulla consolidado en `1` único `InstancedMesh` con material compartido opaco (evitando recompilaciones de shader a mitad de partida), salto de `computeColliderMovement` en actores estáticos/embarcados, caché de `prompt`/`allActors` y `PointLight` único agrupado (**`77` llamadas y `207.945` triángulos** en `F3` Baja frente a `328` llamadas y `338.093` triángulos).
- **9 tiendas reales y transporte público:** Reemplazadas cajas cerradas por `9` locales transitables (`Mercado Palma`, `Dulcería Sol`, `Panadería Brisa`, `Cafetería Mar`, `Restaurante Bahía`, `Farmacia Verde`, `Ropa Palmera`, `Armería Norte`, `Minimercado Sur`), `4` paradas de autobús y `2` estaciones de metro (`Metro Sur`, `Metro Norte`).
- **Vida civil autónoma en toda la ciudad y limpieza legacy:** Todos los civiles móviles alternan autónomamente entre compras reales en las 9 tiendas, autobús, desvío al metro si pierden el bus, lugares de trabajo/ocio (`Jardín Coral`, `Paseo del Mar`, `Torre Alba`, `Hotel Miramar`, `Club Neón`), conversación en español (`E`), acoso persistente y eventos callejeros, eliminando bucles fijos y código obsoleto (`products`/`Item`, `dynamicActors` duplicado, getters duplicados).
- **Corrección de bugs en vehículos, metro y policía:** Suspensión real (`actor.setSuspended`) para pasajeros en bus/metro y agentes en patrulla, interpolación suave en el metro sin hundir la cámara bajo el mapa, recuperación de coches abandonados, eliminación del doble paso en conductores expulsados y acumulador real de vistas/likes en `Palma Social`.
- **Grabación POV y replay:** Testigos y cámaras urbanas graban segmentos progresivos con muestreo perezoso (`getSnapshots`) reproducibles en un visor 3D aislado.

## 0.5.0 · Ciudad compartida y rutas por barrios

- Seis vecinos adicionales, diez civiles en total, con recorridos y reacciones a incidentes en otros barrios.
- Navegación peatonal jerárquica, cambios locales al romper un cristal y cesión de paso entre actores.
- Los tres coches recorren una red de 25 cruces y 80 carriles con destinos, giros continuos, semáforos y reservas.
- Cuotas de cuatro decisiones civiles y dos búsquedas por tick. Personajes distantes se atenúan y ocultan conservando su estado; luces de tráfico en un lote.
- Un aviso lejano amplía el tiempo policial de aproximación conservando el lugar denunciado.
- HTML y ZIP de itch.io regenerados como 0.5.0. La siguiente fase ampliará actividades y conversación contextual.

## 0.4.1 · Paquete para itch.io

- ZIP listo para cargar en `publicar/viceblock-itch.zip`, con `index.html` compilado en la raíz y todos los recursos integrados.
- Comandos `build:itch` y `check:itch`, y comprobación de vigencia del ZIP en CI.
- Prueba reutilizada dentro de un iframe sandbox de otro origen, sirviendo el contenido del ZIP bajo una ruta anidada.
- README con el archivo de descarga y los ajustes para un proyecto HTML en itch.io.
- Enfoque inicial adaptado a iframes de otro origen para evitar el autofocus bloqueado al cargar la portada.

## 0.4.0 · Navegación global y base WebGPU

- Navegación peatonal sobre el mapa transitable, con buffers reutilizados, cola de prioridad y cuotas de búsquedas por tick.
- Registro de personas, coches, ocupantes, asientos, mercado y cristales mediante IDs estables y estado por zonas. Historial de poses y daños con límites.
- Decisiones civiles escalonadas por distancia y urgencia, manteniendo el movimiento físico compartido.
- WebGPURenderer con compatibilidad WebGL 2, cielo y agua en TSL, y presupuestos de píxeles y sombras por perfil.
- F3 muestra backend, resolución y contadores de entidades, historial y rutas. La fase 2 continúa con navegación jerárquica/vial y actividades de otras zonas.
- El adaptador WebGPU de software del entorno falla también con un triángulo independiente. La aceptación de WebGPU y el perfilado físico siguen pendientes.

## 0.3.1 · Primera entrega portable

- Acceso al juego desde el index raíz al abrirse localmente y enlace de descarga ZIP en README.

- Un único archivo jugable en `jugar/index.html`, con JavaScript, estilos, fuentes, física WASM y licencias integrados; marca visible **SIN CONEXIÓN**.
- Generación reproducible con Vite existente, comprobación de vigencia y artefacto de CI; sin dependencias nuevas ni cambios de gameplay.
- Prueba gráfica del contenido integrado con red desactivada, incluyendo compras, arma, teléfono, audio y controles táctiles. Apertura directa file:// pendiente: bloqueada por política del Chromium administrado del entorno.
- Plan ampliado con conversaciones, nueve tiendas, robo de coches, grabaciones POV y contratos para historia futura; estas ampliaciones aún no están implementadas.

## 0.3.0 · Mercado Palma — sustitución del sistema anterior

- Sustitución completa autorizada del runtime anterior por la entrega visual de `5660edc`, sin reescribir el historial de Git.
- Marca de versión visible en portada para identificar la compilación.
- Primera escena integrada con tienda abierta, compras/inventario, pistola y cristal destructible.
- Rutinas/percepción de civiles, avisos y búsqueda policial a pie con última ubicación conocida.
- Tráfico local con curvas, frenado por barridos y semáforos compartidos.
- Teléfono con controles propios, mochila y testimonios reales sin videos de sustitución.
- Paso físico compartido, corrección de botones simultáneos del ratón, pausa al perder foco, avatar agrupado por articulación y audio sintetizado acotado.
- Auditoría y memoria técnica en `.ai/`; pruebas de integración, estado y entradas.

## 0.1.0 · Costa Palmera

- Base modular para desarrollo con Vite, TypeScript, Three.js, Rapier y Vitest.
- Primer distrito tropical con construcciones variadas, calles señalizadas y vegetación procedural.
- Personaje cúbico en tercera persona con carrera, salto y colisiones.
- Luz solar dinámica, ciclo de 18 minutos, sombras, cielo procedural y agua animada.
- Interfaz en español con minimapa, pausa, perfiles gráficos guardados localmente e indicadores de depuración.
