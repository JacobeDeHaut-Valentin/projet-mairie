import { load, save } from './storage.js';
import { groups, getGroupName } from './groups.js';

const KEY = 'mairie.notes';

export function renderNotes(container) {
  let notes = load(KEY, []);
  let openId = null;

  container.innerHTML = `
    <h2>Notes</h2>

    <div id="noteList"></div>

    <button class="fab" id="openModal">+</button>

    <div class="modal hidden" id="modal">
      <div class="modal-content">
        <h3>Nouvelle note</h3>

        <input id="title" placeholder="Titre">
        <textarea id="content" placeholder="Contenu"></textarea>

        <select id="tags" multiple>
          ${groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('')}
        </select>

        <br><br>
        <button id="save">Ajouter</button>
        <button id="close">Fermer</button>
      </div>
    </div>
  `;

  const list = container.querySelector("#noteList");
  const modal = container.querySelector("#modal");

  function refresh() {
    list.innerHTML = notes.map(n => `
      <div class="card collapsible ${openId===n.id ? 'open':''}" data-id="${n.id}">
        
        <div>
          <strong>${n.title || 'Sans titre'}</strong><br>
          ${(n.tags||[]).map(t => `<span class="tag">${getGroupName(t)}</span>`).join('')}
        </div>

        <div class="collapsible-content">
          ${n.content}
          <br><br>
          <button data-del="${n.id}">Supprimer</button>
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
      notes = notes.filter(n => n.id !== Number(e.target.dataset.del));
      save(KEY, notes);
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
    const content = container.querySelector("#content").value;

    const tags = Array.from(container.querySelector("#tags").selectedOptions)
      .map(o => o.value);

    notes.unshift({
      id: Date.now(),
      title,
      content,
      tags
    });

    save(KEY, notes);
    modal.classList.add("hidden");
    refresh();
  };
}