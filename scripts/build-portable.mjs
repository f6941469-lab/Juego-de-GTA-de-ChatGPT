import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { build } from 'vite';

// Use the project's existing Vite API; no extra bundler or runtime dependency.
const root = fileURLToPath(new URL('../', import.meta.url));
const destination = join(root, 'jugar/index.html');
const check = process.argv.includes('--check');
assert.ok(process.argv.slice(2).every((arg) => arg === '--check'), 'Opción desconocida');
const { version } = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const source = (await readFile(join(root, 'index.html'), 'utf8')).replace(/\r\n?/g, '\n');
assert.ok(source.includes(`data-build="mercado-palma-${version}"`), 'La versión del HTML debe coincidir con package.json');

const result = await build({
  configFile: false,
  root,
  publicDir: false,
  logLevel: 'warn',
  build: {
    write: false,
    target: 'es2022',
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false,
    // Library mode embeds imported assets, including fonts, as data URLs.
    lib: { entry: join(root, 'src/main.ts'), name: 'Viceblock', formats: ['iife'] },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});
const outputs = Array.isArray(result) ? result : [result];
assert.equal(outputs.length, 1, 'Se esperaba una sola compilación');
assert.ok('output' in outputs[0], 'No se generó la compilación');
const output = outputs[0].output;
const chunks = output.filter((item) => item.type === 'chunk');
const styles = output.filter((item) => item.type === 'asset' && item.fileName.endsWith('.css'));
assert.equal(chunks.length, 1, 'El juego portable debe tener un único script');
assert.equal(chunks[0].imports.length + chunks[0].dynamicImports.length, 0, 'No se permiten importaciones externas');
assert.equal(styles.length, 1, 'Se esperaba una hoja de estilos integrada');
assert.equal(output.length, 2, 'Hay recursos sin integrar en el HTML');
const js = chunks[0].code;
new Script(js); // The payload must parse as a classic script, without module loading.
const css = String(styles[0].source);
for (const match of css.matchAll(/url\(\s*["']?([^\s"')]+)/g)) {
  assert.ok(match[1].startsWith('data:'), `Recurso CSS externo: ${match[1]}`);
}

const licenseDirectory = join(root, 'public/licencias');
const licenses = {};
for (const name of (await readdir(licenseDirectory)).sort()) {
  if (name.endsWith('.txt')) licenses[name] = (await readFile(join(licenseDirectory, name), 'utf8')).replace(/\r\n?/g, '\n');
}
assert.ok(Object.keys(licenses).length >= 4, 'Faltan licencias de las dependencias');
const metadata = JSON.stringify({ version, delivery: 'single-file', licenses }).replace(/</g, '\\u003c');
const entry = '<script type="module" src="/src/main.ts"></script>';
assert.equal(source.split(entry).length, 2, 'No se encontró una única entrada de desarrollo');
const html = source
  .replace('<html lang="es"', '<html lang="es" data-delivery="portable"')
  .replace('</head>', () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>\n  </head>`)
  .replace(`MERCADO PALMA · VERSIÓN ${version}`, `MERCADO PALMA · VERSIÓN ${version} · SIN CONEXIÓN`)
  .replace(entry, () => `<!-- Generado por npm run build:portable. Licencias integradas en viceblock-licenses. -->\n    <script type="application/json" id="viceblock-licenses">${metadata}</script>\n    <script>${js.replace(/<\/script/gi, '<\\/script')}</script>`);
assert.ok(!/<script\b[^>]*\bsrc\s*=/i.test(html), 'Quedó un script externo');
assert.ok(!/<link\b[^>]*\bhref\s*=/i.test(html), 'Quedó una hoja o fuente externa');
assert.ok(!/<script\b[^>]*type=["']module/i.test(html), 'Quedó un módulo que necesita servidor');

if (check) {
  assert.equal(await readFile(destination, 'utf8'), html, 'jugar/index.html está desactualizado: ejecuta npm run build:portable');
} else {
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, html);
}
console.log(JSON.stringify({ file: 'jugar/index.html', version, bytes: Buffer.byteLength(html), sha256: createHash('sha256').update(html).digest('hex'), check }));
