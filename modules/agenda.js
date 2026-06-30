import { load, save } from './storage.js';
import { groups, getGroupName } from './groups.js';

const KEY = 'mairie.events';

export function renderAgenda(container) {
  let events = load(KEY, []);
  let openId = null;

  container.innerHTML = `
    <h2>Agenda</h2>

    <div id="eventList"></div>

    <button class="fab" id="openModal">+</button>

    <div class="modal hidden" id="modal">
      <div class="modal-content">
        <h3>Nouvel événement</h3>

        <input id="title" placeholder="Titre">
        <input id="date" type="date">

        <select id="group" multiple>
          ${groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
        </select>

        <textarea id="desc" placeholder="Description"></textarea>

        <br><br>
        <button id="save">Ajouter</button>
        <button id="close">Fermer</button>
      </div>
    </div>
  `;

  const list = container.querySelector("#eventList");
  const modal = container.querySelector("#modal");

  function refresh() {
    list.innerHTML = events.map(e => `
      <div class="card collapsible ${openId===e.id ? 'open':''}" data-id="${e.id}">
        
        <div>
          <strong>${e.title}</strong><br>
          ${(e.groups||[]).map(g => `<span class="tag">${getGroupName(g)}</span>`).join('')}
        </div>

        <div class="collapsible-content">
          📅 ${e.date || ''}
          <br><br>
          ${e.description || ''}
          <br><br>
          <button data-del="${e.id}">Supprimer</button>
        </div>

      </div>
    `).join('');
  }

  refresh();

  list.addEventListener("click", e => {
    const card = e.target.closest(".collapsible");

    if (card) {
      const id = Number(card.dataset.id);
      openId = openId === id ? null : id;
      refresh();
    }

    if (e.target.dataset.del) {
      events = events.filter(ev => ev.id !== Number(e.target.dataset.del));
      save(KEY, events);
      refresh();
    }
  });

  container.querySelector("#openModal").onclick = () => {
    modal.classList.remove("hidden");
  };

  container.querySelector("#close").onclick = () => {
    modal.classList.add("hidden");
  };

  container.querySelector("#save").onclick = () => {
    const title = container.querySelector("#title").value;
    const date = container.querySelector("#date").value;
    const desc = container.querySelector("#desc").value;

    const groupsSelected = Array.from(container.querySelector("#group").selectedOptions)
      .map(o => o.value);

    events.unshift({
      id: Date.now(),
      title,
      date,
      description: desc,
      groups: groupsSelected
    });

    save(KEY, events);
    modal.classList.add("hidden");
    refresh();
  };
}
`