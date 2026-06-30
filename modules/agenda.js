import { groups } from './groups.js';
import { load, save, normalizeEvent } from './storage.js';
import {
  escapeHtml,
  escapeAttribute,
  formatDate,
  badgeLabel,
  badgeClass,
  renderTags,
  sortEvents
} from './utils.js';

const KEY = 'mairie.events';

export function renderAgenda(container) {
  let events = sortEvents(load(KEY, []).map(normalizeEvent));
  let state = {
    editingId: null,
    groupFilter: 'all',
    visibilityFilter: 'all',
    favoritesOnly: false
  };

  container.innerHTML = `
    <div class="page-head">
      <div>
        <h2>Agenda interne</h2>
        <p>V1.1 + V1.2 • multi-commissions, visibilité, favoris, tri intelligent et édition.</p>
      </div>
      <div class="kpis">
        <div class="kpi"><div class="kpi-label">Événements</div><div class="kpi-value" id="kpiEvents">0</div></div>
        <div class="kpi"><div class="kpi-label">Publics</div><div class="kpi-value" id="kpiPublic">0</div></div>
        <div class="kpi"><div class="kpi-label">Favoris</div><div class="kpi-value" id="kpiFav">0</div></div>
      </div>
    </div>

    <section class="grid grid-2">
      <div class="card">
        <h3 class="section-title" id="agendaFormTitle">Nouvel événement</h3>

        <div class="form-grid">
          <div>
            <label for="eventTitle">Titre *</label>
            <input id="eventTitle" placeholder="Ex. Réunion commission finances" />
          </div>

          <div>
            <label for="eventDate">Date</label>
            <input id="eventDate" type="date" />
          </div>

          <div>
            <label for="eventLocation">Lieu</label>
            <input id="eventLocation" placeholder="Ex. Salle du conseil" />
          </div>

          <div>
            <label for="eventVisibility">Visibilité</label>
            <select id="eventVisibility">
              <option value="private">Privé</option>
              <option value="restricted">Restreint</option>
              <option value="public">Public</option>
            </select>
          </div>

          <div>
            <label for="eventDescription">Description</label>
            <textarea id="eventDescription" placeholder="Informations utiles, ordre du jour, contexte..."></textarea>
          </div>

          <div>
            <label>Commissions concernées</label>
            <div class="checkbox-grid" id="eventGroups">
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
          <button class="primary" id="saveEventBtn">Ajouter l'événement</button>
          <button class="secondary" id="cancelEditBtn" hidden>Annuler la modification</button>
        </div>
        <div class="status-line" id="formStatus">Astuce : un événement peut être lié à plusieurs commissions.</div>
      </div>

      <div>
        <div class="card card-soft">
          <div class="toolbar">
            <select id="agendaGroupFilter">
              <option value="all">Toutes les commissions</option>
              ${groups.map((group) => `<option value="${group.id}">${escapeHtml(group.name)}</option>`).join('')}
            </select>

            <select id="agendaVisibilityFilter">
              <option value="all">Toutes les visibilités</option>
              <option value="private">Privé</option>
              <option value="restricted">Restreint</option>
              <option value="public">Public</option>
            </select>

            <label class="check-pill">
              <input type="checkbox" id="agendaFavoritesOnly" />
              <span>Favoris seulement</span>
            </label>
          </div>
          <div class="small-note">Tri : favoris d'abord, puis date la plus proche.</div>
        </div>

        <div class="list" id="eventList"></div>
      </div>
    </section>
  `;

  const refs = {
    title: container.querySelector('#eventTitle'),
    date: container.querySelector('#eventDate'),
    location: container.querySelector('#eventLocation'),
    visibility: container.querySelector('#eventVisibility'),
    description: container.querySelector('#eventDescription'),
    groupsWrap: container.querySelector('#eventGroups'),
    formTitle: container.querySelector('#agendaFormTitle'),
    saveBtn: container.querySelector('#saveEventBtn'),
    cancelBtn: container.querySelector('#cancelEditBtn'),
    formStatus: container.querySelector('#formStatus'),
    eventList: container.querySelector('#eventList'),
    groupFilter: container.querySelector('#agendaGroupFilter'),
    visibilityFilter: container.querySelector('#agendaVisibilityFilter'),
    favoritesOnly: container.querySelector('#agendaFavoritesOnly'),
    kpiEvents: container.querySelector('#kpiEvents'),
    kpiPublic: container.querySelector('#kpiPublic'),
    kpiFav: container.querySelector('#kpiFav')
  };

  bindEvents();
  refresh();

  function bindEvents() {
    refs.saveBtn.addEventListener('click', saveFromForm);
    refs.cancelBtn.addEventListener('click', resetForm);

    refs.groupFilter.addEventListener('change', () => {
      state.groupFilter = refs.groupFilter.value;
      refresh();
    });

    refs.visibilityFilter.addEventListener('change', () => {
      state.visibilityFilter = refs.visibilityFilter.value;
      refresh();
    });

    refs.favoritesOnly.addEventListener('change', () => {
      state.favoritesOnly = refs.favoritesOnly.checked;
      refresh();
    });

    refs.eventList.addEventListener('click', (event) => {
      const favoriteBtn = event.target.closest('[data-favorite-id]');
      if (favoriteBtn) {
        toggleFavorite(Number(favoriteBtn.dataset.favoriteId));
        return;
      }

      const editBtn = event.target.closest('[data-edit-id]');
      if (editBtn) {
        startEdit(Number(editBtn.dataset.editId));
        return;
      }

      const deleteBtn = event.target.closest('[data-delete-id]');
      if (deleteBtn) {
        removeEvent(Number(deleteBtn.dataset.deleteId));
      }
    });
  }

  function getSelectedGroups() {
    return Array.from(refs.groupsWrap.querySelectorAll('input[type="checkbox"]:checked')).map((input) => input.value);
  }

  function setSelectedGroups(ids = []) {
    refs.groupsWrap.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.checked = ids.includes(input.value);
    });
  }

  function saveFromForm() {
    const title = refs.title.value.trim();
    const date = refs.date.value;
    const location = refs.location.value.trim();
    const visibility = refs.visibility.value;
    const description = refs.description.value.trim();
    const selectedGroups = getSelectedGroups();

    if (!title) {
      alert('Merci de renseigner un titre.');
      return;
    }

    if (!selectedGroups.length) {
      alert('Sélectionne au moins une commission pour tester la logique multi-commissions.');
      return;
    }

    const now = new Date().toISOString();

    if (state.editingId) {
      events = events.map((item) =>
        item.id === state.editingId
          ? normalizeEvent({
              ...item,
              title,
              date,
              location,
              visibility,
              description,
              groups: selectedGroups,
              updatedAt: now
            })
          : item
      );
    } else {
      events.unshift(
        normalizeEvent({
          id: Date.now(),
          title,
          date,
          location,
          visibility,
          description,
          groups: selectedGroups,
          favorite: false,
          createdAt: now,
          updatedAt: now
        })
      );
    }

    events = sortEvents(events);
    save(KEY, events);
    resetForm();
    refresh();
  }

  function startEdit(id) {
    const item = events.find((eventItem) => eventItem.id === id);
    if (!item) return;

    state.editingId = id;
    refs.formTitle.textContent = 'Modifier un événement';
    refs.saveBtn.textContent = 'Enregistrer les modifications';
    refs.cancelBtn.hidden = false;
    refs.formStatus.textContent = 'Mode édition actif : pense à enregistrer ou annuler.';

    refs.title.value = item.title;
    refs.date.value = item.date || '';
    refs.location.value = item.location || '';
    refs.visibility.value = item.visibility;
    refs.description.value = item.description || '';
    setSelectedGroups(item.groups || []);
    refs.title.focus();
  }

  function resetForm() {
    state.editingId = null;
    refs.formTitle.textContent = 'Nouvel événement';
    refs.saveBtn.textContent = "Ajouter l'événement";
    refs.cancelBtn.hidden = true;
    refs.formStatus.textContent = 'Astuce : un événement peut être lié à plusieurs commissions.';

    refs.title.value = '';
    refs.date.value = '';
    refs.location.value = '';
    refs.visibility.value = 'private';
    refs.description.value = '';
    setSelectedGroups([]);
  }

  function toggleFavorite(id) {
    const now = new Date().toISOString();
    events = sortEvents(
      events.map((item) =>
        item.id === id ? { ...item, favorite: !item.favorite, updatedAt: now } : item
      )
    );
    save(KEY, events);
    refresh();
  }

  function removeEvent(id) {
    const item = events.find((eventItem) => eventItem.id === id);
    if (!item) return;

    const confirmed = confirm(`Supprimer l'événement « ${item.title} » ?`);
    if (!confirmed) return;

    events = events.filter((eventItem) => eventItem.id !== id);
    save(KEY, events);

    if (state.editingId === id) resetForm();
    refresh();
  }

  function getFilteredEvents() {
    return sortEvents(
      events.filter((item) => {
        const groupMatch = state.groupFilter === 'all' || item.groups.includes(state.groupFilter);
        const visibilityMatch = state.visibilityFilter === 'all' || item.visibility === state.visibilityFilter;
        const favoriteMatch = !state.favoritesOnly || item.favorite;
        return groupMatch && visibilityMatch && favoriteMatch;
      })
    );
  }

  function refresh() {
    const filtered = getFilteredEvents();

    refs.kpiEvents.textContent = String(events.length);
    refs.kpiPublic.textContent = String(events.filter((item) => item.visibility === 'public').length);
    refs.kpiFav.textContent = String(events.filter((item) => item.favorite).length);

    if (!filtered.length) {
      refs.eventList.innerHTML = `<div class="card empty">Aucun événement pour ce filtre.</div>`;
      return;
    }

    refs.eventList.innerHTML = filtered
      .map(
        (item) => `
          <article class="card item-card ${item.favorite ? 'favorite' : ''}">
            <div class="item-top">
              <div>
                <h3 class="item-title">${escapeHtml(item.title)}</h3>
                <div class="meta-row">
                  <span class="meta">📅 ${escapeHtml(formatDate(item.date))}</span>
                  <span class="meta">📍 ${escapeHtml(item.location || 'Lieu non précisé')}</span>
                  <span class="badge ${badgeClass(item.visibility)}">${badgeLabel(item.visibility)}</span>
                </div>
              </div>
              <button class="icon-btn ${item.favorite ? 'active-star' : ''}" data-favorite-id="${item.id}" title="Basculer favori">
                ${item.favorite ? '⭐' : '☆'}
              </button>
            </div>

            <div>${renderTags(item.groups || [])}</div>

            ${item.description ? `<div class="inline-note">${escapeHtml(item.description)}</div>` : ''}

            <div class="status-line">
              <span>Mis à jour : ${escapeHtml(new Date(item.updatedAt).toLocaleString('fr-FR'))}</span>
            </div>

            <div class="actions">
              <button class="secondary" data-edit-id="${item.id}">Modifier</button>
              <button class="danger" data-delete-id="${item.id}">Supprimer</button>
            </div>
          </article>
        `
      )
      .join('');
  }
}
