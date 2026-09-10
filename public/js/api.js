import {
  API_BASE_URL,
  API_FETCH_LIMIT,
  CORS_PROXY_BUILDERS,
  LOCAL_PROXY_PATH,
} from './config.js';

export const buildApiQuery = ({ searchTerm, workplaceType }) => {
  const queryParams = new URLSearchParams();
  queryParams.set('limit', String(API_FETCH_LIMIT));
  queryParams.set('offset', '0');
  if (searchTerm) {
    queryParams.set('jobName', searchTerm);
  }

  if (workplaceType) {
    queryParams.set('workplaceType', workplaceType);
  }

  return queryParams.toString();
};

export const buildRemoteApiUrl = (params) => {
  const queryString = buildApiQuery(params);
  return `${API_BASE_URL}?${queryString}`;
};

export const buildLocalProxyUrl = (params) => {
  const queryString = buildApiQuery(params);
  return `${LOCAL_PROXY_PATH}?${queryString}`;
};

const buildAttemptUrls = (params) => {
  const remoteUrl = buildRemoteApiUrl(params);
  const attemptUrls = [buildLocalProxyUrl(params), remoteUrl];

  for (const buildProxyUrl of CORS_PROXY_BUILDERS) {
    attemptUrls.push(buildProxyUrl(remoteUrl));
  }

  return attemptUrls;
};

const fetchJson = async (url, signal) => {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const responseText = await response.text();
  try {
    return JSON.parse(responseText);
  } catch (parseError) {
    throw new Error('Resposta não é JSON válido.');
  }
};

const unwrapProxyPayload = (payload) => {
  if (payload && typeof payload.contents === 'string') {
    try {
      const innerPayload = JSON.parse(payload.contents);
      if (innerPayload && typeof innerPayload === 'object') {
        return innerPayload;
      }

    } catch (parseError) {
      return payload;
    }
  }

  return payload;
};

export const fetchJobsBatch = async (params, signal) => {
  const attemptUrls = buildAttemptUrls(params);
  let lastError = null;

  for (const attemptUrl of attemptUrls) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    try {
      const payload = await fetchJson(attemptUrl, signal);
      console.info('[gupy] resposta OK via', attemptUrl.split('?')[0]);
      return unwrapProxyPayload(payload);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error;
      }

      console.warn('[gupy] falhou via', attemptUrl.split('?')[0], '-', error.message);
      lastError = error;
    }
  }
  throw lastError ?? new Error('Todas as tentativas falharam.');
};

export const extractJobsFromPayload = (payload) => {
  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
};