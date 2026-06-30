import { getGroupName } from './groups.js';

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('
', '&#10;');
}

export function formatDate(value) {
  if (!value) return 'Non définie';
  const date = new Date(value + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

export function badgeLabel(visibility) {
  switch (visibility) {
    case 'public':
      return 'Public';
    case 'restricted':
      return 'Restreint';
    default:
      return 'Privé';
  }
}

export function badgeClass(visibility) {
  switch (visibility) {
    case 'public':
      return 'badge-public';
    case 'restricted':
      return 'badge-restricted';
    default:
      return 'badge-private';
  }
}

export function renderTags(ids = []) {
  if (!ids.length) return '<span class="small-note">Aucune commission</span>';
  return ids.map((id) => `<span class="tag">${escapeHtml(getGroupName(id))}</span>`).join('');
}

export function sortEvents(items) {
  return [...items].sort((a, b) => {
    if (Boolean(a.favorite) !== Boolean(b.favorite)) return a.favorite ? -1 : 1;

    const aDate = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
    const bDate = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;

    if (aDate !== bDate) return aDate - bDate;

    return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
  });
}

export function sortNotes(items) {
  return [...items].sort((a, b) => {
    if (Boolean(a.favorite) !== Boolean(b.favorite)) return a.favorite ? -1 : 1;
    return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
  });
}
