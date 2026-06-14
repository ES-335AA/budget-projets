import { SEED } from './data.js';

const KEY = 'budget-projets-v1';

// Charge l'état depuis localStorage. Au 1er lancement (rien en storage),
// écrit le seed puis le renvoie.
export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Lecture storage impossible, réinitialisation au seed.', e);
  }
  saveState(SEED);
  return SEED;
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Écriture storage impossible.', e);
  }
}

// Pour plus tard (pas d'UI dans ce lot).
export function exportJSON() {
  const raw = localStorage.getItem(KEY);
  return raw || JSON.stringify(SEED);
}

export function importJSON(str) {
  const state = JSON.parse(str);
  saveState(state);
  return state;
}
