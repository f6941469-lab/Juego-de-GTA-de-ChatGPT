---
document_id: CORE-CURRENT-STATE
status: active
last_updated: 2026-11-20
verified_against: "0f54f650e29ebf77fc38a0d5c0bde996e680cec5-dirty (working tree on 0f54f650e29eb488de880fc89e15e7d63744eaf8)"
verification_scope: "typecheck + vitest (27/27) + vite build + Chromium WebGL 2 SwiftShader smoke test"
---

# Estado Operativo Actual (`CURRENT_STATE.md`)

- **Rama actual:** `main` (sobre commit `0f54f650e29eb488de880fc89e15e7d63744eaf8`, con cambios locales sin confirmar).
- **Estado general:** Mapa expandido estilo Vice City con **6 distritos conectados por 3 puentes** sobre Bahía Central y **9 tiendas interactuables** con interacción inicial de asalto (`E` / botón táctil + aviso HUD + alerta policial básica).

## Estado de los sistemas (verificado en código y compilación)

| Categoría | Sistemas |
| :--- | :--- |
| **Operativos** | Loop fijo `60 Hz`, entrada teclado/puntero/táctil, jugador a pie + avatar + cámara, vehículo `Rayo GT`, tráfico autónomo conectado entre islas (`146` nodos viales), policía + búsqueda 5 estrellas, mapa multi-isla conectado (`Costa Palmera`, `Punta Palmera`, `Isla Estrella`, `Centro Financiero`, `Pequeña Palmera`, `Puerto y Muelles`, 3 puentes), 9 tiendas interactuables (`stores.ts`), renderizado WebGL 2 + cielo/agua/sombras de contacto, audio procedural, HUD con distrito dinámico/minimapa multi-isla/aviso de asalto, IndexedDB, debug F3/F4. |
| **Parciales / Con fricción** | Sistema de asalto (solo interacción básica de puerta + cooldown 90s + aviso + subida de estrella; asalto completo e interiores quedan para una fase posterior), streaming físico (`VB-002`), aceras sin collider (`VB-006`), evitación policial frente a tráfico (`VB-004`), instanciación de patrullas (`VB-005`). |
| **Latentes / Incompletos** | Canal de lluvia en `audio.ts`, soporte multi-vehículo. |
| **No implementados** | Asalto completo (cajeros/rehenes/tiroteo/botín persistente), peatones NPC, robo de coches de tráfico, combate/armas, economía, misiones, interiores, guardado de progreso. |

## Estado de las verificaciones
- `npm run typecheck`: **Pasado** (`0` errores).
- `npm test`: **Pasado** (`10` archivos, `27/27` pruebas verdes, incluyendo rutas por puentes, cubierta sólida de puentes, `getDistrictAt`, despeje de puertas de tiendas y ciclo de robo/cooldown).
- `npm run build`: **Pasado** (`vite build` generando `dist/`).
- **Navegador (Chromium headless + ANGLE SwiftShader WebGL 2):** Portada carga, `Explorar distrito` habilitado, transición a HUD operativa (`#hud-district`: `Costa Palmera`, `#wanted-status`: `Patrullaje`), `0` excepciones JS (solo 404 de `favicon.ico` inexistente). Prueba interactiva manual de conducción por puentes y robo en navegador físico pendiente de validación humana.

## Prioridades y bloqueos actuales
1. **Siguiente paso funcional:** Revisar/probar en navegador real y, cuando el propietario autorice, implementar el sistema completo de asalto y respuesta policial.
2. **Deuda técnica P1 abierta:** `VB-001` (`world.step` en controladores), `VB-002` (índice espacial de colisionadores), `VB-003` (presupuesto por frame en `streaming.ts`), `VB-004`/`VB-005` (patrullas).

## Próximos pasos recomendados
1. Revisar cambios locales y autorizar commit/push si procede.
2. Diseñar la siguiente etapa: sistema completo de asalto y policía + centralización de `world.step(dt)` (`VB-001`).
