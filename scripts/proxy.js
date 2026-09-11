const https = require('https');

const UPSTREAM_HOST = 'portal.gupy.io';
const UPSTREAM_PATH = '/api/job-search/jobs';

const buildUpstreamUrl = (requestUrl) => {
  const pathname = requestUrl.pathname === '/api/jobs'
    ? UPSTREAM_PATH
    : requestUrl.pathname;

  return `https://${UPSTREAM_HOST}${pathname}${requestUrl.search}`;
};

const proxyToUpstream = (upstreamUrl, response) => {
  const upstreamRequest = https.request(upstreamUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; gupy-scrapper)',
      'Accept': 'application/json',
    },
  }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode ?? 502, {
      'Content-Type': upstreamResponse.headers['content-type'] ?? 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    });
    upstreamResponse.pipe(response);
  });

  upstreamRequest.on('error', (error) => {
    response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({
      error: 'Falha ao consultar o Gupy',
      detail: error.message,
    }));
  });

  upstreamRequest.end();
};

module.exports = { UPSTREAM_HOST, UPSTREAM_PATH, buildUpstreamUrl, proxyToUpstream };
