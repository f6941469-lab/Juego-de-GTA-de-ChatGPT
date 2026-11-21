import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';

const destination = new URL('../publicar/viceblock-itch.zip', import.meta.url);
const check = process.argv.includes('--check');
assert.ok(process.argv.slice(2).every(arg => arg === '--check'), 'Opción desconocida');
const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const html = await readFile(new URL('../jugar/index.html', import.meta.url));
const text = html.toString('utf8');
assert.ok(text.includes(`data-build="mercado-palma-${version}"`), 'El HTML portable debe coincidir con la versión actual');
assert.ok(text.includes('data-delivery="portable"'), 'Se requiere el HTML compilado');
assert.ok(!/<script\b[^>]*\bsrc\s*=/i.test(text), 'El juego debe llevar su código integrado');

// ZIP uses CRC-32/ISO-HDLC. Keep export compatible with all supported Node versions.
const table = new Uint32Array(256);
for (let byte = 0; byte < table.length; byte++) {
  let value = byte;
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  table[byte] = value;
}
let checksum = 0xffffffff;
for (const byte of html) checksum = (checksum >>> 8) ^ table[(checksum ^ byte) & 0xff];
checksum = (checksum ^ 0xffffffff) >>> 0;

const name = Buffer.from('index.html');
const compressed = deflateRawSync(html, { level: 9 });
// Fixed DOS date (1980-01-01) makes the archive reproducible across builds.
const date = 33;
const local = Buffer.alloc(30);
local.writeUInt32LE(0x04034b50, 0);
local.writeUInt16LE(20, 4);
local.writeUInt16LE(0x0800, 6);
local.writeUInt16LE(8, 8);
local.writeUInt16LE(date, 12);
local.writeUInt32LE(checksum, 14);
local.writeUInt32LE(compressed.length, 18);
local.writeUInt32LE(html.length, 22);
local.writeUInt16LE(name.length, 26);

const central = Buffer.alloc(46);
central.writeUInt32LE(0x02014b50, 0);
central.writeUInt16LE(20, 4);
central.writeUInt16LE(20, 6);
central.writeUInt16LE(0x0800, 8);
central.writeUInt16LE(8, 10);
central.writeUInt16LE(date, 14);
central.writeUInt32LE(checksum, 16);
central.writeUInt32LE(compressed.length, 20);
central.writeUInt32LE(html.length, 24);
central.writeUInt16LE(name.length, 28);

const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(1, 8);
end.writeUInt16LE(1, 10);
end.writeUInt32LE(central.length + name.length, 12);
end.writeUInt32LE(local.length + name.length + compressed.length, 16);
const archive = Buffer.concat([local, name, compressed, central, name, end]);

if (check) {
  assert.deepEqual(await readFile(destination), archive, 'El ZIP está desactualizado. Ejecuta npm run build:itch');
} else {
  await mkdir(new URL('../publicar/', import.meta.url), { recursive: true });
  await writeFile(destination, archive);
}
console.log(JSON.stringify({ file: fileURLToPath(destination), version, bytes: archive.length,
  sha256: createHash('sha256').update(archive).digest('hex'), entry: 'index.html', check }));
