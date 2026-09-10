import {
  JOB_BOARD_SOURCE,
  MAX_DESCRIPTION_LENGTH,
  WORKPLACE_TYPE_OPTIONS,
} from './config.js';

import {
  buildJobUrlWithSource,
  escapeHtml,
  formatPublishedDate,
  stripHtml,
} from './utils.js';

export const setStatusMessage = (message, kind) => {
  const statusElement = document.getElementById('status');
  statusElement.className = `status${kind ? ' ' + kind : ''}`;
  if (!message) {
    statusElement.style.display = 'none';
    statusElement.textContent = '';
    return;
  }

  statusElement.style.display = 'block';
  statusElement.textContent = message;
};

export const clearResults = () => {
  document.getElementById('list').innerHTML = '';
  document.getElementById('pagination').innerHTML = '';
};

export const renderWorkplaceTypeFilters = (activeType, onSelect) => {
  const filtersContainer = document.getElementById('filters');

  filtersContainer.innerHTML = WORKPLACE_TYPE_OPTIONS.map((option) => {
    const isActive = option.value === activeType;
    return `<button class="chip${isActive ? ' active' : ''}" `
      + `data-workplace-type="${escapeHtml(option.value)}" type="button">`
      + `${escapeHtml(option.label)}</button>`;
  }).join('');

  filtersContainer
    .querySelectorAll('button[data-workplace-type]')
    .forEach((buttonElement) => {
      buttonElement.addEventListener('click', () => {
        onSelect(buttonElement.dataset.workplaceType);
      });
    });
};

const getWorkplaceTypeLabel = (workplaceType) => {
  const matchingOption = WORKPLACE_TYPE_OPTIONS.find(
    (option) => option.value === workplaceType
  );

  if (matchingOption && matchingOption.value) {
    return matchingOption.label;
  }

  return 'Não informado';
};

const getWorkplaceTypeClass = (workplaceType) => {
  if (workplaceType === 'remote') {
    return 'card-remote';
  }

  if (workplaceType === 'hybrid') {
    return 'card-hybrid';
  }

  if (workplaceType === 'on-site') {
    return 'card-on-site';
  }
  return '';
};

const renderJobCard = (job) => {
  const description = stripHtml(job.description);
  const truncatedDescription = description.length > MAX_DESCRIPTION_LENGTH
    ? description.slice(0, MAX_DESCRIPTION_LENGTH) + '…'
    : description;

  const companyName = job.careerPageName ?? 'Empresa não informada';
  const workplaceLabel = getWorkplaceTypeLabel(job.workplaceType);
  const workplaceClass = getWorkplaceTypeClass(job.workplaceType);

  const locationText = job.city
    ? `${job.city}${job.state ? ', ' + job.state : ''}`
    : '';

  const publishedDateLabel = formatPublishedDate(job.publishedDate);
  const safeJobUrl = buildJobUrlWithSource(job.jobUrl ?? '#', JOB_BOARD_SOURCE);

  return `
    <a class="card ${workplaceClass}" href="${escapeHtml(safeJobUrl)}" target="_blank" rel="noopener noreferrer">
      <div class="bar" aria-hidden="true"></div>
      <div class="card-body">
        <h2 class="job-title">${escapeHtml(job.name ?? 'Vaga sem título')}</h2>
        <div class="meta">
          <span>${escapeHtml(companyName)}</span>
          <span>${escapeHtml(workplaceLabel)}${locationText ? ' · ' + escapeHtml(locationText) : ''}</span>
          ${publishedDateLabel ? `<span>${escapeHtml(publishedDateLabel)}</span>` : ''}
        </div>
        ${truncatedDescription ? `<p class="excerpt">${escapeHtml(truncatedDescription)}</p>` : ''}
      </div>
    </a>
  `;
};

export const renderJobs = (jobs) => {
  const listElement = document.getElementById('list');
  if (jobs.length === 0) {
    listElement.innerHTML = '';
    return;
  }
  listElement
    .innerHTML = jobs.map(renderJobCard).join('');
};

const buildPaginationPages = (currentPage, totalPages) => {
  const collectedPages = new Set([1, totalPages, currentPage]);

  for (let page = currentPage - 1; page <= currentPage + 1; page++) {
    if (page >= 1 && page <= totalPages) {
      collectedPages.add(page);
    }
  }

  const sortedPages = [...collectedPages].sort((pageA, pageB) => pageA - pageB);

  const resultPages = [];
  let previousPage = 0;

  for (const page of sortedPages) {
    if (previousPage && page - previousPage > 1) {
      resultPages.push('...');
    }

    resultPages.push(page);
    previousPage = page;
  }
  return resultPages;
};

export const renderPagination = ({ currentPage, totalPages, onPageChange }) => {
  const paginationElement = document.getElementById('pagination');

  if (totalPages <= 1) {
    paginationElement.innerHTML = '';
    return;
  }

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  let html = `<button type="button" data-page="prev" ${canGoPrevious ? '' : 'disabled'}>‹</button>`;

  for (const pageItem of buildPaginationPages(currentPage, totalPages)) {
    if (pageItem === '...') {
      html += `<span class="gap">···</span>`;
    } else {
      const isActive = pageItem === currentPage;
      html += `<button type="button" class="${isActive ? 'active' : ''}" data-page="${pageItem}">${pageItem}</button>`;
    }
  }

  html += `<button type="button" data-page="next" ${canGoNext ? '' : 'disabled'}>›</button>`;

  paginationElement.innerHTML = html;

  paginationElement
    .querySelectorAll('button[data-page]')
    .forEach((buttonElement) => {
      buttonElement.addEventListener('click', () => {
        const targetPage = buttonElement.dataset.page;
        if (targetPage === 'prev') {
          onPageChange(currentPage - 1);
        } else if (targetPage === 'next') {
          onPageChange(currentPage + 1);
        } else {
          onPageChange(parseInt(targetPage, 10));
        }
      });
    });
};