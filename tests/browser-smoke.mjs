// Uses an externally installed Playwright; does not add a runtime game dependency.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const portable = process.env.VICEBLOCK_PORTABLE === '1';
const embedded = process.env.VICEBLOCK_IFRAME === '1';
const inline = process.env.VICEBLOCK_PORTABLE_INLINE === '1';
const webgpu = process.env.VICEBLOCK_WEBGPU === '1';
const forceWebGL = process.env.VICEBLOCK_FORCE_WEBGL === '1';
assert.ok(!embedded || !portable, 'La prueba de iframe usa el ZIP alojado');
assert.ok(!inline || portable, 'La prueba inline requiere VICEBLOCK_PORTABLE=1');
const portablePath = fileURLToPath(new URL('../jugar/index.html', import.meta.url));
const portableHTML = portable ? await readFile(portablePath, 'utf8') : undefined;
const target = process.env.VICEBLOCK_URL ?? (portable ? pathToFileURL(portablePath).href : 'http://127.0.0.1:4173');
const allowedOrigins = new Set([new URL(target).origin, process.env.VICEBLOCK_GAME_ORIGIN]);
const { chromium } = require(process.env.VICEBLOCK_PLAYWRIGHT ?? 'playwright');
const output = process.env.VICEBLOCK_ARTIFACT_DIR ?? join(tmpdir(), 'viceblock-smoke');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.VICEBLOCK_CHROMIUM || undefined,
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', ...(webgpu ? ['--enable-unsafe-webgpu'] : [])],
});
const errors = [];
const externalRequests = [];
const report = { passed: false, browser: browser.version(), renderer: 'SwiftShader (software)', version, delivery: embedded ? 'itch-iframe' : portable ? 'portable' : 'web', opening: inline ? 'inline; file:// NOT verified' : target, offline: portable, externalRequests, errors, backends: [], checks: [], desktop: {}, mobile: {} };
async function open(page) {
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('404')) errors.push(message.text());
  });
  if (forceWebGL) await page.addInitScript(() => Object.defineProperty(navigator, 'gpu', { value: undefined }));
  page.on('request', (request) => {
    if (!/^https?:/.test(request.url())) return;
    if (portable || (embedded && !allowedOrigins.has(new URL(request.url()).origin))) externalRequests.push(request.url());
  });
  await page.addInitScript(() => {
    // Verify the real audio lifecycle after a gesture, including offline playback.
    window.__viceblockAudioContexts = [];
    const OriginalAudioContext = window.AudioContext;
    window.AudioContext = class extends OriginalAudioContext {
      constructor(...args) { super(...args); window.__viceblockAudioContexts.push(this); }
    };
  });
  page.setDefaultTimeout(30_000);
  await page.goto(inline ? 'about:blank' : target);
  if (inline) await page.setContent(portableHTML);
  const game = embedded ? page.frame({ name: 'viceblock-game' }) : page.mainFrame();
  assert.ok(game, 'Falta el frame del juego');
  await game.locator('#play-button:enabled').waitFor();
  const backend = await game.locator('#game-canvas').getAttribute('data-renderer');
  report.backends.push(backend);
  assert.ok(backend === 'WebGPU' || backend === 'WebGL 2');
  if (webgpu) assert.equal(backend, 'WebGPU');
  if (forceWebGL) assert.equal(backend, 'WebGL 2');
  assert.equal(await game.locator('html').getAttribute('data-build'), `mercado-palma-${version}`);
  if (portable || embedded) {
    assert.equal(await game.locator('html').getAttribute('data-delivery'), 'portable');
    assert.equal(await game.locator('script[src], link[href], script[type=module]').count(), 0);
    const license = JSON.parse(await game.locator('#viceblock-licenses').textContent());
    assert.equal(license.version, version);
    assert.equal(Object.keys(license.licenses).length, 4);
  }
  if (embedded) assert.equal(await page.evaluate(() => document.activeElement?.tagName === 'IFRAME'), false, 'El arranque debe respetar el foco del alojamiento');
  await game.evaluate(() => document.fonts.ready);
  assert.ok(await game.evaluate(() => document.fonts.check('16px "Archivo Black"') && document.fonts.check('600 16px "Barlow Condensed"')));
  assert.equal(await game.locator('#wanted-level').count(), 0);
  if (page.viewportSize().width > 600) await page.screenshot({ path: join(output, 'entry.png') });
  await game.locator('#open-settings').click();
  await game.locator('#quality-select').selectOption('low');
  await game.locator('#close-dialog').click();
  await game.locator('#play-button').click();
  await game.waitForFunction(() => window.__viceblockAudioContexts.some((context) => context.state === 'running'));
  await page.keyboard.press('F3');
  return game;
}
async function hudContains(game, value) {
  await game.waitForFunction((value) => document.querySelector('#session-status').textContent.includes(value), value);
}
async function moveUntil(page, game, key, coordinate, bound, less) {
  await page.keyboard.down(key);
  try {
    await game.waitForFunction(({ coordinate, bound, less }) => {
      const m = document.querySelector('#debug-panel').textContent.match(/Posición: ([\d.-]+), ([\d.-]+), ([\d.-]+)/);
      return m && (less ? Number(m[coordinate]) < bound : Number(m[coordinate]) > bound);
    }, { coordinate, bound, less });
  } finally { await page.keyboard.up(key); }
}
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 640 }, offline: portable });
  const game = await open(page);
  await page.keyboard.press('ArrowUp');
  await game.locator('#interaction-panel.phone').waitFor({ state: 'visible' });
  await page.keyboard.press('Enter');
  await game.waitForFunction(() => document.querySelector('#interaction-title').textContent === 'Palma Social');
  assert.match(await game.locator('#interaction-body').innerText(), /todo tranquilo/);
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await game.locator('#interaction-panel').waitFor({ state: 'hidden' });
  report.checks.push('Desktop phone: Up, Enter, Back and close; honest empty feed');
  await moveUntil(page, game, 'KeyW', 3, 34.2, true);
  await moveUntil(page, game, 'KeyD', 1, 16.3, false);
  await page.keyboard.press('KeyE');
  await game.locator('#interaction-panel.shop').waitFor({ state: 'visible' });
  await page.keyboard.press('Enter'); await hudContains(game, '$112');
  assert.match(await game.locator('#interaction-body').innerText(), /Tienes 1/);
  report.checks.push('Walk through entrance, open counter, buy water and validate $112/inventory');
  await page.keyboard.press('Escape');
  await game.locator('#interaction-panel').waitFor({ state: 'hidden' });
  await game.locator('#game-canvas').click({ position: { x: 480, y: 320 } });
  await page.keyboard.press('Digit1'); await hudContains(game, 'PISTOLA');
  await page.mouse.down({ button: 'right' }); await page.mouse.down({ button: 'left' });
  await game.waitForFunction(() => !document.querySelector('#session-status').textContent.includes('PISTOLA 8 / 24'));
  await page.mouse.up({ button: 'left' }); await page.mouse.up({ button: 'right' });
  await page.keyboard.press('KeyR');
  await game.waitForFunction(() => {
    const status = document.querySelector('#session-status').textContent;
    return status.includes('PISTOLA 8') && !status.includes('RECARGANDO');
  });
  report.checks.push('Right+left mouse chord fires, magazine decreases and reload transfers reserve');
  report.desktop.status = await game.locator('#session-status').innerText();
  await page.keyboard.press('Escape'); await game.locator('#game-dialog').waitFor({ state: 'visible' });
  await game.waitForFunction(() => window.__viceblockAudioContexts.every((context) => context.state === 'suspended'));
  await game.locator('#reset-button').click(); await hudContains(game, '$120'); await hudContains(game, 'MANOS LIBRES');
  report.desktop.afterReset = await game.locator('#session-status').innerText();
  await game.locator('#resume-button').click();
  report.checks.push('Audio running after gesture, suspended on pause; reset restores cash/unarmed state and resumes');
  report.desktop.diagnostics = await game.locator('#debug-panel').innerText();
  await page.keyboard.press('F3'); await page.screenshot({ path: join(output, 'desktop.png') });
  await page.keyboard.press('F3');
  await moveUntil(page, game, 'KeyA', 1, 5, true);
  await page.keyboard.press('F3');
  await page.screenshot({ path: join(output, 'traffic.png') });
  report.checks.push(`Version ${version}, compact HUD and street view from the reference scene`);
  await page.keyboard.press('Escape'); await game.locator('#game-dialog').waitFor({ state: 'visible' });
  await game.locator('#reset-button').click();
  await game.locator('#time-slider').focus(); await page.keyboard.press('End');
  for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowLeft');
  await game.waitForFunction(() => document.querySelector('#time-output').value === '22:00');
  await game.locator('#resume-button').click();
  await page.screenshot({ path: join(output, 'night.png') });
  report.checks.push('Night setting 22:00 and interior lighting capture');
  await page.goto('about:blank'); await page.close();
  report.checks.push('Pagehide cleanup without exceptions');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, offline: portable });
  const mobileGame = await open(mobile);
  const forward = await mobileGame.locator('[data-move=forward]').boundingBox();
  const cdp = await mobile.context().newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: forward.x + forward.width / 2, y: forward.y + forward.height / 2, id: 1 }] });
  try {
    await mobileGame.waitForFunction(() => {
      const m = document.querySelector('#debug-panel').textContent.match(/Posición: ([\d.-]+), ([\d.-]+), ([\d.-]+)/);
      return m && Number(m[3]) < 40.5;
    });
  } finally { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
  await mobile.keyboard.press('F3');
  await mobileGame.locator('[data-command=phone]').tap();
  await mobileGame.locator('#interaction-panel.phone').waitFor({ state: 'visible' });
  await mobileGame.locator('[data-select="2"]').tap();
  await mobileGame.waitForFunction(() => document.querySelector('#interaction-title').textContent === 'Guía del barrio');
  assert.ok(await mobileGame.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  report.mobile.panel = await mobileGame.locator('#interaction-panel').boundingBox();
  assert.ok(report.mobile.panel.x >= 0 && report.mobile.panel.y >= 0 && report.mobile.panel.y + report.mobile.panel.height <= 844);
  await mobile.screenshot({ path: join(output, 'mobile.png') });
  report.checks.push('390×844: held touch movement, phone tap navigation and panel fits viewport');
  assert.deepEqual(errors, []);
  assert.deepEqual(externalRequests, []);
  report.passed = true;
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ output, ...report }, null, 2));
} catch (error) {
  report.failure = String(error);
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
  throw error;
} finally { await browser.close(); }
