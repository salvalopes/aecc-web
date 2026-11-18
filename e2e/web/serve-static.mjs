// Servidor estático mínimo (só módulos nativos do Node) para o build exportado da web,
// com fallback SPA para index.html — necessário para /auth/callback e rotas profundas.
// O `npx expo serve` devolve 404 nessas rotas.
// Uso: node e2e/web/serve-static.mjs <dir> <porta> [<dir-tiles>]
//
// Com <dir-tiles> (mapa-plano W2), `/tiles/*` é servido a partir da fixture local, como o Caddy faz
// em produção (T1): pedidos `Range` → 206 com `Content-Range` (o cliente pmtiles exige-o), e
// qualquer `/tiles/fonts/<stack>/<range>.pbf` → `fonts/glyphs.pbf` (glyphs vazios). Fora da
// fixture, `/tiles/*` dá 404 (nunca o fallback SPA).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'e2e/web/.dist');
const port = Number(process.argv[3] ?? 8081);
const tilesRoot = process.argv[4] ? resolve(process.argv[4]) : null;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pbf': 'application/x-protobuf',
  '.pmtiles': 'application/octet-stream',
};

async function fileIn(base, urlPath) {
  const candidate = normalize(join(base, decodeURIComponent(urlPath)));
  if (!candidate.startsWith(base)) return null; // nunca servir fora de base
  try {
    if ((await stat(candidate)).isFile()) return candidate;
  } catch {
    // não existe
  }
  return null;
}

async function serveTiles(req, res, urlPath) {
  const rel = urlPath.slice('/tiles'.length);
  const file = rel.startsWith('/fonts/')
    ? join(tilesRoot, 'fonts', 'glyphs.pbf')
    : await fileIn(tilesRoot, rel);
  if (!file) {
    res.writeHead(404);
    res.end();
    return;
  }
  const body = await readFile(file);
  const headers = {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    ETag: `"fixture-${body.length}"`,
  };
  const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? '');
  if (range) {
    const start = Number(range[1]);
    const end = Math.min(range[2] ? Number(range[2]) : body.length - 1, body.length - 1);
    if (start > end) {
      res.writeHead(416, { 'Content-Range': `bytes */${body.length}` });
      res.end();
      return;
    }
    res.writeHead(206, {
      ...headers,
      'Content-Range': `bytes ${start}-${end}/${body.length}`,
      'Content-Length': end - start + 1,
    });
    res.end(body.subarray(start, end + 1));
    return;
  }
  res.writeHead(200, { ...headers, 'Content-Length': body.length });
  res.end(body);
}

createServer(async (req, res) => {
  const urlPath = new URL(req.url ?? '/', 'http://localhost').pathname;
  try {
    if (tilesRoot && (urlPath === '/tiles' || urlPath.startsWith('/tiles/'))) {
      await serveTiles(req, res, urlPath);
      return;
    }
    const file = (await fileIn(root, urlPath)) ?? join(root, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(500);
    res.end();
  }
}).listen(port, () =>
  console.log(
    `serve-static: ${root} em http://localhost:${port}` + (tilesRoot ? ` (tiles: ${tilesRoot})` : ''),
  ),
);
