const EVENTS_KEY = 'mairie.events';
const NOTES_KEY = 'mairie.notes';
const SEEDED_KEY = 'mairie.seeded.v1_2';

export function load(key, defaultValue) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (error) {
    console.error(`Erreur localStorage (${key})`, error);
    return defaultValue;
  }
}

export function save(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Erreur d'écriture (${key})`, error);
  }
}

export function initializeData() {
  migrateLegacyEvents();
  migrateLegacyNotes();
  seedDemoDataIfNeeded();
}

function migrateLegacyEvents() {
  const existing = load(EVENTS_KEY, []);
  const oldEvents = load('events', null);

  if (existing.length) {
    const normalized = existing.map(normalizeEvent);
    save(EVENTS_KEY, normalized);
    return;
  }

  if (!Array.isArray(oldEvents) || !oldEvents.length) return;

  save(
    EVENTS_KEY,
    oldEvents.map((item) =>
      normalizeEvent({
        ...item,
        groups: item.groups || (item.group ? [item.group] : []),
        visibility: item.visibility || 'private'
      })
    )
  );
}

function migrateLegacyNotes() {
  const existing = load(NOTES_KEY, []);
  const oldNotes = load('notes', null);

  if (existing.length) {
    const normalized = existing.map(normalizeNote);
    save(NOTES_KEY, normalized);
    return;
  }

  if (!Array.isArray(oldNotes) || !oldNotes.length) return;

  save(
    NOTES_KEY,
    oldNotes.map((item) =>
      normalizeNote({
        ...item,
        tags: Array.isArray(item.tags) ? item.tags : []
      })
    )
  );
}

function seedDemoDataIfNeeded() {
  if (localStorage.getItem(SEEDED_KEY)) return;

  const events = load(EVENTS_KEY, []);
  const notes = load(NOTES_KEY, []);

  if (!events.length) {
    save(EVENTS_KEY, [
      normalizeEvent({
        id: 1001,
        title: 'Réunion préparatoire budget',
        date: '2026-07-03',
        location: 'Salle du conseil',
        description: 'Point sur les arbitrages budgétaires et les subventions associatives.',
        groups: ['finances'],
        visibility: 'restricted',
        favorite: true
      }),
      normalizeEvent({
        id: 1002,
        title: 'Comité de suivi travaux école',
        date: '2026-07-08',
        location: 'École communale',
        description: 'Visite de chantier et arbitrage sur les équipements complémentaires.',
        groups: ['travaux', 'enfance'],
        visibility: 'private',
        favorite: false
      }),
      normalizeEvent({
        id: 1003,
        title: 'Forum numérique des habitants',
        date: '2026-07-15',
        location: 'Salle polyvalente',
        description: 'Événement public sur les usages numériques et les services en ligne.',
        groups: ['numerique'],
        visibility: 'public',
        favorite: false
      })
    ]);
  }

  if (!notes.length) {
    save(NOTES_KEY, [
      normalizeNote({
        id: 2001,
        title: 'Questions à préparer pour le budget',
        content: 'Vérifier la ligne rénovation thermique et les aides mobilisables.',
        tags: ['finances'],
        linkedEventId: 1001,
        favorite: true
      }),
      normalizeNote({
        id: 2002,
        title: 'Idées animation numérique',
        content: 'Proposer un mini-atelier “premières démarches en ligne” pour les habitants.',
        tags: ['numerique', 'action-sociale'],
        linkedEventId: 1003,
        favorite: false
      })
    ]);
  }

  localStorage.setItem(SEEDED_KEY, '1');
}

export function normalizeEvent(item = {}) {
  const now = new Date().toISOString();
  return {
    id: Number(item.id || Date.now()),
    title: item.title || '',
    date: item.date || '',
    location: item.location || '',
    description: item.description || '',
    groups: Array.isArray(item.groups) ? item.groups : [],
    visibility: ['private', 'restricted', 'public'].includes(item.visibility) ? item.visibility : 'private',
    favorite: Boolean(item.favorite),
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || item.createdAt || now
  };
}

export function normalizeNote(item = {}) {
  const now = new Date().toISOString();
  return {
    id: Number(item.id || Date.now()),
    title: item.title || '',
    content: item.content || '',
    tags: Array.isArray(item.tags) ? item.tags : [],
    linkedEventId: item.linkedEventId ? Number(item.linkedEventId) : null,
    favorite: Boolean(item.favorite),
    createdAt: item.createdAt || now,
    updatedAt: item.updatedAt || item.createdAt || now
  };
}
