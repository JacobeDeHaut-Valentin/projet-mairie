import { initializeData, load } from './modules/storage.js';
import { renderAgenda } from './modules/agenda.js';
import { renderNotes } from './modules/notes.js';

const app = document.getElementById('app');

initializeData();

function setActiveTab(view) {
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
}

function render(view) {
  if (view === 'agenda') {
    renderAgenda(app);
  } else if (view === 'notes') {
    renderNotes(app);
  }

  setActiveTab(view);
}

render('agenda');

document.querySelectorAll('[data-view]').forEach((btn) => {
  btn.addEventListener('click', () => render(btn.dataset.view));
});
