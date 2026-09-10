const https = require('https');

const UPSTREAM_HOST = 'portal.gupy.io';
const UPSTREAM_PATH = '/api/job-search/jobs';

const buildUpstreamUrl = (requestUrl) => {
  const queryStringIndex = requestUrl.indexOf('?');
  const queryString = queryStringIndex >= 0 ? requestUrl.slice(queryStringIndex) : '';
  return `https://${UPSTREAM_HOST}${UPSTREAM_PATH}${queryString}`;
};

module.exports = (request, response) => {
  const upstreamUrl = buildUpstreamUrl(request.url);

  const upstreamRequest = https.request(upstreamUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; gupy-scrapper)',
      'Accept': 'application/json',
    },
  }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode || 502, {
      'Content-Type': upstreamResponse.headers['content-type'] || 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    });
    upstreamResponse.pipe(response);
  });

  upstreamRequest.on('error', (error) => {
    response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ error: 'Falha ao consultar o Gupy', detail: error.message }));
  });

  upstreamRequest.end();
};