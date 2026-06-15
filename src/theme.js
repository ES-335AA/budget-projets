// Thèmes de l'app. Objet extensible : un seul thème pour l'instant.
export const THEMES = {
  'bleu-vert': {
    name: 'Indigo & vert d\'eau',
    primary: '#5A5F85', // indigo poudré, pointe de violet doux
    secondary: '#A8D4C6', // vert d'eau pâle
    secondaryDeep: '#6DAFA0', // vert d'eau soutenu pour le €
    light: '#E3EDE8',
    surface: '#FAFAFA', // blanc net inchangé
    fabCream: '#FFFFFF', // FAB
    muted: '#9A9489', // gris infos secondaires
    rule: '#E7E7E2', // trait fin principal
    ruleSoft: '#F1F1ED', // trait fin léger (entre postes)
    inputLine: '#DCDCD6',
  },
};

export const DEFAULT_THEME = 'bleu-vert';

// Couleur du dépassement (rouge doux), commune à tous les thèmes.
export const OVERSPEND = '#C2706A';

// Applique un thème sous forme de variables CSS sur :root.
export function applyTheme(key = DEFAULT_THEME) {
  const t = THEMES[key] || THEMES[DEFAULT_THEME];
  const root = document.documentElement;
  root.style.setProperty('--primary', t.primary);
  root.style.setProperty('--secondary', t.secondary);
  root.style.setProperty('--secondary-deep', t.secondaryDeep);
  root.style.setProperty('--light', t.light);
  root.style.setProperty('--surface', t.surface);
  root.style.setProperty('--fab-cream', t.fabCream);
  root.style.setProperty('--muted', t.muted);
  root.style.setProperty('--rule', t.rule);
  root.style.setProperty('--rule-soft', t.ruleSoft);
  root.style.setProperty('--input-line', t.inputLine);
  root.style.setProperty('--overspend', OVERSPEND);
  return t;
}
