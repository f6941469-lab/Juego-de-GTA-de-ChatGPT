# Tareas

## Primera entrega

- [x] Verificar la instalación limpia, los tipos, las ocho pruebas automatizadas y la compilación de producción.
- [x] Verificar desplazamiento, salto, pausa, cambios de iluminación y persistencia de calidad en Chromium. Cubrir carrera y colisiones con Vitest.
- [x] Revisar la vista al atardecer y de noche, el HUD a 390 × 844 y el desplazamiento táctil.

## Primera implementación del plan: HTML portable 0.3.1

Plan de ampliación solicitado por el usuario en [ROADMAP.md](ROADMAP.md).

- [x] Empaquetador con Vite existente que genere un único `jugar/index.html`, con modo de comprobación sin modificar archivos.
- [x] Integrar JS/CSS/fuentes/WASM/licencias y mantener identificador visible de versión 0.3.1.
- [ ] Verificar apertura real por doble clic y `file://` sin parámetros especiales, además de compras, arma, teléfono y controles con Internet desconectado.
- [x] Diseñar Guardar/Cargar mediante archivo para no depender del almacenamiento del origen local; contrato en [.ai/PORTABLE.md](.ai/PORTABLE.md), implementación tras los IDs de fase 2.
- [x] Base global de mundo/navegación/entidades en 0.4.0–0.5.0, con población acotada y tráfico por destinos.

El empaquetado ya está incorporado al proyecto y produce el archivo preparado en `jugar/`; no es solo el experimento temporal. La fase no se considera cerrada hasta comprobar la apertura local real. Los hitos de IA, tiendas, vehículos, destrucción, policía y replay y sus criterios de aceptación están en la hoja de ruta.

## Entrega 0.4.0 · Base global y WebGPU

- [x] IDs para personas, coches, ocupantes, asientos, tienda y cristales conectados a Session.
- [x] Estado por zonas con continuidad de identidad y daños, e historial con cuotas.
- [x] Navegación peatonal sobre el distrito y búsquedas acotadas por tick y por consulta.
- [x] Cadencia de decisiones por distancia y urgencia, manteniendo el paso físico compartido.
- [x] Renderizador WebGPU y compatibilidad WebGL 2 con shaders TSL y límites de resolución.
- [x] Completar navegación jerárquica y vial con destinos, reservas y cambios localizados (0.5.0).
- [x] Distribuir seis residentes adicionales en distintos barrios y comprobar incidentes lejos del mercado (0.5.0).
- [ ] Medir GPU física y consumo sostenido antes de fijar metas de FPS.

## Corrección de publicación 0.4.1

- [x] Generar `publicar/viceblock-itch.zip` con el HTML compilado como único archivo en la raíz.
- [x] Comprobar ZIP, CRC y reproducción del paquete con las herramientas existentes.
- [x] Verificar los flujos de escritorio y táctiles en un iframe de otro origen usando el ZIP real.

## Entrega 0.5.0 · Cierre funcional de fase 2

- [x] Jerarquía de 48 zonas, A* acotado y actualización del área de un obstáculo cambiado.
- [x] Reservas y cesión de paso entre actores con movimiento físico continuo.
- [x] Diez civiles con IDs estables, seis de ellos en otros barrios, con hasta cuatro decisiones por tick.
- [x] Red de 25 cruces y 80 carriles con destinos, giros continuos, reservas y luces en un solo lote.
- [x] Probar circulación sobre el distrito real y denuncia alejada sin conocimiento policial automático.
- [x] Probar continuidad de daños/identidad y restauración por reinicio.
- [x] Fase 3: ampliar actividades y objetos e incorporar conversación contextual en español.

## Fases 3–8 y optimización implementadas

- [x] Optimización gráfica/espacial: sectores `48 m` (`core`/`detail`), vegetación reducida, `sharedBoxGeometry`, desaceleración distante y `PointLight` único agrupado.
- [x] NPC activos desde el inicio (`21` civiles con `Pedro`), objetivos, objetos de actividad (`coffee`, `bag`, `phone`, `briefcase`), diálogo contextual en español (`E`), acoso persistente (`stalkStage`) y eventos NPC-vs-NPC.
- [x] Conducción, robo de coches (`F`) con expulsión física del conductor, autobús circular (`4` paradas) y metro lanzadera (`Metro Sur` / `Metro Norte`).
- [x] Nueve locales funcionales con interior y comerciantes propios (`Mercado Palma` y `8` tiendas nuevas), consumo de comida/bebida, protección (`armor`) y respuesta a disparos en la calle.
- [x] Destrucción conectada en `18` escaparates y `9` props callejeros (`hydrant`/`crate`), más `2` patrullas policiales en `RoadNetwork` con desembarco, fuego recíproco y barricadas.
- [x] Grabación POV de testigos y `streetCams` multiángulo con segmentos progresivos (clips `partial` sobreviven al testigo), `Palma Social` ampliado y visor 3D aislado sin mutar el presente.

## Pendiente · Fase 9 y validación física

- [ ] Implementar Guardar/Cargar partida por archivo JSON descargable ([.ai/PORTABLE.md](.ai/PORTABLE.md)).
- [ ] Medir `WebGPU`, GPU física, temperatura, sesiones prolongadas y mezcla de audio en hardware real (PC y móvil).
- [ ] Evaluar LLM local opcional solo si supera pruebas reales de español, RAM y frame time en hardware físico (la conversación base ya funciona sin modelo ni red).
