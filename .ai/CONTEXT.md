---
document_id: CORE-CONTEXT
status: active
last_updated: 2026-11-20
verified_against: "248f8b44b7aebf77fc38a0d5c0bde996e680cec5"
verification_scope: "static-analysis-only"
---

# Contexto Esencial (`CONTEXT.md`)

## 1. Visión vs. Alcance real (`0.2.0`)
- **Visión a largo plazo:** Videojuego 3D de mundo abierto urbano inspirado en la libertad, escala, densidad e interacción sistémica de GTA VI con estética voxel/cúbica-prismática propia y tecnología personalizada.
- **Alcance implementado hoy (`0.2.0`):** *Vertical slice* jugable en navegador de un único distrito costero (**Costa Palmera**, `259 m × 416 m`). Incluye exploración a pie, conducción de 1 vehículo (`Rayo GT`), tráfico autónomo con semáforos, búsqueda policial de 5 estrellas, ciclo día/noche de 18 minutos, audio Web Audio 100 % procedural, UI escritorio/táctil y 25 pruebas unitarias.
- **No implementado todavía:** Peatones/NPCs a pie, robo de coches del tráfico, múltiples vehículos conducibles simultáneos, combate/armas, inventario, economía, misiones, interiores, clima activo, guardado de partida o múltiples distritos.

## 2. Stack tecnológico verificado
- **Lenguajes:** TypeScript (`5.9.3`, `strict: true`, `ES2022`), GLSL ES (shaders propios), HTML5 y CSS3.
- **Renderizado:** Three.js `0.183.2` (`WebGLRenderer` WebGL 2). **Sin motores comerciales** (Unity, Unreal, Godot).
- **Física:** `@dimforge/rapier3d-compat` `0.19.3` (WASM en cliente).
- **Audio y persistencia:** Web Audio API y IndexedDB nativos (cero assets binarios externos salvo fuentes `@fontsource/archivo-black` y `@fontsource/barlow-condensed` `5.3.0`).
- **Build y pruebas:** Vite `7.3.8`, Vitest `5.1.1`, Node.js `>=22.12 / 24 LTS` (CI en `.github/workflows/ci.yml`).

## 3. Convenciones esenciales
- **Coordenadas:** `1 unidad ≈ 1 metro`. `+Y` arriba. Rumbo `0 rad` apunta hacia `-Z` (norte); ángulo positivo gira hacia `+X`. El minimapa 2D proyecta `(X, Z)`.
- **Tiempo:** Tiempos de simulación/animación en segundos; reloj fijo `1/60 s` (`FixedLoop`, máximo `0.1 s` por frame); reloj del día decimal `0..24` (`18 min` reales por día).
- **Determinismo:** `makeRandom(seed)` (LCG 32-bit) en `src/world/generation/layout.ts` asegura trazados reproducibles desde `gameConfig.seed` (`240817`).
- **Idioma:** Textos visibles, commits y documentación en español; símbolos de código en inglés.

## 4. Comandos del proyecto (`package.json`)
> Nota: En el checkout actual falta `node_modules/` (`npm ci` requerido antes de ejecutar).

| Comando | Acción |
| :--- | :--- |
| `npm ci` | Instala dependencias exactas desde `package-lock.json` |
| `npm run dev` | Inicia servidor Vite (`--host 0.0.0.0`) |
| `npm run typecheck` | Comprobación estática `tsc --noEmit` |
| `npm test` | Ejecuta las 9 suites Vitest (`vitest run`, 25 tests) |
| `npm run build` | Ejecuta `typecheck` + `vite build` hacia `dist/` |
| `npm run preview` | Sirve `dist/` localmente |

## 5. Organización y restricciones arquitectónicas clave
- **Punto de entrada:** `src/main.ts` orquesta el arranque, el ciclo de `60 Hz`, el renderizado, el audio y la UI.
- **Restricciones activas:**
  - `world.step()` se ejecuta actualmente dentro de `player`/`vehicle` (pendiente de centralizar en `physics.ts`, ver `VB-001`).
  - Todos los colisionadores estáticos de edificios/suelo residen permanentemente en Rapier (ver `VB-002`).
  - Streaming (`64×64 m`) es solo visual y reconstruye geometría síncronamente en el hilo principal (`VB-003`).
  - Tráfico y patrullas son cinemáticos (sin reacción física de retorno desde Rapier, `VB-004`).
  - Requiere navegador con WebGL 2.
