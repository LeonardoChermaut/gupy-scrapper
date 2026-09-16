import {
  API_CONFIG,
  PAGINATION_CONFIG,
  SORT_DEFAULTS,
} from './config.js';

import { delay } from './utils.js';

export const buildApiQuery = ({ searchTerm, workplaceType, page, sortBy, sortOrder }) => {
  const queryParams = new URLSearchParams();
  queryParams.set('limit', String(API_CONFIG.fetchLimit));
  queryParams.set('page', String(page ?? 1));
  queryParams.set('sortBy', sortBy ?? SORT_DEFAULTS.sortBy);
  queryParams.set('sortOrder', sortOrder ?? SORT_DEFAULTS.sortOrder);
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
  return `${API_CONFIG.baseUrl}?${queryString}`;
};

export const buildLocalProxyUrl = (params) => {
  const queryString = buildApiQuery(params);
  return `${API_CONFIG.localProxyPath}?${queryString}`;
};

const buildAttemptUrls = (params) => {
  const remoteUrl = buildRemoteApiUrl(params);
  const attemptUrls = [buildLocalProxyUrl(params), remoteUrl];

  for (const buildProxyUrl of API_CONFIG.corsProxyBuilders) {
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

export const fetchSinglePageWithRetry = async (params, signal) => {
  let retryAttemptsRemaining = PAGINATION_CONFIG.maxRetryAttempts;
  let lastError = null;

  while (retryAttemptsRemaining > 0) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    try {
      return await fetchJobsBatch(params, signal);
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error;
      }

      lastError = error;
      retryAttemptsRemaining -= 1;

      if (retryAttemptsRemaining > 0) {
        await delay(PAGINATION_CONFIG.pageRequestDelayInMs);
      }
    }
  }

  throw lastError ?? new Error('All retry attempts failed.');
};

export const fetchAllJobs = async ({ searchTerm, workplaceType, sortBy, sortOrder }, signal, onProgress) => {
  const collectedJobsById = new Map();

  const collectJobs = (jobs) => {
    for (const job of jobs) {
      if (job.id != null) {
        collectedJobsById.set(job.id, job);
      }
    }
  };

  const reportProgress = () => {
    if (onProgress) {
      onProgress(collectedJobsById.size, totalJobCount);
    }
  };

  const firstPagePayload = await fetchSinglePageWithRetry(
    { searchTerm, workplaceType, page: 1, sortBy, sortOrder },
    signal,
  );

  const totalJobCount = firstPagePayload?.pagination?.total ?? 0;
  const firstPageJobs = extractJobsFromPayload(firstPagePayload);
  collectJobs(firstPageJobs);
  reportProgress();

  if (firstPageJobs.length === 0) {
    return [];
  }

  const totalPagesToFetch = Math.ceil(totalJobCount / API_CONFIG.fetchLimit);
  const clampedTotalPages = Math.min(totalPagesToFetch, PAGINATION_CONFIG.maxPageSafetyLimit);

  for (let currentPageNumber = 2; currentPageNumber <= clampedTotalPages; currentPageNumber += 1) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    await delay(PAGINATION_CONFIG.pageRequestDelayInMs);

    const currentPagePayload = await fetchSinglePageWithRetry(
      { searchTerm, workplaceType, page: currentPageNumber, sortBy, sortOrder },
      signal,
    );

    const currentPageJobs = extractJobsFromPayload(currentPagePayload);

    if (currentPageJobs.length === 0) {
      break;
    }

    collectJobs(currentPageJobs);
    reportProgress();
  }

  return [...collectedJobsById.values()];
};