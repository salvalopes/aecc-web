// Proxy da API só para as capturas nativas do refinamento do mapa (docs/design/mapa-refino.md).
// GET /api/companies/map e GET /api/categories saem do fixture sintético (build-fixture.mjs);
// todo o resto (login, sessão, detalhe) vai para a stack E2E, com o Host dela, para que os tokens
// e os redirects fiquem iguais aos de um pedido direto. Só módulos nativos do Node.
// Uso: node scripts/map/capture/api-proxy.mjs <fixture-dir> <porta> [<upstream>]
import { createServer, request } from 'node:http';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const [fixtureDir, portArg, upstreamArg] = process.argv.slice(2);
if (!fixtureDir) {
  console.error('uso: api-proxy.mjs <fixture-dir> <porta> [<upstream>]');
  process.exit(2);
}
const port = Number(portArg ?? 5090);
const upstream = new URL(upstreamArg ?? 'http://127.0.0.1:5080');
const map = JSON.parse(readFileSync(join(fixtureDir, 'map.json'), 'utf8'));
const categories = readFileSync(join(fixtureDir, 'categories.json'), 'utf8');

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/api/companies/map') {
    const categoryId = url.searchParams.get('categoryId');
    const body = categoryId ? map.filter((p) => p.categoryId === categoryId) : map;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/categories') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(categories);
    return;
  }
  const proxied = request(
    {
      host: upstream.hostname,
      port: upstream.port,
      method: req.method,
      path: req.url,
      headers: { ...req.headers, host: upstream.host },
    },
    (up) => {
      res.writeHead(up.statusCode ?? 502, up.headers);
      up.pipe(res);
    },
  );
  proxied.on('error', () => {
    res.writeHead(502);
    res.end();
  });
  req.pipe(proxied);
}).listen(port, () => console.log(`api-proxy: fixture em :${port}, resto → ${upstream.origin}`));
