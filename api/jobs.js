const { URL } = require('url');
const { buildUpstreamUrl, proxyToUpstream } = require('../scripts/proxy');

module.exports = (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host ?? 'localhost'}`);
  const upstreamUrl = buildUpstreamUrl(requestUrl);

  proxyToUpstream(upstreamUrl, response);
};
