// Servidor estático mínimo (só módulos nativos do Node) para o build exportado da web,
// com fallback SPA para index.html — necessário para /auth/callback e rotas profundas.
// O `npx expo serve` devolve 404 nessas rotas. Uso: node e2e/web/serve-static.mjs <dir> <porta>
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.argv[2] ?? 'e2e/web/.dist');
const port = Number(process.argv[3] ?? 8081);

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
};

async function fileFor(urlPath) {
  const candidate = normalize(join(root, decodeURIComponent(urlPath)));
  if (!candidate.startsWith(root)) return null; // nunca servir fora de root
  try {
    if ((await stat(candidate)).isFile()) return candidate;
  } catch {
    // não existe — cai no fallback SPA
  }
  return null;
}

createServer(async (req, res) => {
  const urlPath = new URL(req.url ?? '/', 'http://localhost').pathname;
  const file = (await fileFor(urlPath)) ?? join(root, 'index.html');
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(500);
    res.end();
  }
}).listen(port, () => console.log(`serve-static: ${root} em http://localhost:${port}`));
