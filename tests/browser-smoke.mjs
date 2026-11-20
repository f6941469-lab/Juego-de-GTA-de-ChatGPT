// Uses an externally installed Playwright; does not add a runtime game dependency.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.VICEBLOCK_PLAYWRIGHT ?? 'playwright');
const output = process.env.VICEBLOCK_ARTIFACT_DIR ?? join(tmpdir(), 'viceblock-smoke');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.VICEBLOCK_CHROMIUM || undefined,
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const errors = [];
const report = { browser: browser.version(), renderer: 'SwiftShader (software)', errors, checks: [], desktop: {}, mobile: {} };
async function open(page) {
  page.on('pageerror', (error) => errors.push(String(error)));
  page.setDefaultTimeout(30_000);
  await page.goto(process.env.VICEBLOCK_URL ?? 'http://127.0.0.1:4173');
  await page.locator('#play-button:enabled').waitFor();
  await page.locator('#open-settings').click();
  await page.locator('#quality-select').selectOption('low');
  await page.locator('#close-dialog').click();
  await page.locator('#play-button').click();
  await page.keyboard.press('F3');
}
async function hudContains(page, value) {
  await page.waitForFunction((value) => document.querySelector('#session-status').textContent.includes(value), value);
}
async function moveUntil(page, key, coordinate, bound, less) {
  await page.keyboard.down(key);
  try {
    await page.waitForFunction(({ coordinate, bound, less }) => {
      const m = document.querySelector('#debug-panel').textContent.match(/Posición: ([\d.-]+), ([\d.-]+), ([\d.-]+)/);
      return m && (less ? Number(m[coordinate]) < bound : Number(m[coordinate]) > bound);
    }, { coordinate, bound, less });
  } finally { await page.keyboard.up(key); }
}
try {
  const page = await browser.newPage({ viewport: { width: 960, height: 640 } });
  await open(page);
  await page.keyboard.press('ArrowUp');
  await page.locator('#interaction-panel.phone').waitFor({ state: 'visible' });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('#interaction-title').textContent === 'Palma Social');
  assert.match(await page.locator('#interaction-body').innerText(), /todo tranquilo/);
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
  await page.locator('#interaction-panel').waitFor({ state: 'hidden' });
  report.checks.push('Desktop phone: Up, Enter, Back and close; honest empty feed');
  await moveUntil(page, 'KeyW', 3, 34.2, true);
  await moveUntil(page, 'KeyD', 1, 16.3, false);
  await page.keyboard.press('KeyE');
  await page.locator('#interaction-panel.shop').waitFor({ state: 'visible' });
  await page.keyboard.press('Enter'); await hudContains(page, '$112');
  assert.match(await page.locator('#interaction-body').innerText(), /Tienes 1/);
  report.checks.push('Walk through entrance, open counter, buy water and validate $112/inventory');
  await page.keyboard.press('Escape');
  await page.locator('#interaction-panel').waitFor({ state: 'hidden' });
  await page.locator('#game-canvas').click({ position: { x: 480, y: 320 } });
  await page.keyboard.press('Digit1'); await hudContains(page, 'PISTOLA');
  await page.mouse.down({ button: 'right' }); await page.mouse.down({ button: 'left' });
  await page.waitForFunction(() => !document.querySelector('#session-status').textContent.includes('PISTOLA 8 / 24'));
  await page.mouse.up({ button: 'left' }); await page.mouse.up({ button: 'right' });
  await page.keyboard.press('KeyR');
  await page.waitForFunction(() => {
    const status = document.querySelector('#session-status').textContent;
    return status.includes('PISTOLA 8') && !status.includes('RECARGANDO');
  });
  report.checks.push('Right+left mouse chord fires, magazine decreases and reload transfers reserve');
  report.desktop.status = await page.locator('#session-status').innerText();
  await page.keyboard.press('Escape'); await page.locator('#game-dialog').waitFor({ state: 'visible' });
  await page.locator('#reset-button').click(); await hudContains(page, '$120'); await hudContains(page, 'MANOS LIBRES');
  report.desktop.afterReset = await page.locator('#session-status').innerText();
  await page.locator('#resume-button').click();
  report.checks.push('Pause, reset restores cash/unarmed state, and resume');
  report.desktop.diagnostics = await page.locator('#debug-panel').innerText();
  await page.keyboard.press('F3'); await page.screenshot({ path: join(output, 'desktop.png') });
  await page.keyboard.press('Escape'); await page.locator('#game-dialog').waitFor({ state: 'visible' });
  await page.locator('#time-slider').focus(); await page.keyboard.press('End');
  for (let i = 0; i < 7; i++) await page.keyboard.press('ArrowLeft');
  await page.waitForFunction(() => document.querySelector('#time-output').value === '22:00');
  await page.locator('#resume-button').click();
  await page.screenshot({ path: join(output, 'night.png') });
  report.checks.push('Night setting 22:00 and interior lighting capture');
  await page.goto('about:blank'); await page.close();
  report.checks.push('Pagehide cleanup without exceptions');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await open(mobile);
  const forward = await mobile.locator('[data-move=forward]').boundingBox();
  const cdp = await mobile.context().newCDPSession(mobile);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: forward.x + forward.width / 2, y: forward.y + forward.height / 2, id: 1 }] });
  try {
    await mobile.waitForFunction(() => {
      const m = document.querySelector('#debug-panel').textContent.match(/Posición: ([\d.-]+), ([\d.-]+), ([\d.-]+)/);
      return m && Number(m[3]) < 40.5;
    });
  } finally { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
  await mobile.keyboard.press('F3');
  await mobile.locator('[data-command=phone]').tap();
  await mobile.locator('#interaction-panel.phone').waitFor({ state: 'visible' });
  await mobile.locator('[data-select="2"]').tap();
  await mobile.waitForFunction(() => document.querySelector('#interaction-title').textContent === 'Guía del barrio');
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  report.mobile.panel = await mobile.locator('#interaction-panel').boundingBox();
  assert.ok(report.mobile.panel.x >= 0 && report.mobile.panel.y >= 0 && report.mobile.panel.y + report.mobile.panel.height <= 844);
  await mobile.screenshot({ path: join(output, 'mobile.png') });
  report.checks.push('390×844: held touch movement, phone tap navigation and panel fits viewport');
  assert.deepEqual(errors, []);
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ output, ...report }, null, 2));
} finally { await browser.close(); }
