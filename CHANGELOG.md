# Historial de cambios

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
