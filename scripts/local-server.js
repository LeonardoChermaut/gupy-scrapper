const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { UPSTREAM_HOST, UPSTREAM_PATH, buildUpstreamUrl, proxyToUpstream } = require('./proxy');

const PORT = process.env.PORT ?? 3000;
const ROOT_DIR = path.join(__dirname, '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

const serveStatic = (requestPath, response) => {
  const safePath = path
    .normalize(requestPath)
    .replace(/^(\.\.[/\\])+/, '')
    .replace(/^[/\\]+/, '');

  const filePath = safePath === '' || safePath === '.'
    ? path.join(ROOT_DIR, 'index.html')
    : path.join(ROOT_DIR, safePath);

  if (!filePath.startsWith(ROOT_DIR)) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Acesso negado');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Arquivo não encontrado');
      return;
    }

    const fileExtension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      'Content-Type': MIME_TYPES[fileExtension] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(content);
  });
};

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);

  if (requestUrl.pathname.startsWith('/api/')) {
    const upstreamUrl = buildUpstreamUrl(requestUrl);
    proxyToUpstream(upstreamUrl, response);
    return;
  }
  serveStatic(decodeURIComponent(requestUrl.pathname), response);
});

server.listen(PORT, () => {
  console.log(`\n  Servidor rodando em http://localhost:${PORT}\n`);
  console.log(`  Estáticos de: ${ROOT_DIR}`);
  console.log(`  Proxy: /api/jobs  →  https://${UPSTREAM_HOST}${UPSTREAM_PATH}\n`);
});
