import { renderAgenda } from './modules/agenda.js';
import { renderNotes } from './modules/notes.js';

const app = document.getElementById("app");

function render(view) {
  if (view === "agenda") renderAgenda(app);
  if (view === "notes") renderNotes(app);
}

render("agenda");

document.querySelectorAll("nav button").forEach(btn => {
  btn.onclick = () => render(btn.dataset.view);
});