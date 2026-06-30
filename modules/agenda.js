import { load, save } from './storage.js';
import { groups, getGroupName } from './groups.js';

const KEY = 'mairie.events';

export function renderAgenda(container) {
  let events = load(KEY, []).map(normalizeEvent);
  let openId = null;
  let editingId = null;

  let filters = {
    group: 'all',
    visibility: 'all',
    favoritesOnly: false
  };

  container.innerHTML = `
    <h2>Agenda</h2>

    <div class="page-toolbar">
      <select id="filterGroup">
        <option value="all">Toutes les commissions</option>
        ${groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
      </select>

      <select id="filterVisibility">
        <option value="all">Toutes les visibilités</option>
        <option value="private">Privé</option>
        <option value="restricted">Restreint</option>
        <option value="public">Public</option>
      </select>

      <label class="check-inline">
        <input type="checkbox" id="favoritesOnly">
        <span>Favoris seulement</span>
      </label>
    </div>

    <div id="eventList" class="compact-list"></div>

    <button class="fab" id="openModal" title="Nouvel événement">+</button>

    <div class="modal hidden" id="eventModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Nouvel événement</h3>
          <button class="modal-close" id="closeModal">Fermer</button>
        </div>

        <div class="inline-edit">
          <div>
            <label for="newTitle">Titre *</label>
            <input id="newTitle" placeholder="Ex. Réunion commission finances">
          </div>

          <div class="inline-grid-2">
            <div>
              <label for="newDate">Date</label>
              <input id="newDate" type="date">
            </div>

            <div>
              <label for="newVisibility">Visibilité</label>
              <select id="newVisibility">
                <option value="private">Privé</option>
                <option value="restricted">Restreint</option>
                <option value="public">Public</option>
              </select>
            </div>
          </div>

          <div>
            <label for="newLocation">Lieu</label>
            <input id="newLocation" placeholder="Ex. Salle du conseil">
          </div>

          <div>
            <label>Commissions</label>
            <div class="checkbox-list" id="newGroups">
              ${groups.map(group => `
                <label class="checkbox-pill">
                  <input type="checkbox" value="${group.id}">
                  <span>${group.name}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div>
            <label for="newDescription">Description</label>
            <textarea id="newDescription" placeholder="Informations complémentaires..."></textarea>
          </div>

          <div class="item-actions">
            <button class="primary" id="saveNewEvent">Ajouter</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const refs = {
    list: container.querySelector('#eventList'),
    filterGroup: container.querySelector('#filterGroup'),
    filterVisibility: container.querySelector('#filterVisibility'),
    favoritesOnly: container.querySelector('#favoritesOnly'),
    modal: container.querySelector('#eventModal'),
    openModalBtn: container.querySelector('#openModal'),
    closeModalBtn: container.querySelector('#closeModal'),
    saveNewBtn: container.querySelector('#saveNewEvent'),
    newTitle: container.querySelector('#newTitle'),
    newDate: container.querySelector('#newDate'),
    newVisibility: container.querySelector('#newVisibility'),
    newLocation: container.querySelector('#newLocation'),
    newGroups: container.querySelector('#newGroups'),
    newDescription: container.querySelector('#newDescription')
  };

  bindEvents();
  refresh();

  function bindEvents() {
    refs.filterGroup.addEventListener('change', () => {
      filters.group = refs.filterGroup.value;
      refresh();
    });

    refs.filterVisibility.addEventListener('change', () => {
      filters.visibility = refs.filterVisibility.value;
      refresh();
    });

    refs.favoritesOnly.addEventListener('change', () => {
      filters.favoritesOnly = refs.favoritesOnly.checked;
      refresh();
    });

    refs.openModalBtn.addEventListener('click', () => {
      refs.modal.classList.remove('hidden');
    });

    refs.closeModalBtn.addEventListener('click', () => {
      refs.modal.classList.add('hidden');
      resetCreateForm();
    });

    refs.saveNewBtn.addEventListener('click', createEvent);

    refs.list.addEventListener('click', (event) => {
      const favoriteBtn = event.target.closest('[data-favorite]');
      if (favoriteBtn) {
        event.stopPropagation();
        const id = Number(favoriteBtn.dataset.favorite);
        toggleFavorite(id);
        return;
      }

      const deleteBtn = event.target.closest('[data-delete]');
      if (deleteBtn) {
        event.stopPropagation();
        const id = Number(deleteBtn.dataset.delete);
        deleteEvent(id);
        return;
      }

      const editBtn = event.target.closest('[data-edit]');
      if (editBtn) {
        event.stopPropagation();
        const id = Number(editBtn.dataset.edit);
        editingId = id;
        openId = id;
        refresh();
        return;
      }

      const cancelEditBtn = event.target.closest('[data-cancel-edit]');
      if (cancelEditBtn) {
        event.stopPropagation();
        editingId = null;
        refresh();
        return;
      }

      const saveEditBtn = event.target.closest('[data-save-edit]');
      if (saveEditBtn) {
        event.stopPropagation();
        const id = Number(saveEditBtn.dataset.saveEdit);
        saveEditedEvent(id);
        return;
      }

      const header = event.target.closest('.collapsible-header');
      if (header) {
        const card = header.closest('.collapsible');
        if (!card) return;

        const id = Number(card.dataset.id);
        openId = openId === id ? null : id;
        editingId = null;
        refresh();
      }
    });
  }

  function createEvent() {
    const title = refs.newTitle.value.trim();
    const date = refs.newDate.value;
    const visibility = refs.newVisibility.value;
    const location = refs.newLocation.value.trim();
    const description = refs.newDescription.value.trim();
    const selectedGroups = getCheckedValues(refs.newGroups);

    if (!title) {
      alert('Merci de renseigner un titre.');
      return;
    }

    const eventItem = normalizeEvent({
      id: Date.now(),
      title,
      date,
      visibility,
      location,
      description,
      groups: selectedGroups,
      favorite: false
    });

    events.unshift(eventItem);
    saveAll();

    refs.modal.classList.add('hidden');
    resetCreateForm();
    openId = eventItem.id;
    refresh();
  }

  function resetCreateForm() {
    refs.newTitle.value = '';
    refs.newDate.value = '';
    refs.newVisibility.value = 'private';
    refs.newLocation.value = '';
    refs.newDescription.value = '';
    refs.newGroups.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.checked = false;
    });
  }

  function toggleFavorite(id) {
    events = events.map(item =>
      item.id === id ? { ...item, favorite: !item.favorite } : item
    );
    saveAll();
    refresh();
  }

  function deleteEvent(id) {
    const item = events.find(eventItem => eventItem.id === id);
    if (!item) return;

    const ok = confirm(`Supprimer l'événement « ${item.title} » ?`);
    if (!ok) return;

    events = events.filter(eventItem => eventItem.id !== id);

    if (openId === id) openId = null;
    if (editingId === id) editingId = null;

    saveAll();
    refresh();
  }

  function saveEditedEvent(id) {
    const card = refs.list.querySelector(`.collapsible[data-id="${id}"]`);
    if (!card) return;

    const title = card.querySelector('.edit-title').value.trim();
    const date = card.querySelector('.edit-date').value;
    const visibility = card.querySelector('.edit-visibility').value;
    const location = card.querySelector('.edit-location').value.trim();
    const description = card.querySelector('.edit-description').value.trim();
    const selectedGroups = Array.from(card.querySelectorAll('.edit-group:checked')).map(input => input.value);

    if (!title) {
      alert('Le titre ne peut pas être vide.');
      return;
    }

    events = events.map(item =>
      item.id === id
        ? normalizeEvent({
            ...item,
            title,
            date,
            visibility,
            location,
            description,
            groups: selectedGroups
          })
        : item
    );

    editingId = null;
    saveAll();
    refresh();
  }

  function saveAll() {
    save(KEY, events);
  }

  function getFilteredEvents() {
    return sortEvents(
      events.filter(item => {
        const groupMatch =
          filters.group === 'all' || item.groups.includes(filters.group);

        const visibilityMatch =
          filters.visibility === 'all' || item.visibility === filters.visibility;

        const favoriteMatch =
          !filters.favoritesOnly || item.favorite;

        return groupMatch && visibilityMatch && favoriteMatch;
      })
    );
  }

  function refresh() {
    const filtered = getFilteredEvents();

    if (!filtered.length) {
      refs.list.innerHTML = `<div class="card empty-state">Aucun événement pour ces filtres.</div>`;
      return;
    }

    refs.list.innerHTML = filtered.map(item => renderCard(item)).join('');
  }

  function renderCard(item) {
    const isOpen = openId === item.id;
    const isEditing = editingId === item.id;

    return `
      <article class="card collapsible ${isOpen ? 'open' : ''} ${item.favorite ? 'favorite' : ''}" data-id="${item.id}">
        <div class="collapsible-header">
          <div class="collapsible-main">
            <h3 class="collapsible-title">${escapeHtml(item.title)}</h3>

            <div class="collapsible-tags">
              ${item.groups.length
                ? item.groups.map(groupId => `<span class="tag">${escapeHtml(getGroupName(groupId))}</span>`).join('')
                : `<span class="muted">Sans commission</span>`
              }
            </div>
          </div>

          <div class="collapsible-meta">
            <span class="badge ${getVisibilityClass(item.visibility)}">${getVisibilityLabel(item.visibility)}</span>
            <button class="icon-btn ${item.favorite ? 'favorite-on' : ''}" data-favorite="${item.id}" title="Favori">
              ${item.favorite ? '★' : '☆'}
            </button>
          </div>
        </div>

        <div class="collapsible-content">
          ${
            isEditing
              ? renderEditForm(item)
              : renderDetails(item)
          }
        </div>
      </article>
    `;
  }

  function renderDetails(item) {
    return `
      <div class="muted">📅 ${formatDate(item.date)}</div>
      <div class="muted">📍 ${escapeHtml(item.location || 'Lieu non précisé')}</div>

      ${
        item.description
          ? `<div class="item-description" style="margin-top:12px;">${escapeHtml(item.description)}</div>`
          : `<div class="muted" style="margin-top:12px;">Aucune description</div>`
      }

      <div class="item-actions">
        <button class="secondary" data-edit="${item.id}">Modifier</button>
        <button class="danger" data-delete="${item.id}">Supprimer</button>
      </div>
    `;
  }

  function renderEditForm(item) {
    return `
      <div class="inline-edit">
        <div>
          <label>Titre</label>
          <input class="edit-title" value="${escapeAttribute(item.title)}">
        </div>

        <div class="inline-grid-2">
          <div>
            <label>Date</label>
            <input class="edit-date" type="date" value="${escapeAttribute(item.date || '')}">
          </div>

          <div>
            <label>Visibilité</label>
            <select class="edit-visibility">
              <option value="private" ${item.visibility === 'private' ? 'selected' : ''}>Privé</option>
              <option value="restricted" ${item.visibility === 'restricted' ? 'selected' : ''}>Restreint</option>
              <option value="public" ${item.visibility === 'public' ? 'selected' : ''}>Public</option>
            </select>
          </div>
        </div>

        <div>
          <label>Lieu</label>
          <input class="edit-location" value="${escapeAttribute(item.location || '')}">
        </div>

        <div>
          <label>Commissions</label>
          <div class="checkbox-list">
            ${groups.map(group => `
              <label class="checkbox-pill">
                <input class="edit-group" type="checkbox" value="${group.id}" ${item.groups.includes(group.id) ? 'checked' : ''}>
                <span>${group.name}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div>
          <label>Description</label>
          <textarea class="edit-description">${escapeHtml(item.description || '')}</textarea>
        </div>

        <div class="item-actions">
          <button class="primary" data-save-edit="${item.id}">Enregistrer</button>
          <button class="secondary" data-cancel-edit="${item.id}">Annuler</button>
        </div>
      </div>
    `;
  }
}

function normalizeEvent(item) {
  return {
    id: Number(item.id || Date.now()),
    title: item.title || '',
    date: item.date || '',
    visibility: item.visibility || 'private',
    location: item.location || '',
    description: item.description || '',
    groups: Array.isArray(item.groups)
      ? item.groups
      : item.group
        ? [item.group]
        : [],
    favorite: Boolean(item.favorite)
  };
}

function sortEvents(items) {
  return [...items].sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;

    const dateA = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
    const dateB = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;

    return dateA - dateB;
  });
}

function getCheckedValues(root) {
  return Array.from(root.querySelectorAll('input[type="checkbox"]:checked'))
    .map(input => input.value);
}

function getVisibilityLabel(value) {
  if (value === 'public') return 'Public';
  if (value === 'restricted') return 'Restreint';
  return 'Privé';
}

function getVisibilityClass(value) {
  if (value === 'public') return 'badge-public';
  if (value === 'restricted') return 'badge-restricted';
  return 'badge-private';
}

function formatDate(value) {
  if (!value) return 'Date non définie';

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('\n', '&#10;');
}