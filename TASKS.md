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
- [ ] Después, ampliar mundo/navegación/entidades a todo el mapa antes de aumentar población y vehículos.

El empaquetado ya está incorporado al proyecto y produce el archivo preparado en `jugar/`; no es solo el experimento temporal. La fase no se considera cerrada hasta comprobar la apertura local real. Los hitos de IA, tiendas, vehículos, destrucción, policía y replay y sus criterios de aceptación están en la hoja de ruta.

## Requisitos incorporados al plan, todavía pendientes

- [ ] NPC activos desde el inicio, con objetivos, objetos de actividad, diálogo contextual en español, memoria e interrupciones por peligro.
- [ ] Robo de coches vacíos/ocupados; conductor, pasajeros y testigos coherentes con el mismo sistema de incidentes que los disparos en la calle.
- [ ] Nueve locales funcionales en total, incluido Mercado Palma; compra de jugador y NPC, turnos, presupuesto, stock y consumo de comida.
- [ ] POV real de testigos, captura/envío interrumpibles y clips parciales que sobrevivan a la muerte del autor si ya fueron enviados.
- [ ] Mantener identificados los contratos para narrativa/cámara/actores sin implementar todavía historia o cinemáticas.
- [ ] Evaluar LLM local solo como mejora opcional del diálogo: calidad en español y pruebas con el juego en móviles físicos antes de incorporarlo. La base funcionará sin modelo y sin red.
