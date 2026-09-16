export const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const stripHtml = (value) =>
  String(value ?? '')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const formatPublishedDate = (isoDate) => {
  if (!isoDate) {
    return '';
  }

  const parsedDate = new Date(isoDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return '';
  }

  return parsedDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const buildJobUrlWithSource = (rawJobUrl, jobBoardSource) => {
  try {
    const jobUrl = new URL(rawJobUrl);
    jobUrl.searchParams.set('jobBoardSource', jobBoardSource);

    return jobUrl.toString();
  } catch (error) {
    return rawJobUrl;
  }
};