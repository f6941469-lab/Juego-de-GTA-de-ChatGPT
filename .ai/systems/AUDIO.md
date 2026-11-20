---
document_id: SYSTEM-AUDIO
status: active
last_updated: 2026-11-20
verified_against: "248f8b44b7aebf77fc38a0d5c0bde996e680cec5"
verification_scope: "static-analysis-only"
related_systems: [CORE_AND_INPUT, VEHICLES, POLICE_AND_WANTED]
related_files:
  - src/audio/audio.ts
  - src/audio/synths/signals.ts
---

# Sistema: Audio Procedural (`AUDIO.md`)

1. **Propósito:** Sintetizar en tiempo real todos los efectos, motor, ambientes y vehículos espaciales del juego mediante Web Audio API sin ficheros de audio externos.
2. **Estado de implementación:** Implementado y operativo (con canal de lluvia latente sin emisor).
3. **Responsabilidades:** Desbloquear `AudioContext` tras interacción del usuario, mezclar buses (`master -> world -> effects/vehicles/atmosphere` + `interfaceBus`), modular motor de 5 marchas, pasos, oleaje/ciudad, bocina y hasta 5 voces espaciales de tráfico + 3 de patrullas con Doppler.
4. **Archivos fuente relevantes:** `src/audio/audio.ts`, `src/audio/synths/signals.ts`.
5. **Clases y funciones principales:** `createGameAudio`, `assemble`, `updateSpatial`, primitivas `gain`, `filter`, `oscillator`, `noiseBuffer`, `noiseLoop`, `smooth`, `sweep`, `burst`.
6. **Interfaces públicas:** `SoundSource`, `AudioFrame`, `createGameAudio` (`unlock`, `update`, `cue`, `dispose`, `setVolume`, `setMuted`, `setPaused`).
7. **Dependencias:** Web Audio API nativa del navegador.
8. **Sistemas dependientes:** `src/main.ts` (envía `AudioFrame` cada `0.042 s` y dispara `cue`).
9. **Flujo de funcionamiento:** `unlock()` crea el grafo sobre `DynamicsCompressorNode` en el primer `play()`. `update(frame)` suaviza posición/orientación del `listener`, calcula cambios de marcha (`gearLimits = [7, 14, 22, 31, 46]`), derrape/frenado, cercanía a la costa (`coastDistance`), pasos al caminar y asigna las voces espaciales `PannerNode` (`equalpower`, `inverse`) a los vehículos más cercanos dentro de `100 m` aplicando desplazamiento Doppler (`343 / (343 + radialSpeed)`). `pagehide` ejecuta `dispose()`.
10. **Estructuras de datos relevantes:** `gearLimits`, `lastCue` (`Map<Cue, number>`), pools fijos de `5` voces tráfico y `3` voces policía.
11. **Invariantes:** `AudioContext` nunca se crea antes de un gesto del usuario; `paused === true` silencia `world.gain` manteniendo `interfaceBus` para feedback de UI; los `sweep`/`burst` desconectan sus nodos en `onended`.
12. **Restricciones:** Sin soporte en entornos headless Node sin polyfill de `AudioContext` (se desactiva silenciosamente si `AudioContext` es `undefined`).
13. **Problemas conocidos:** `VB-013` (`cue('jump')` se dispara desde `main.ts` aunque esté en el aire; los pasos usan `frame.y < 0.5` en lugar de `grounded`); campo `rain` de `AudioFrame` no alimentado por ningún sistema climático.
14. **Consideraciones de rendimiento:** Pools fijos de nodos continuos evitan crear/destruir grafos de motores/sirenas cada frame; actualización limitada a `~24 Hz` (`42 ms`).
15. **Métodos de verificación:** **0 pruebas automatizadas** (`VB-014`). Verificación manual en navegador requerida.
16. **Riesgos de modificación:** Omitir `onended` disconnect en nuevas síntesis temporales filtraría nodos Web Audio activos.
17. **Referencias relacionadas:** [DATA_FLOW.md](../architecture/DATA_FLOW.md), [KNOWN_ISSUES.md](../KNOWN_ISSUES.md).
18. **Última verificación:** 2026-11-20 (análisis estático sobre `248f8b4`).
