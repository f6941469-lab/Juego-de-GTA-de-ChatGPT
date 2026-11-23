# Navegación y ciudad compartida · 0.5.0

## Peatones

`Navigation` deriva una rejilla de 0,6 m de los colliders transitables del distrito, con margen para cápsulas. Reutiliza los buffers y el heap de A*. Agrupa 40×40 celdas en zonas de 24 m: 48 zonas de rejilla. Las zonas conectan si su frontera tiene un par de celdas libres. Una BFS acotada elige un corredor con zonas adyacentes; A* busca primero dentro de él hasta 4096 visitas. Si hace falta, reintenta en toda la rejilla con las visitas restantes del máximo conjunto de 8192. La jerarquía es una aproximación; la rejilla fina conserva la autoridad.

`Session` abre `beginStep(walkers)` una vez por tick. Máximo dos peticiones de actores; una petición diferida conserva su ruta. Jugador y actores vivos aportan referencias de posición a la ocupación local. Una celda destino tiene un propietario por tick. Ante bloqueo, el actor con prioridad inferior intenta un punto lateral o de retroceso cercano. Lo alcanza mediante el controlador físico, sin warp. Rapier resuelve la colisión final.

`Feedback` envía el obstáculo cambiado además de los colliders vigentes. `rebuild(boxes, changed)` rasteriza solo ese rectángulo inflado y renueva los enlaces de las zonas afectadas y vecinas. Los actores comprueban su ruta al cambiar la revisión y conservan las que siguen libres. Arranque/reinicio admiten reconstrucción completa.

## Tráfico

`RoadNetwork` deriva 25 nodos y 80 carriles dirigidos de las avenidas/calles existentes. Dijkstra está acotado por esos 25 nodos; evita invertir inmediatamente el sentido. Los carriles tienen IDs estables, desplazamiento lateral de 2 m y extremos separados de la intersección. Las uniones Bézier conservan continuidad de posición y tangentes de entrada/salida.

Los tres vehículos existentes reciben destinos cambiantes. Reservan una intersección completa al aproximarse con señal verde y la liberan al terminar el cruce. La fase del semáforo y sus luces usan el mismo reloj. Las 300 lámparas son un único InstancedMesh; el color solo cambia con la fase. Los coches siguen usando barridos Rapier, cajas cinemáticas y el paso único de Session.

Las reservas de peatones no calculan cruces complejos más allá del paso y cesión por tick. En la red vial (`RoadNetwork`), además de los 3 coches civiles (`vehicle:traffic:0..2`), circulan el autobús (`vehicle:bus:0`) entre `4` paradas, el metro lanzadera (`vehicle:metro:0`) entre `Metro Sur` y `Metro Norte`, y `2` patrullas policiales (`police.ts`). Los coches civiles admiten conducción manual del jugador y robo con expulsión del conductor (`F`). El reinicio restaura carriles, destinos, patrullas, transporte y reservas.

## Residentes, vida civil y carga

`city-residents.ts` junto a `population.ts` aporta los `10` civiles base (`people`), los `8` comerciantes de los locales nuevos (`extraMerchants`) y los `3` ciudadanos con rutina (`Pedro`, `Valeria`, `Marcos`, `21` civiles en `allPeople`). Sus puntos se ajustan a celdas libres de las 48 zonas; esperan autobús y se desvían al metro si lo pierden. La cadencia cercana/intermedia/lejana y la cuota de `4` decisiones/tick siguen vigentes.

El estado y los cuerpos continúan a distancia; `DistrictGeometry` aplica visibilidad por sectores de `48 m` (`core`/`detail`), mientras los avatares atenúan y omiten animación distante (`> 42 m`). `Feedback` actualiza localmente `Navigation` al destruir cualquiera de los `18` escaparates o `9` props callejeros (`hydrant`/`crate`), y `police.ts` añade `barricades` en el operativo.

`tests/city-simulation.test.ts` y `tests/fases-3-8.test.ts` verifican cambios locales frente a reconstrucción, cuotas, cruce físico, rutas reales sobre colliders, 9 tiendas + bus/metro, rutina de Pedro + diálogo + acoso, robo/conducción, destrucción, patrullas y grabación POV multiángulo.
