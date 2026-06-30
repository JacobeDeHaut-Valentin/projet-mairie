import { load, save } from './storage.js';
import { groups, getGroupName } from './groups.js';

const KEY = "events";

export function renderAgenda(container) {
  let events = load(KEY, []);

  container.innerHTML = `
    <h2>📅 Agenda</h2>

    <div class="card">
      <input id="title" placeholder="Titre">
      <input id="date" type="date">
      <select id="group">
        ${groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
      </select>
      <button class="primary" id="addEvent">Ajouter</button>
    </div>

    <div id="eventList"></div>
  `;

  function refresh() {
    const list = container.querySelector("#eventList");

    list.innerHTML = events.map(e => `
      <div class="card">
        <strong>${e.title}</strong><br>
        ${e.date}<br>
        <span class="tag">${getGroupName(e.group)}</span>
      </div>
    `).join('');
  }

  refresh();

  container.querySelector("#addEvent").onclick = () => {
    const title = container.querySelector("#title").value;
    const date = container.querySelector("#date").value;
    const group = container.querySelector("#group").value;

    events.push({
      id: Date.now(),
      title,
      date,
      group
    });

    save(KEY, events);
    refresh();
  };
}