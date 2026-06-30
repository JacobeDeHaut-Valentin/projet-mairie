import { load, save } from './storage.js';
import { groups, getGroupName } from './groups.js';

const KEY = 'mairie.notes';

export function renderNotes(container) {
  let notes = load(KEY, []).map(normalizeNote);
  let openId = null;
  let editingId = null;

  let filters = {
    group: 'all',
    search: '',
    favoritesOnly: false
  };

  container.innerHTML = `
    <h2>Notes</h2>

    <div class="page-toolbar">
      <input id="searchNotes" type="text" placeholder="Rechercher dans les notes...">

      <select id="filterGroup">
        <option value="all">Toutes les commissions</option>
        ${groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
      </select>

      <label class="check-inline">
        <input type="checkbox" id="favoritesOnly">
        <span>Favoris seulement</span>
      </label>
    </div>

    <div id="noteList" class="compact-list"></div>

    <button class="fab" id="openModal" title="Nouvelle note">+</button>

    <div class="modal hidden" id="noteModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Nouvelle note</h3>
          <button class="modal-close" id="closeModal">Fermer</button>
        </div>

        <div class="inline-edit">
          <div>
            <label for="newTitle">Titre (optionnel)</label>
            <input id="newTitle" placeholder="Ex. Point à vérifier">
          </div>

          <div>
            <label>Commissions</label>
            <div class="checkbox-list" id="newTags">
              ${groups.map(group => `
                <label class="checkbox-pill">
                  <input type="checkbox" value="${group.id}">
                  <span>${group.name}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div>
            <label for="newContent">Contenu *</label>
            <textarea id="newContent" placeholder="Écrire une note rapide..."></textarea>
          </div>

          <div class="item-actions">
            <button class="primary" id="saveNewNote">Ajouter</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const refs = {
    list: container.querySelector('#noteList'),
    search: container.querySelector('#searchNotes'),
    filterGroup: container.querySelector('#filterGroup'),
    favoritesOnly: container.querySelector('#favoritesOnly'),
    modal: container.querySelector('#noteModal'),
    openModalBtn: container.querySelector('#openModal'),
    closeModalBtn: container.querySelector('#closeModal'),
    saveNewBtn: container.querySelector('#saveNewNote'),
    newTitle: container.querySelector('#newTitle'),
    newTags: container.querySelector('#newTags'),
    newContent: container.querySelector('#newContent')
  };

  bindEvents();
  refresh();

  function bindEvents() {
    refs.search.addEventListener('input', () => {
      filters.search = refs.search.value.trim().toLowerCase();
      refresh();
    });

    refs.filterGroup.addEventListener('change', () => {
      filters.group = refs.filterGroup.value;
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

    refs.saveNewBtn.addEventListener('click', createNote);

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
        deleteNote(id);
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
        saveEditedNote(id);
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

  function createNote() {
    const title = refs.newTitle.value.trim();
    const content = refs.newContent.value.trim();
    const tags = getCheckedValues(refs.newTags);

    if (!content) {
      alert('Merci de saisir le contenu de la note.');
      return;
    }

    const noteItem = normalizeNote({
      id: Date.now(),
      title,
      content,
      tags,
      favorite: false
    });

    notes.unshift(noteItem);
    saveAll();

    refs.modal.classList.add('hidden');
    resetCreateForm();
    openId = noteItem.id;
    refresh();
  }

  function resetCreateForm() {
    refs.newTitle.value = '';
    refs.newContent.value = '';
    refs.newTags.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.checked = false;
    });
  }

  function toggleFavorite(id) {
    notes = notes.map(item =>
      item.id === id ? { ...item, favorite: !item.favorite } : item
    );
    saveAll();
    refresh();
  }

  function deleteNote(id) {
    const item = notes.find(noteItem => noteItem.id === id);
    if (!item) return;

    const ok = confirm(`Supprimer la note « ${item.title || 'Sans titre'} » ?`);
    if (!ok) return;

    notes = notes.filter(noteItem => noteItem.id !== id);

    if (openId === id) openId = null;
    if (editingId === id) editingId = null;

    saveAll();
    refresh();
  }

  function saveEditedNote(id) {
    const card = refs.list.querySelector(`.collapsible[data-id="${id}"]`);
    if (!card) return;

    const title = card.querySelector('.edit-title').value.trim();
    const content = card.querySelector('.edit-content').value.trim();
    const selectedTags = Array.from(card.querySelectorAll('.edit-tag:checked')).map(input => input.value);

    if (!content) {
      alert('Le contenu de la note ne peut pas être vide.');
      return;
    }

    notes = notes.map(item =>
      item.id === id
        ? normalizeNote({
            ...item,
            title,
            content,
            tags: selectedTags
          })
        : item
    );

    editingId = null;
    saveAll();
    refresh();
  }

  function saveAll() {
    save(KEY, notes);
  }

  function getFilteredNotes() {
    return sortNotes(
      notes.filter(item => {
        const groupMatch =
          filters.group === 'all' || item.tags.includes(filters.group);

        const favoriteMatch =
          !filters.favoritesOnly || item.favorite;

        const searchValue = filters.search;
        const searchMatch =
          !searchValue ||
          item.title.toLowerCase().includes(searchValue) ||
          item.content.toLowerCase().includes(searchValue);

        return groupMatch && favoriteMatch && searchMatch;
      })
    );
  }

  function refresh() {
    const filtered = getFilteredNotes();

    if (!filtered.length) {
      refs.list.innerHTML = `<div class="card empty-state">Aucune note pour ces critères.</div>`;
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
            <h3 class="collapsible-title">${escapeHtml(item.title || 'Sans titre')}</h3>

            <div class="collapsible-tags">
              ${item.tags.length
                ? item.tags.map(tagId => `<span class="tag">${escapeHtml(getGroupName(tagId))}</span>`).join('')
                : `<span class="muted">Sans commission</span>`
              }
            </div>
          </div>

          <div class="collapsible-meta">
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
      <div class="item-description">${escapeHtml(item.content)}</div>

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
          <input class="edit-title" value="${escapeAttribute(item.title || '')}">
        </div>

        <div>
          <label>Commissions</label>
          <div class="checkbox-list">
            ${groups.map(group => `
              <label class="checkbox-pill">
                <input class="edit-tag" type="checkbox" value="${group.id}" ${item.tags.includes(group.id) ? 'checked' : ''}>
                <span>${group.name}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div>
          <label>Contenu</label>
          <textarea class="edit-content">${escapeHtml(item.content)}</textarea>
        </div>

        <div class="item-actions">
          <button class="primary" data-save-edit="${item.id}">Enregistrer</button>
          <button class="secondary" data-cancel-edit="${item.id}">Annuler</button>
        </div>
      </div>
    `;
  }
}

function normalizeNote(item) {
  return {
    id: Number(item.id || Date.now()),
    title: item.title || '',
    content: item.content || '',
    tags: Array.isArray(item.tags) ? item.tags : [],
    favorite: Boolean(item.favorite)
  };
}

function sortNotes(items) {
  return [...items].sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;

    const titleA = (a.title || '').toLowerCase();
    const titleB = (b.title || '').toLowerCase();
    return titleA.localeCompare(titleB);
  });
}

function getCheckedValues(root) {
  return Array.from(root.querySelectorAll('input[type="checkbox"]:checked'))
    .map(input => input.value);
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