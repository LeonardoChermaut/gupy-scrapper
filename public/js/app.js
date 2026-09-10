import {
  extractJobsFromPayload,
  fetchJobsBatch,
} from './api.js';

import {
  ITEMS_PER_PAGE,
  SEARCH_DEBOUNCE_IN_MS,
  URL_PARAM_KEYS,
  WORKPLACE_TYPE_OPTIONS,
} from './config.js';

import {
  clearResults,
  renderJobs,
  renderPagination,
  renderWorkplaceTypeFilters,
  setStatusMessage,
} from './ui.js';

const appState = {
  searchTerm: '',
  workplaceType: 'remote',
  currentPage: 1,
  allJobs: [],
  isLoading: false,
};

let latestRequestId = 0;
let searchDebounceTimerId = null;
let activeAbortController = null;

const isValidWorkplaceType = (workplaceType) =>
  WORKPLACE_TYPE_OPTIONS.some((option) => option.value === workplaceType);

const readStateFromUrl = () => {
  const urlParams = new URLSearchParams(window.location.search);

  const searchTerm = urlParams.get(URL_PARAM_KEYS.searchTerm) ?? '';

  const rawWorkplaceType = urlParams.get(URL_PARAM_KEYS.workplaceType);
  const workplaceType = isValidWorkplaceType(rawWorkplaceType)
    ? rawWorkplaceType
    : 'remote';

  const rawPage = parseInt(urlParams.get(URL_PARAM_KEYS.page) ?? '1', 10);
  const currentPage = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;

  return { searchTerm, workplaceType, currentPage };
};

const writeStateToUrl = ({ shouldPushHistory = false } = {}) => {
  const urlParams = new URLSearchParams();

  if (appState.searchTerm) {
    urlParams.set(URL_PARAM_KEYS.searchTerm, appState.searchTerm);
  }
  if (appState.workplaceType) {
    urlParams.set(URL_PARAM_KEYS.workplaceType, appState.workplaceType);
  }
  if (appState.currentPage > 1) {
    urlParams.set(URL_PARAM_KEYS.page, String(appState.currentPage));
  }

  const queryString = urlParams.toString();
  const nextUrl = queryString
    ? `${window.location.pathname}?${queryString}`
    : window.location.pathname;

  const historyMethod = shouldPushHistory ? 'pushState' : 'replaceState';
  window.history[historyMethod](null, '', nextUrl);
};

const getTotalPages = () =>
  Math.max(1, Math.ceil(appState.allJobs.length / ITEMS_PER_PAGE));

const getCurrentPageJobs = () => {
  const startIndex = (appState.currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  return appState.allJobs.slice(startIndex, endIndex);
};

const renderCurrentPage = () => {
  const totalPages = getTotalPages();
  if (appState.currentPage > totalPages) {
    appState.currentPage = totalPages;
  }

  const pageJobs = getCurrentPageJobs();
  renderJobs(pageJobs);
  renderPagination({
    currentPage: appState.currentPage,
    totalPages,
    onPageChange: handlePageChange,
  });
};

const handlePageChange = (nextPage) => {
  const totalPages = getTotalPages();
  const safePage = Math.max(1, Math.min(totalPages, nextPage));

  if (safePage === appState.currentPage) {
    return;
  }

  appState.currentPage = safePage;
  writeStateToUrl({ shouldPushHistory: true });
  renderCurrentPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const loadJobs = async () => {
  if (appState.isLoading) {
    return;
  }
  appState.isLoading = true;

  if (activeAbortController) {
    activeAbortController.abort();
  }
  activeAbortController = new AbortController();
  const currentSignal = activeAbortController.signal;
  const requestId = ++latestRequestId;

  setStatusMessage('Carregando vagas...', 'loading');
  clearResults();

  try {
    const payload = await fetchJobsBatch({
      searchTerm: appState.searchTerm,
      workplaceType: appState.workplaceType,
    }, currentSignal);

    if (requestId !== latestRequestId) {
      return;
    }

    const jobs = extractJobsFromPayload(payload);
    appState.allJobs = jobs;

    if (jobs.length === 0) {
      setStatusMessage('Nenhuma vaga encontrada com esses critérios.', 'empty');
      return;
    }

    setStatusMessage('', 'loading');
    renderCurrentPage();
  } catch (error) {
    if (error.name === 'AbortError') {
      return;
    }
    if (requestId !== latestRequestId) {
      return;
    }

    const hint = location.protocol === 'file:'
      ? ' Rode `node server.js` e acesse http://localhost:3000.'
      : ' Confirme que `node server.js` está em execução (faz o proxy para o Gupy).';

    setStatusMessage(`Não foi possível carregar as vagas. ${error.message}.${hint}`, 'error');
  } finally {
    if (requestId === latestRequestId) {
      appState.isLoading = false;
    }
  }
};

const handleWorkplaceTypeSelect = (nextWorkplaceType) => {
  if (nextWorkplaceType === appState.workplaceType) {
    return;
  }
  appState.workplaceType = nextWorkplaceType;
  appState.currentPage = 1;
  writeStateToUrl({ shouldPushHistory: true });
  renderWorkplaceTypeFilters(appState.workplaceType, handleWorkplaceTypeSelect);
  loadJobs();
};

const bindSearchInput = () => {
  const searchInput = document.getElementById('search');
  searchInput.value = appState.searchTerm;

  searchInput.addEventListener('input', (event) => {
    const nextSearchTerm = event.target.value.trim();

    if (searchDebounceTimerId !== null) {
      clearTimeout(searchDebounceTimerId);
    }

    searchDebounceTimerId = setTimeout(() => {
      searchDebounceTimerId = null;
      if (nextSearchTerm === appState.searchTerm) {
        return;
      }
      appState.searchTerm = nextSearchTerm;
      appState.currentPage = 1;
      writeStateToUrl();
      loadJobs();
    }, SEARCH_DEBOUNCE_IN_MS);
  });
};

const handlePopState = () => {
  const urlState = readStateFromUrl();
  const didFiltersChange = urlState.searchTerm !== appState.searchTerm
    || urlState.workplaceType !== appState.workplaceType;

  appState.searchTerm = urlState.searchTerm;
  appState.workplaceType = urlState.workplaceType;
  appState.currentPage = urlState.currentPage;

  const searchInput = document.getElementById('search');
  if (searchInput.value !== urlState.searchTerm) {
    searchInput.value = urlState.searchTerm;
  }

  renderWorkplaceTypeFilters(appState.workplaceType, handleWorkplaceTypeSelect);

  if (didFiltersChange || appState.allJobs.length === 0) {
    loadJobs();
  } else {
    renderCurrentPage();
  }
};

const initializeApp = () => {
  const urlState = readStateFromUrl();
  appState.searchTerm = urlState.searchTerm;
  appState.workplaceType = urlState.workplaceType;
  appState.currentPage = urlState.currentPage;

  renderWorkplaceTypeFilters(appState.workplaceType, handleWorkplaceTypeSelect);
  bindSearchInput();
  writeStateToUrl();
  loadJobs();

  window.addEventListener('popstate', handlePopState);
};

initializeApp();