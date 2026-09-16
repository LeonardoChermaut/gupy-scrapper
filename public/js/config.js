export const API_CONFIG = {
  baseUrl: 'https://portal.gupy.io/api/job-search/jobs',
  fetchLimit: 100,
  localProxyPath: '/api/jobs',
  jobBoardSource: 'github_LeonardoChermaut',
  corsProxyBuilders: [
    (targetUrl) => `https://r.jina.ai/${targetUrl}`,
    (targetUrl) => `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`,
    (targetUrl) => `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
    (targetUrl) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}`,
  ],
};

export const UI_CONFIG = {
  itemsPerPage: 20,
  defaultLayoutColumns: 1,
  searchDebounceInMs: 400,
  maxDescriptionLength: 180,
  layoutColumnsKey: 'gupy-layout-columns',
};

export const PAGINATION_CONFIG = {
  maxRetryAttempts: 3,
  maxPageSafetyLimit: 100,
  pageRequestDelayInMs: 300,
};

export const SORT_OPTIONS = [
  { value: 'publishedDate', label: 'Mais recentes', order: 'desc' },
  { value: 'publishedDate', label: 'Mais antigos', order: 'asc' },
];

export const SORT_DEFAULTS = {
  sortBy: 'publishedDate',
  sortOrder: 'desc',
};

export const WORKPLACE_TYPE_OPTIONS = [
  { value: '', label: 'Todos', color: null },
  { value: 'remote', label: 'Remoto', color: 'var(--remote)' },
  { value: 'hybrid', label: 'Híbrido', color: 'var(--hybrid)' },
  { value: 'on-site', label: 'Presencial', color: 'var(--on-site)' },
];

export const URL_PARAM_KEYS = {
  searchTerm: 'searchTerm',
  workplaceType: 'workplaceType',
  page: 'page',
  sortBy: 'sortBy',
  sortOrder: 'sortOrder',
};
