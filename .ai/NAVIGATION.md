# Navegación y ciudad compartida · 0.5.0

## Peatones

`Navigation` deriva una rejilla de 0,6 m de los colliders transitables del distrito, con margen para cápsulas. Reutiliza los buffers y el heap de A*. Agrupa 40×40 celdas en zonas de 24 m: 48 zonas de rejilla. Las zonas conectan si su frontera tiene un par de celdas libres. Una BFS acotada elige un corredor con zonas adyacentes; A* busca primero dentro de él hasta 4096 visitas. Si hace falta, reintenta en toda la rejilla con las visitas restantes del máximo conjunto de 8192. La jerarquía es una aproximación; la rejilla fina conserva la autoridad.

`Session` abre `beginStep(walkers)` una vez por tick. Máximo dos peticiones de actores; una petición diferida conserva su ruta. Jugador y actores vivos aportan referencias de posición a la ocupación local. Una celda destino tiene un propietario por tick. Ante bloqueo, el actor con prioridad inferior intenta un punto lateral o de retroceso cercano. Lo alcanza mediante el controlador físico, sin warp. Rapier resuelve la colisión final.

`Feedback` envía el obstáculo cambiado además de los colliders vigentes. `rebuild(boxes, changed)` rasteriza solo ese rectángulo inflado y renueva los enlaces de las zonas afectadas y vecinas. Los actores comprueban su ruta al cambiar la revisión y conservan las que siguen libres. Arranque/reinicio admiten reconstrucción completa.

## Tráfico

`RoadNetwork` deriva 25 nodos y 80 carriles dirigidos de las avenidas/calles existentes. Dijkstra está acotado por esos 25 nodos; evita invertir inmediatamente el sentido. Los carriles tienen IDs estables, desplazamiento lateral de 2 m y extremos separados de la intersección. Las uniones Bézier conservan continuidad de posición y tangentes de entrada/salida.

Los tres vehículos existentes reciben destinos cambiantes. Reservan una intersección completa al aproximarse con señal verde y la liberan al terminar el cruce. La fase del semáforo y sus luces usan el mismo reloj. Las 300 lámparas son un único InstancedMesh; el color solo cambia con la fase. Los coches siguen usando barridos Rapier, cajas cinemáticas y el paso único de Session.

Las reservas no calculan todavía trayectorias simultáneas compatibles. No existen aparcamiento, transferencia de asientos, conducción del jugador ni respuestas avanzadas del conductor. El reinicio restaura carril, destino, poses y reservas; dispose libera recursos.

## Residentes y carga

`city-residents.ts` aporta seis perfiles y recorridos de barrio deterministas. Sus puntos se ajustan a una celda libre cercana; no aparecen nuevos NPC al cruzar zonas. Junto a Mara/Luz/Tomás/Sol hay diez civiles, con un máximo de cuatro decisiones por tick y cursor rotativo. La cadencia cercana/intermedia/lejana y la urgencia siguen modulando la frecuencia. La huida de un vecino usa destinos de su barrio.

El estado y los cuerpos continúan a distancia; el render atenúa personajes entre 64 y 80 m y los oculta a 84 m. No hay streaming físico ni simulación por horarios. Un aviso distante prolonga el plazo de aproximación policial según distancia, hasta 70 s, conservando la posición denunciada y las reglas de visión.

`tests/city-simulation.test.ts` verifica cambios locales frente a reconstrucción, cuotas, cruce físico entre peatones, red y curvas dentro de las calles, reservas, circulación por otras avenidas sobre colliders reales, continuidad/reset y denuncia de un disparo real lejos del mercado.
