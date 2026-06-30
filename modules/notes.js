import { groups } from './groups.js';
import { load, save, normalizeNote, normalizeEvent } from './storage.js';
import { escapeHtml, escapeAttribute, formatDate, renderTags, sortNotes, sortEvents } from './utils.js';

const KEY = 'mairie.notes';
const EVENTS_KEY = 'mairie.events';

export function renderNotes(container) {
  let notes = sortNotes(load(KEY, []).map(normalizeNote));
  let state = {
    filterGroup: 'all',
    favoritesOnly: false,
    linkedFilter: 'all'
  };

  container.innerHTML = `
    <div class="page-head">
      <div>
        <h2>Notes personnelles</h2>
        <p>V1.1 + V1.2 • multi-tags, favoris, liaison à un événement et sauvegarde directe.</p>
      </div>
      <div class="kpis">
        <div class="kpi"><div class="kpi-label">Notes</div><div class="kpi-value" id="kpiNotes">0</div></div>
        <div class="kpi"><div class="kpi-label">Liées à un événement</div><div class="kpi-value" id="kpiLinked">0</div></div>
        <div class="kpi"><div class="kpi-label">Favoris</div><div class="kpi-value" id="kpiNotesFav">0</div></div>
      </div>
    </div>

    <section class="grid grid-2">
      <div class="card">
        <h3 class="section-title">Nouvelle note rapide</h3>

        <div class="form-grid">
          <div>
            <label for="noteTitle">Titre (optionnel)</label>
            <input id="noteTitle" placeholder="Ex. Points à vérifier" />
          </div>

          <div>
            <label for="noteContent">Contenu *</label>
            <textarea id="noteContent" placeholder="Écrire une note, une idée, une question, un rappel..."></textarea>
          </div>

          <div>
            <label for="linkedEventSelect">Lier à un événement (optionnel)</label>
            <select id="linkedEventSelect"></select>
          </div>

          <div>
            <label>Commissions</label>
            <div class="checkbox-grid" id="noteTagsWrap">
              ${groups
                .map(
                  (group) => `
                    <label class="check-pill">
                      <input type="checkbox" value="${group.id}" />
                      <span>${escapeHtml(group.name)}</span>
                    </label>
                  `
                )
                .join('')}
            </div>
          </div>
        </div>

        <div class="actions">
          <button class="primary" id="addNoteBtn">Ajouter la note</button>
        </div>
        <div class="small-note">Les notes restent personnelles dans cette version locale.</div>
      </div>

      <div>
        <div class="card card-soft">
          <div class="toolbar">
            <select id="notesGroupFilter">
              <option value="all">Toutes les commissions</option>
              ${groups.map((group) => `<option value="${group.id}">${escapeHtml(group.name)}</option>`).join('')}
            </select>

            <select id="notesLinkedFilter"></select>

            <label class="check-pill">
              <input type="checkbox" id="notesFavoritesOnly" />
              <span>Favoris seulement</span>
            </label>
          </div>
          <div class="small-note">Tri : favoris d'abord, puis note la plus récemment modifiée.</div>
        </div>

        <div class="list" id="noteList"></div>
      </div>
    </section>
  `;

  const refs = {
    title: container.querySelector('#noteTitle'),
    content: container.querySelector('#noteContent'),
    linkedEvent: container.querySelector('#linkedEventSelect'),
    noteTagsWrap: container.querySelector('#noteTagsWrap'),
    addBtn: container.querySelector('#addNoteBtn'),
    filterGroup: container.querySelector('#notesGroupFilter'),
    filterLinked: container.querySelector('#notesLinkedFilter'),
    filterFavorites: container.querySelector('#notesFavoritesOnly'),
    noteList: container.querySelector('#noteList'),
    kpiNotes: container.querySelector('#kpiNotes'),
    kpiLinked: container.querySelector('#kpiLinked'),
    kpiNotesFav: container.querySelector('#kpiNotesFav')
  };

  populateEventSelects();
  bindEvents();
  refresh();

  function getEvents() {
    return sortEvents(load(EVENTS_KEY, []).map(normalizeEvent));
  }

  function populateEventSelects() {
    const events = getEvents();
    const currentNewValue = refs.linkedEvent.value;

    refs.linkedEvent.innerHTML = [
      '<option value="">Aucun événement lié</option>',
      ...events.map((eventItem) => `<option value="${eventItem.id}">${escapeHtml(eventItem.title)} — ${escapeHtml(formatDate(eventItem.date))}</option>`)
    ].join('');
    refs.linkedEvent.value = currentNewValue;

    refs.filterLinked.innerHTML = [
      '<option value="all">Tous les événements liés</option>',
      '<option value="none">Sans événement lié</option>',
      ...events.map((eventItem) => `<option value="${eventItem.id}">${escapeHtml(eventItem.title)}</option>`)
    ].join('');
    refs.filterLinked.value = String(state.linkedFilter);
  }

  function bindEvents() {
    refs.addBtn.addEventListener('click', addNote);

    refs.filterGroup.addEventListener('change', () => {
      state.filterGroup = refs.filterGroup.value;
      refresh();
    });

    refs.filterLinked.addEventListener('change', () => {
      state.linkedFilter = refs.filterLinked.value;
      refresh();
    });

    refs.filterFavorites.addEventListener('change', () => {
      state.favoritesOnly = refs.filterFavorites.checked;
      refresh();
    });

    refs.noteList.addEventListener('click', (event) => {
      const favoriteBtn = event.target.closest('[data-favorite-id]');
      if (favoriteBtn) {
        toggleFavorite(Number(favoriteBtn.dataset.favoriteId));
        return;
      }

      const saveBtn = event.target.closest('[data-save-id]');
      if (saveBtn) {
        saveNoteFromCard(Number(saveBtn.dataset.saveId));
        return;
      }

      const deleteBtn = event.target.closest('[data-delete-id]');
      if (deleteBtn) {
        removeNote(Number(deleteBtn.dataset.deleteId));
      }
    });
  }

  function getSelectedTagsFromForm() {
    return Array.from(refs.noteTagsWrap.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);
  }

  function addNote() {
    const title = refs.title.value.trim();
    const content = refs.content.value.trim();
    const tags = getSelectedTagsFromForm();
    const linkedEventId = refs.linkedEvent.value ? Number(refs.linkedEvent.value) : null;

    if (!content) {
      alert('Merci de saisir le contenu de la note.');
      return;
    }

    const now = new Date().toISOString();

    notes.unshift(
      normalizeNote({
        id: Date.now(),
        title,
        content,
        tags,
        linkedEventId,
        favorite: false,
        createdAt: now,
        updatedAt: now
      })
    );

    notes = sortNotes(notes);
    save(KEY, notes);

    refs.title.value = '';
    refs.content.value = '';
    refs.linkedEvent.value = '';
    refs.noteTagsWrap.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.checked = false;
    });

    refresh();
  }

  function toggleFavorite(id) {
    const now = new Date().toISOString();
    notes = sortNotes(
      notes.map((item) => (item.id === id ? { ...item, favorite: !item.favorite, updatedAt: now } : item))
    );
    save(KEY, notes);
    refresh();
  }

  function saveNoteFromCard(id) {
    const card = refs.noteList.querySelector(`[data-note-id="${id}"]`);
    if (!card) return;

    const title = card.querySelector('.note-edit-title').value.trim();
    const content = card.querySelector('.note-edit-content').value.trim();
    const linkedEventId = card.querySelector('.note-edit-linked').value ? Number(card.querySelector('.note-edit-linked').value) : null;
    const tags = Array.from(card.querySelectorAll('.note-edit-tag:checked')).map((input) => input.value);

    if (!content) {
      alert('Le contenu de la note ne peut pas être vide.');
      return;
    }

    notes = sortNotes(
      notes.map((item) =>
        item.id === id
          ? normalizeNote({
              ...item,
              title,
              content,
              linkedEventId,
              tags,
              updatedAt: new Date().toISOString()
            })
          : item
      )
    );

    save(KEY, notes);
    refresh();
  }

  function removeNote(id) {
    const item = notes.find((note) => note.id === id);
    if (!item) return;

    const confirmed = confirm(`Supprimer la note « ${item.title || 'Sans titre'} » ?`);
    if (!confirmed) return;

    notes = notes.filter((note) => note.id !== id);
    save(KEY, notes);
    refresh();
  }

  function getLinkedEventLabel(id) {
    if (!id) return 'Aucun événement lié';
    const eventItem = getEvents().find((item) => item.id === id);
    return eventItem ? `${eventItem.title} (${formatDate(eventItem.date)})` : 'Événement supprimé';
  }

  function getFilteredNotes() {
    return sortNotes(
      notes.filter((item) => {
        const groupMatch = state.filterGroup === 'all' || item.tags.includes(state.filterGroup);
        const favoriteMatch = !state.favoritesOnly || item.favorite;
        const linkedMatch =
          state.linkedFilter === 'all'
            ? true
            : state.linkedFilter === 'none'
              ? !item.linkedEventId
              : item.linkedEventId === Number(state.linkedFilter);

        return groupMatch && favoriteMatch && linkedMatch;
      })
    );
  }

  function renderCard(item) {
    const events = getEvents();
    return `
      <article class="card item-card ${item.favorite ? 'favorite' : ''}" data-note-id="${item.id}">
        <div class="item-top">
          <div>
            <h3 class="item-title">${escapeHtml(item.title || 'Note sans titre')}</h3>
            <div class="meta-row">
              <span class="meta">Liée à : ${escapeHtml(getLinkedEventLabel(item.linkedEventId))}</span>
              <span class="meta">Mis à jour : ${escapeHtml(new Date(item.updatedAt).toLocaleString('fr-FR'))}</span>
            </div>
          </div>
          <button class="icon-btn ${item.favorite ? 'active-star' : ''}" data-favorite-id="${item.id}" title="Basculer favori">
            ${item.favorite ? '⭐' : '☆'}
          </button>
        </div>

        <div class="note-editor">
          <div class="note-row note-row-2">
            <div>
              <label>Titre</label>
              <input class="note-edit-title" value="${escapeAttribute(item.title || '')}" />
            </div>
            <div>
              <label>Événement lié</label>
              <select class="note-edit-linked">
                <option value="">Aucun événement lié</option>
                ${events
                  .map(
                    (eventItem) => `<option value="${eventItem.id}" ${eventItem.id === item.linkedEventId ? 'selected' : ''}>${escapeHtml(eventItem.title)} — ${escapeHtml(formatDate(eventItem.date))}</option>`
                  )
                  .join('')}
              </select>
            </div>
          </div>

          <div>
            <label>Contenu</label>
            <textarea class="note-edit-content">${escapeHtml(item.content)}</textarea>
          </div>

          <div>
            <label>Commissions</label>
            <div class="checkbox-grid">
              ${groups
                .map(
                  (group) => `
                    <label class="check-pill">
                      <input class="note-edit-tag" type="checkbox" value="${group.id}" ${item.tags.includes(group.id) ? 'checked' : ''} />
                      <span>${escapeHtml(group.name)}</span>
                    </label>
                  `
                )
                .join('')}
            </div>
          </div>
        </div>

        <div>${renderTags(item.tags || [])}</div>

        <div class="actions">
          <button class="primary" data-save-id="${item.id}">Sauvegarder</button>
          <button class="danger" data-delete-id="${item.id}">Supprimer</button>
        </div>
      </article>
    `;
  }

  function refresh() {
    populateEventSelects();
    const filtered = getFilteredNotes();

    refs.kpiNotes.textContent = String(notes.length);
    refs.kpiLinked.textContent = String(notes.filter((item) => item.linkedEventId).length);
    refs.kpiNotesFav.textContent = String(notes.filter((item) => item.favorite).length);

    if (!filtered.length) {
      refs.noteList.innerHTML = `<div class="card empty">Aucune note pour ce filtre.</div>`;
      return;
    }

    refs.noteList.innerHTML = filtered.map(renderCard).join('');
  }
}
