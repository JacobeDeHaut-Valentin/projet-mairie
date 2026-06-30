import { load, save } from './storage.js';
import { groups, getGroupName } from './groups.js';

const KEY = "notes";

export function renderNotes(container) {
  let notes = load(KEY, []);
  let filter = "all";

  container.innerHTML = `
    <h2>📝 Notes</h2>

    <div class="card">
      <input id="noteTitle" placeholder="Titre (optionnel)">
      <textarea id="noteContent" placeholder="Votre note..."></textarea>
      <select id="noteTag">
        <option value="">Aucun tag</option>
        ${groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
      </select>
      <button class="primary" id="addNote">Ajouter</button>
    </div>

    <div id="filters">
      <button data-filter="all">Toutes</button>
      ${groups.map(g => `<button data-filter="${g.id}">${g.name}</button>`).join('')}
    </div>

    <div id="noteList"></div>
  `;

  function refresh() {
    const list = container.querySelector("#noteList");

    let filtered = notes.filter(n =>
      filter === "all" || n.tags.includes(filter)
    );

    list.innerHTML = filtered.map(n => `
      <div class="card">
        <input value="${n.title || ''}" data-id="${n.id}" class="editTitle"/>
        <textarea data-id="${n.id}" class="editContent">${n.content}</textarea>
        ${n.tags.map(t => `<span class="tag">${getGroupName(t)}</span>`).join('')}
        <button data-id="${n.id}" class="saveNote">💾 Sauver</button>
      </div>
    `).join('');
  }

  refresh();

  container.querySelector("#addNote").onclick = () => {
    const title = container.querySelector("#noteTitle").value;
    const content = container.querySelector("#noteContent").value;
    const tag = container.querySelector("#noteTag").value;

    notes.push({
      id: Date.now(),
      title,
      content,
      tags: tag ? [tag] : []
    });

    save(KEY, notes);
    refresh();
  };

  container.querySelectorAll("#filters button").forEach(btn => {
    btn.onclick = () => {
      filter = btn.dataset.filter;
      refresh();
    };
  });

  container.addEventListener("click", e => {
    if (e.target.classList.contains("saveNote")) {
      const id = Number(e.target.dataset.id);

      const title = container.querySelector(`.editTitle[data-id="${id}"]`).value;
      const content = container.querySelector(`.editContent[data-id="${id}"]`).value;

      notes = notes.map(n =>
        n.id === id ? { ...n, title, content } : n
      );

      save(KEY, notes);
      refresh();
    }
  });
}