---
document_id: CORE-CURRENT-STATE
status: active
last_updated: 2026-11-20
verified_against: "248f8b44b7aebf77fc38a0d5c0bde996e680cec5"
verification_scope: "static-analysis-only (working tree has uncommitted .ai/ and AGENTS.md docs)"
---

# Estado Operativo Actual (`CURRENT_STATE.md`)

- **Rama actual:** `main` (sincronizada con `origin/main`).
- **Commit de código base:** `248f8b44b7aebf77fc38a0d5c0bde996e680cec5` (*feat: entregar Viceblock 0.2.0 con conducción y distritos*).
- **Estado general:** Prototipo `0.2.0` arquitectónicamente auditado por lectura estática completa. Sistema de memoria persistente `.ai/` implantado sobre `248f8b4`.

## Estado de los sistemas (verificado en código)

| Categoría | Sistemas |
| :--- | :--- |
| **Operativos** | Loop fijo `60 Hz`, entrada teclado/puntero/táctil, jugador a pie + avatar animado + cámara tercera persona, vehículo `Rayo GT` con entrada/salida validada, tráfico autónomo + semáforos, policía + sistema `wanted` 5 estrellas, generación determinista de distrito + streaming visual `64 m`, renderizado WebGL 2 + cielo/agua/sombras de contacto, audio procedural Web Audio, UI/HUD/minimapa, persistencia IndexedDB, debug F3/F4. |
| **Parciales / Con fricción** | Streaming físico (colisionadores estáticos permanentes), colisión de aceras (`+4.9 cm` visual vs `0.0` físico), colisionadores de mobiliario costero/parques (ausentes), evitación policial frente a tráfico civil, instanciación de patrullas (`InstancedMesh` ausente). |
| **Latentes / Incompletos** | Canal de lluvia en `audio.ts` (`rainLevel` sin emisor ni clima), soporte multi-vehículo. |
| **No implementados** | Peatones/NPCs a pie, robo de coches de tráfico, combate/armas, inventario, economía, misiones, interiores, guardado de progreso de partida. |

## Estado de las verificaciones
- **Análisis estático:** Completado al 100 % sobre 71 archivos rastreados (`AUDIT-0001`).
- **Compilación, tests y navegador (`typecheck`, `test`, `build`, WebGL):** **Pendientes de verificación** en este entorno porque `node_modules/` está ausente y la sesión actual operó en modo solo código-sin-ejecución. (`PROJECT_STATE.md` reporta que las 25 pruebas y el build pasaron en la entrega `0.2.0`).

## Prioridades y bloqueos actuales
1. **Bloqueo técnico para verificación:** Instalar dependencias (`npm ci`) bajo autorización para validar `typecheck`, `test`, `build` y perfilado base.
2. **Prioridades P1 de estabilización antes de expandir contenido:**
   - `VB-001`: Centralizar `world.step(dt)` en `physics.ts`.
   - `VB-002`: Índice espacial para `StaticBox` (`clearLine`) y futura descarga física.
   - `VB-003`: Presupuesto por frame en `streaming.ts` para evitar picos síncronos.
   - `VB-004` / `VB-005`: Evitación mutua policía-tráfico e instanciación de patrullas.
3. **Tareas activas:** Ninguna tarea de código en curso; pendiente de aprobación del backlog (`TASK-0001` en adelante).

## Próximos pasos recomendados
1. Autorizar y ejecutar `TASK-0001` (validación limpia + medición base en navegador).
2. Aprobar e iniciar `TASK-0002` (centralización de `world.step(dt)` en `physics.ts`).
