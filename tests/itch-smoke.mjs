// Serve the actual upload ZIP under a CDN-like path in a cross-origin sandboxed iframe.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { inflateRawSync } from 'node:zlib';

const root = fileURLToPath(new URL('../', import.meta.url));
const archive = await readFile(new URL('../publicar/viceblock-itch.zip', import.meta.url));
assert.equal(archive.readUInt32LE(0), 0x04034b50);
assert.equal(archive.readUInt16LE(8), 8);
const compressedSize = archive.readUInt32LE(18);
const nameLength = archive.readUInt16LE(26);
const extraLength = archive.readUInt16LE(28);
assert.equal(archive.subarray(30, 30 + nameLength).toString(), 'index.html');
const start = 30 + nameLength + extraLength;
const html = inflateRawSync(archive.subarray(start, start + compressedSize));
assert.equal(html.length, archive.readUInt32LE(22));
assert.deepEqual(html, await readFile(new URL('../jugar/index.html', import.meta.url)));
assert.equal(archive.readUInt32LE(start + compressedSize), 0x02014b50);
assert.equal(archive.readUInt32LE(archive.length - 22), 0x06054b50);
assert.equal(archive.readUInt16LE(archive.length - 12), 1);

const gamePath = '/uploads/viceblock/index.html';
const unexpected = [];
const game = createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  if (request.url !== gamePath) {
    unexpected.push(request.url); response.writeHead(404); response.end(); return;
  }
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.end(html);
});
const host = createServer((request, response) => {
  if (request.url === '/favicon.ico') { response.writeHead(204); response.end(); return; }
  if (request.url !== '/') { unexpected.push(request.url); response.writeHead(404); response.end(); return; }
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#12121b}
    iframe{display:block;border:0;width:100%;height:100%}
    </style></head><body><iframe name="viceblock-game" title="Viceblock"
    sandbox="allow-scripts allow-same-origin allow-pointer-lock" allow="autoplay; fullscreen" allowfullscreen
    src="http://localhost:${game.address().port}${gamePath}"></iframe></body></html>`);
});
try {
  game.listen(0, '127.0.0.1'); await once(game, 'listening');
  host.listen(0, '127.0.0.1'); await once(host, 'listening');
  const child = spawn(process.execPath, ['tests/browser-smoke.mjs'], {
    cwd: root, stdio: 'inherit',
    env: { ...process.env, VICEBLOCK_IFRAME: '1', VICEBLOCK_PORTABLE: '0', VICEBLOCK_PORTABLE_INLINE: '0',
      VICEBLOCK_URL: `http://127.0.0.1:${host.address().port}/`,
      VICEBLOCK_GAME_ORIGIN: `http://localhost:${game.address().port}` },
  });
  const [code] = await once(child, 'exit');
  assert.equal(code, 0, 'Falló el juego dentro del iframe');
  assert.deepEqual(unexpected, [], 'El paquete solicitó rutas sin incluir en el ZIP');
  console.log('PASS ZIP con index.html en raíz, iframe de otro origen y cero recursos externos');
} finally {
  host.closeAllConnections(); game.closeAllConnections();
  await Promise.all([new Promise(resolve => host.close(resolve)), new Promise(resolve => game.close(resolve))]);
}
