import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.VICEBLOCK_PLAYWRIGHT ?? 'playwright');
const output = process.env.VICEBLOCK_ARTIFACT_DIR ?? join(tmpdir(), 'viceblock-main-smoke');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.VICEBLOCK_CHROMIUM || undefined, headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const errors = []; const checks = [];
async function open(page) {
  page.on('pageerror', (error) => errors.push(String(error))); page.setDefaultTimeout(30000);
  await page.goto(process.env.VICEBLOCK_URL ?? 'http://127.0.0.1:4173');
  await page.locator('#play-button:enabled').waitFor();
  await page.locator('#open-settings').click(); await page.locator('#quality-select').selectOption('low'); await page.locator('#close-dialog').click();
  await page.locator('#play-button').click();
}
async function bag(page) {
  await page.keyboard.press('ArrowUp'); await page.locator('#phone-device').waitFor({state:'visible'});
  await page.locator('#phone-screen').getByRole('button', {name:'Mochila'}).click();
  await page.waitForFunction(()=>document.querySelector('#phone-screen').textContent.includes('Agua mineral'));
}
try {
  const page = await browser.newPage({viewport:{width:960,height:640}}); await open(page);
  await bag(page); await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.locator('#phone-device').waitFor({state:'hidden'});
  checks.push('Native main phone: Up, bag and Escape navigation');
  await page.keyboard.press('F3'); await page.keyboard.down('KeyW');
  try { await page.waitForFunction(()=>{const m=document.querySelector('#debug-panel').textContent.match(/Posición: ([\d.-]+), ([\d.-]+), ([\d.-]+)/);return m&&Number(m[3])<35.1;}); }
  finally { await page.keyboard.up('KeyW'); }
  await page.keyboard.press('KeyE'); await page.locator('#trade-panel').waitFor({state:'visible'});
  await page.keyboard.press('Enter'); await page.waitForFunction(()=>document.querySelector('#cash-display').textContent==='$112');
  await page.locator('[data-buy="2"]').click(); await page.waitForFunction(()=>document.querySelector('#cash-display').textContent==='$82');
  checks.push('Walk into Mercado Palma; buy water and ammunition with validated cash');
  await page.keyboard.press('Escape'); await page.locator('#trade-panel').waitFor({state:'hidden'}); await bag(page);
  await page.locator('#phone-screen').getByRole('button', {name:/Munición para pistola/}).click();
  await page.waitForFunction(()=>document.querySelector('#phone-screen').textContent.includes('pistola ×0'));
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.locator('#phone-device').waitFor({state:'hidden'});
  await page.locator('#game-canvas').click({position:{x:480,y:320}}); await page.keyboard.press('Digit2');
  await page.waitForFunction(()=>document.querySelector('#weapon-display').textContent.includes('12/60'));
  await page.mouse.down({button:'right'}); await page.mouse.down({button:'left'});
  await page.waitForFunction(()=>!document.querySelector('#weapon-display').textContent.includes('12/60'));
  await page.mouse.up({button:'left'}); await page.mouse.up({button:'right'}); await page.keyboard.press('KeyR');
  await page.waitForFunction(()=>{const m=document.querySelector('#weapon-display').textContent.match(/12\/(\d+)/);return m&&Number(m[1])<60;});
  checks.push('Inventory ammunition reaches main weapon system; right+left chord fires and reloads');
  await page.keyboard.press('Escape'); await page.locator('#game-dialog').waitFor({state:'visible'});
  await page.locator('#reset-button').click(); await page.waitForFunction(()=>document.querySelector('#cash-display').textContent==='$120');
  await page.locator('#resume-button').click(); await page.keyboard.press('F3'); await page.screenshot({path:join(output,'desktop.png')});
  checks.push('Main reset restores economy and camera');
  await page.goto('about:blank'); await page.close();
  const mobile = await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}); await open(mobile);
  await mobile.locator('[data-action="togglePhone"]').tap(); await mobile.locator('#phone-device').waitFor({state:'visible'});
  await mobile.locator('#phone-screen').getByRole('button',{name:'Mochila'}).tap();
  await mobile.waitForFunction(()=>document.querySelector('#phone-screen').textContent.includes('Agua mineral'));
  assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await mobile.screenshot({path:join(output,'mobile.png')}); checks.push('390×844 touch phone and inventory fit viewport');
  assert.deepEqual(errors,[]); const report={browser:browser.version(),renderer:'SwiftShader',checks,errors};
  await writeFile(join(output,'report.json'),JSON.stringify(report,null,2)); console.log(JSON.stringify({output,...report},null,2));
} finally { await browser.close(); }
