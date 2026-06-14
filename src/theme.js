// Thèmes de l'app. Objet extensible : un seul thème pour l'instant.
export const THEMES = {
  'bleu-vert': {
    name: 'Bleu & Vert',
    primary: '#2A3950', // bleu nuit : chiffres, texte fort, FAB glyph
    secondary: '#4F9E78', // vert moyen : accents, grammaire fine
    secondaryDeep: '#2E7D5B', // vert soutenu : le € du grand chiffre, l'œil, les ✓
    light: '#CFE6D7',
    surface: '#FAFAFA', // fond blanc net
    fabCream: '#FFFFFF', // FAB
    muted: '#888273', // gris infos secondaires
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
