import {
  JOB_BOARD_SOURCE,
  LAYOUT_COLUMNS_KEY,
  MAX_DESCRIPTION_LENGTH,
  WORKPLACE_TYPE_OPTIONS,
} from './config.js';

import {
  buildJobUrlWithSource,
  escapeHtml,
  formatPublishedDate,
  stripHtml,
} from './utils.js';

const ICON_COMPANY = '<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M6.5 1a.5.5 0 0 0-.5.5V3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 12.5 3H10V1.5a.5.5 0 0 0-.5-.5h-3zM6 2.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5V3H6V2.5zM3.5 4a.5.5 0 0 1 .5.5V6h8V4.5a.5.5 0 0 1 .5-.5h-9zM3 7v5.5a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V7H3z"/></svg>';
const ICON_TYPE = '<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/></svg>';
const ICON_LOCATION = '<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1a5 5 0 0 0-5 5c0 3.5 5 9 5 9s5-5.5 5-9a5 5 0 0 0-5-5zm0 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>';
const ICON_DATE = '<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/></svg>';

const createModalIfNeeded = () => {
  if (document.getElementById('job-modal')) {
    return;
  }

  const modal = document.createElement('div');

  modal.id = 'job-modal';
  modal.className = 'modal-overlay';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-hidden', 'true');
  modal.innerHTML = `
    <div class="modal-content">
      <button class="modal-close" aria-label="Fechar">&times;</button>
      <div class="modal-body"></div>
      <div class="modal-footer">
        <a class="modal-link" href="#" target="_blank" rel="noopener noreferrer">Abrir no Gupy &nearr;</a>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.addEventListener('click', ({ target }) => {
    if (target === modal) {
      closeJobModal();
    }
  });

  modal.querySelector('.modal-close').addEventListener('click', closeJobModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
      closeJobModal();
    }
  });
};

const renderMetaItem = (icon, text) =>
  `<span class="meta-item">${icon}${escapeHtml(text)}</span>`;

const renderMeta = (companyName, workplaceLabel, locationText, publishedDateLabel) => {
  const items = [
    renderMetaItem(ICON_COMPANY, companyName),
    renderMetaItem(ICON_TYPE, workplaceLabel),
  ];

  if (locationText) {
    items.push(renderMetaItem(ICON_LOCATION, locationText));
  }

  if (publishedDateLabel) {
    items.push(renderMetaItem(ICON_DATE, publishedDateLabel));
  }

  return `<div class="meta">${items.join('')}</div>`;
};

const formatDescription = (text) =>
  escapeHtml(stripHtml(text))
    .replace(/;\s*/g, ';\n\n')
    .replace(/\.\s*/g, '.\n')
    .replace(/:\s*/g, ':\n');

const openJobModal = (index) => {
  createModalIfNeeded();
  const job = currentJobs[parseInt(index, 10)];

  if (!job) {
    return;
  }

  const modal = document.getElementById('job-modal');
  const body = modal.querySelector('.modal-body');
  const link = modal.querySelector('.modal-link');

  const companyName = job.careerPageName ?? 'Empresa não informada';
  const workplaceLabel = getWorkplaceTypeLabel(job.workplaceType);
  const workplaceClass = getWorkplaceTypeClass(job.workplaceType);

  const locationText = job.city
    ? `${job.city}${job.state ? ', ' + job.state : ''}`
    : '';

  const publishedDateLabel = formatPublishedDate(job.publishedDate);
  const safeJobUrl = buildJobUrlWithSource(job.jobUrl ?? '#', JOB_BOARD_SOURCE);
  const fullDescription = formatDescription(job.description);

  body.className = `modal-body ${workplaceClass}`;
  body.innerHTML = `
    <h2 class="modal-title">${escapeHtml(job.name ?? 'Vaga sem título')}</h2>
    ${renderMeta(companyName, workplaceLabel, locationText, publishedDateLabel)}
    <div class="modal-description">${fullDescription}</div>
  `;
  link.href = safeJobUrl;

  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  modal.querySelector('.modal-close').focus();
};

const closeJobModal = () => {
  const modal = document.getElementById('job-modal');
  if (!modal) {
    return;
  }

  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
};

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
    const dotHtml = option.color
      ? `<span class="chip-dot" style="background:${option.color}" aria-hidden="true"></span>`
      : '';
    return `<button class="chip${isActive ? ' active' : ''}" `
      + `data-workplace-type="${escapeHtml(option.value)}" type="button">`
      + `${dotHtml}${escapeHtml(option.label)}</button>`;
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

const renderJobCard = (job, index) => {
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

  return `
    <article class="card ${workplaceClass}" data-job-index="${index}" tabindex="0" role="button" aria-expanded="false">
      <div class="bar" aria-hidden="true"></div>
      <div class="card-body">
        <h2 class="job-title">${escapeHtml(job.name ?? 'Vaga sem título')}</h2>
        ${renderMeta(companyName, workplaceLabel, locationText, publishedDateLabel)}
        <p class="excerpt">${escapeHtml(truncatedDescription)}</p>
      </div>
    </article>
  `;
};

let currentJobs = [];

export const renderJobs = (jobs) => {
  const listElement = document.getElementById('list');
  currentJobs = jobs;
  if (jobs.length === 0) {
    listElement.innerHTML = '';
    return;
  }
  listElement.innerHTML = jobs.map((job, index) => renderJobCard(job, index)).join('');

  listElement.querySelectorAll('.card[data-job-index]').forEach((card) => {
    card.addEventListener('click', () => openJobModal(card.dataset.jobIndex));
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openJobModal(card.dataset.jobIndex);
      }
    });
  });
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

export const getStoredColumns = () => {
  const stored = localStorage.getItem(LAYOUT_COLUMNS_KEY);
  if (stored === '1' || stored === '2') {
    return parseInt(stored, 10);
  }
  return 1;
};

export const setStoredColumns = (columns) =>
  localStorage.setItem(LAYOUT_COLUMNS_KEY, String(columns));

export const applyLayoutColumns = (columns) => {
  const listElement = document.getElementById('list');
  if (listElement) {
    listElement.setAttribute('data-columns', String(columns));
  }
};

export const initLayoutToggle = (onColumnsChange) => {
  const toggleContainer = document.getElementById('layoutToggle');
  if (!toggleContainer) {
    return;
  }

  const buttons = toggleContainer.querySelectorAll('.layout-btn');
  const storedColumns = getStoredColumns();

  applyLayoutColumns(storedColumns);
  updateToggleButtons(buttons, storedColumns);

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const columns = parseInt(btn.dataset.columns, 10);
      setStoredColumns(columns);
      applyLayoutColumns(columns);
      updateToggleButtons(buttons, columns);

      if (onColumnsChange) {
        onColumnsChange(columns);
      }
    });
  });
};

const updateToggleButtons = (buttons, activeColumns) => {
  buttons.forEach((btn) => {
    const isActive = parseInt(btn.dataset.columns, 10) === activeColumns;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
};