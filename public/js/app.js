import {
  fetchAllJobs,
} from './api.js';

import {
  SORT_DEFAULTS,
  UI_CONFIG,
  URL_PARAM_KEYS,
  WORKPLACE_TYPE_OPTIONS
} from './config.js';

import {
  clearResults,
  initLayoutToggle,
  renderJobs,
  renderPagination,
  renderSortToggle,
  renderWorkplaceTypeFilters,
  setStatusMessage
} from './ui.js';

const appState = {
  searchTerm: '',
  workplaceType: 'remote',
  currentPage: 1,
  sortBy: SORT_DEFAULTS.sortBy,
  sortOrder: SORT_DEFAULTS.sortOrder,
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

  const sortBy = urlParams.get(URL_PARAM_KEYS.sortBy) ?? SORT_DEFAULTS.sortBy;
  const sortOrder = urlParams.get(URL_PARAM_KEYS.sortOrder) ?? SORT_DEFAULTS.sortOrder;

  return { searchTerm, workplaceType, currentPage, sortBy, sortOrder };
};

const writeStateToUrl = ({ shouldPushHistory = false } = {}) => {
  const urlParams = new URLSearchParams();

  if (appState.searchTerm) {
    urlParams.set(URL_PARAM_KEYS.searchTerm, appState.searchTerm);
  }
  if (appState.workplaceType) {
    urlParams.set(URL_PARAM_KEYS.workplaceType, appState.workplaceType);
  }
  urlParams.set(URL_PARAM_KEYS.page, String(appState.currentPage));
  urlParams.set(URL_PARAM_KEYS.sortBy, appState.sortBy);
  urlParams.set(URL_PARAM_KEYS.sortOrder, appState.sortOrder);

  const queryString = urlParams.toString();
  const nextUrl = queryString
    ? `${window.location.pathname}?${queryString}`
    : window.location.pathname;

  const historyMethod = shouldPushHistory ? 'pushState' : 'replaceState';
  window.history[historyMethod](null, '', nextUrl);
};

const getTotalPages = () =>
  Math.max(1, Math.ceil(appState.allJobs.length / UI_CONFIG.itemsPerPage));

const getCurrentPageJobs = () => {
  const startIndex = (appState.currentPage - 1) * UI_CONFIG.itemsPerPage;
  const endIndex = startIndex + UI_CONFIG.itemsPerPage;
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
  if (activeAbortController) {
    activeAbortController.abort();
  }
  activeAbortController = new AbortController();
  const currentSignal = activeAbortController.signal;
  const requestId = ++latestRequestId;

  appState.isLoading = true;
  setStatusMessage('Carregando vagas...', 'loading');
  clearResults();

  try {
    const collectedJobs = await fetchAllJobs(
      {
        searchTerm: appState.searchTerm,
        workplaceType: appState.workplaceType,
        sortBy: appState.sortBy,
        sortOrder: appState.sortOrder,
      },
      currentSignal,
      (collectedJobCount, totalJobCount) => {
        if (requestId !== latestRequestId) {
          return;
        }
        setStatusMessage(
          `Carregando vagas... ${collectedJobCount} de ${totalJobCount}`,
          'loading',
        );
      },
    );

    if (requestId !== latestRequestId) {
      return;
    }

    appState.allJobs = collectedJobs;

    if (collectedJobs.length === 0) {
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
  renderSortToggle(appState.sortOrder, handleSortToggle);
  loadJobs();
};

const handleSortToggle = (nextSortOrder) => {
  if (nextSortOrder === appState.sortOrder) {
    return;
  }

  appState.sortOrder = nextSortOrder;
  appState.currentPage = 1;
  writeStateToUrl({ shouldPushHistory: true });
  renderSortToggle(appState.sortOrder, handleSortToggle);
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
    }, UI_CONFIG.searchDebounceInMs);
  });
};

const handlePopState = () => {
  const urlState = readStateFromUrl();
  const didFiltersChange = urlState.searchTerm !== appState.searchTerm
    || urlState.workplaceType !== appState.workplaceType
    || urlState.sortOrder !== appState.sortOrder;

  appState.sortBy = urlState.sortBy;
  appState.sortOrder = urlState.sortOrder;
  appState.searchTerm = urlState.searchTerm;
  appState.currentPage = urlState.currentPage;
  appState.workplaceType = urlState.workplaceType;

  const searchInput = document.getElementById('search');
  if (searchInput.value !== urlState.searchTerm) {
    searchInput.value = urlState.searchTerm;
  }

  renderWorkplaceTypeFilters(appState.workplaceType, handleWorkplaceTypeSelect);
  renderSortToggle(appState.sortOrder, handleSortToggle);

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
  appState.sortBy = urlState.sortBy;
  appState.sortOrder = urlState.sortOrder;

  initLayoutToggle(null);

  renderWorkplaceTypeFilters(appState.workplaceType, handleWorkplaceTypeSelect);
  renderSortToggle(appState.sortOrder, handleSortToggle);
  bindSearchInput();
  writeStateToUrl();
  loadJobs();

  window.addEventListener('popstate', handlePopState);
};

initializeApp();