export const API_FETCH_LIMIT = 100;
export const ITEMS_PER_PAGE = 20;
export const DEFAULT_LAYOUT_COLUMNS = 1;
export const SEARCH_DEBOUNCE_IN_MS = 400;
export const MAX_DESCRIPTION_LENGTH = 180;

export const LOCAL_PROXY_PATH = '/api/jobs';
export const JOB_BOARD_SOURCE = 'github_LeonardoChermaut';
export const LAYOUT_COLUMNS_KEY = 'gupy-layout-columns';
export const API_BASE_URL = 'https://portal.gupy.io/api/job-search/jobs';


export const URL_PARAM_KEYS = {
  searchTerm: 'searchTerm',
  workplaceType: 'workplaceType',
  page: 'page',
};

export const CORS_PROXY_BUILDERS = [
  (targetUrl) => `https://r.jina.ai/${targetUrl}`,
  (targetUrl) => `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`,
  (targetUrl) => `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
  (targetUrl) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
];

export const WORKPLACE_TYPE_OPTIONS = [
  { value: '', label: 'Todos', color: null },
  { value: 'remote', label: 'Remoto', color: 'var(--remote)' },
  { value: 'hybrid', label: 'Híbrido', color: 'var(--hybrid)' },
  { value: 'on-site', label: 'Presencial', color: 'var(--on-site)' },
];