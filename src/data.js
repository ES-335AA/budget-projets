// Modèle de données, logique de calcul, formatters et seed.

// ── Seed : projet Vietnam ───────────────────────────────────────────────
export const SEED = {
  projets: [
    {
      id: 'p-vietnam',
      nom: 'Vietnam été 2026',
      du: '2026-07-12',
      au: '2026-08-02',
      enveloppe: 4000,
      statut: 'actif',
      notes: '',
    },
  ],
  postes: [
    {
      id: 'po-vol-ar',
      projetId: 'p-vietnam',
      titre: 'Vol Paris–Hanoï A/R',
      categorie: 'Transport',
      du: '2026-07-12',
      au: null,
      prix: 890,
      statut: 'paye',
      datePaiement: null,
      echeances: null,
      notes: '',
      lien: '',
    },
    {
      id: 'po-hotel-hanoi',
      projetId: 'p-vietnam',
      titre: 'Hôtel Hanoï vieux quartier',
      categorie: 'Hebergement',
      du: '2026-07-12',
      au: '2026-07-15',
      prix: 180,
      statut: 'paye',
      datePaiement: null,
      echeances: null,
      notes: '',
      lien: '',
    },
    {
      id: 'po-vol-danang',
      projetId: 'p-vietnam',
      titre: 'Vol Hanoï–Da Nang',
      categorie: 'Transport',
      du: '2026-07-16',
      au: null,
      prix: 95,
      statut: 'reserve',
      datePaiement: null,
      echeances: null,
      notes: '',
      lien: '',
    },
    {
      id: 'po-resort-hoian',
      projetId: 'p-vietnam',
      titre: 'Resort Hoi An',
      categorie: 'Hebergement',
      du: '2026-07-16',
      au: '2026-07-19',
      prix: 1000,
      statut: 'reserve',
      datePaiement: null,
      echeances: [
        { id: 'e1', montant: 300, date: '2026-05-20', paye: true },
        { id: 'e2', montant: 300, date: '2026-06-15', paye: true },
        { id: 'e3', montant: 400, date: '2026-07-16', paye: false },
      ],
      notes: '',
      lien: '',
    },
    {
      id: 'po-hotel-hue',
      projetId: 'p-vietnam',
      titre: 'Hôtel Hué bord de rivière',
      categorie: 'Hebergement',
      du: '2026-07-20',
      au: '2026-07-23',
      prix: 210,
      statut: 'areserver',
      datePaiement: null,
      echeances: null,
      notes: '',
      lien: '',
    },
    {
      id: 'po-halong',
      projetId: 'p-vietnam',
      titre: "Excursion baie d'Halong",
      categorie: 'Activite',
      du: null,
      au: null,
      prix: null,
      statut: 'areserver',
      datePaiement: null,
      echeances: null,
      notes: '',
      lien: '',
    },
    {
      id: 'po-visa',
      projetId: 'p-vietnam',
      titre: 'Visa e-visa',
      categorie: 'Autre',
      du: null,
      au: null,
      prix: null,
      statut: 'areserver',
      datePaiement: null,
      echeances: null,
      notes: '',
      lien: '',
    },
  ],
};

// ── Libellés ────────────────────────────────────────────────────────────
const CATEGORIE_LABELS = {
  Hebergement: 'Hébergement',
  Transport: 'Transport',
  Activite: 'Activité',
  Autre: 'Autre',
};

export function categorieLabel(cat) {
  return CATEGORIE_LABELS[cat] || cat;
}

// Catégories sélectionnables dans le formulaire (ordre d'affichage).
export const CATEGORIES = ['Hebergement', 'Transport', 'Activite', 'Autre'];

// ── Statuts ──────────────────────────────────────────────────────────────
// Ordre du cycle au tap : À réserver → Réservé → Payé → (reboucle).
export const STATUTS = ['areserver', 'reserve', 'paye'];

export const STATUT_LABELS = {
  areserver: 'À réserver',
  reserve: 'Réservé',
  paye: 'Payé',
};

export function nextStatut(statut) {
  const i = STATUTS.indexOf(statut);
  return STATUTS[(i + 1) % STATUTS.length];
}

// ── Utilitaires CRUD ──────────────────────────────────────────────────────
// Date du jour au format 'YYYY-MM-DD' (heure locale).
export function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// Identifiant unique pour un nouveau poste.
export function newPosteId() {
  return `po-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

// ── Logique de calcul ────────────────────────────────────────────────────
// Renvoie { paid, reste, prochaine, restants, hasEch, aChiffrer }
export function analyzePoste(p) {
  const res = {
    paid: 0,
    reste: 0,
    prochaine: null,
    restants: 0, // nb d'échéances non payées
    hasEch: false,
    aChiffrer: false,
  };

  if (Array.isArray(p.echeances) && p.echeances.length > 0) {
    res.hasEch = true;
    res.paid = p.echeances
      .filter((e) => e.paye)
      .reduce((s, e) => s + (e.montant || 0), 0);
    res.reste = (p.prix || 0) - res.paid;
    // prochaine échéance non payée, date la plus proche, sans-date en dernier
    const unpaid = p.echeances.filter((e) => !e.paye);
    unpaid.sort((a, b) => {
      if (a.date && b.date) return a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
      if (a.date && !b.date) return -1;
      if (!a.date && b.date) return 1;
      return 0;
    });
    res.prochaine = unpaid[0] || null;
    res.restants = unpaid.length;
    return res;
  }

  if (p.prix === null) {
    res.aChiffrer = true;
    res.paid = 0;
    res.reste = 0; // exclu des totaux money
    return res;
  }

  res.paid = p.statut === 'paye' ? p.prix : 0;
  res.reste = p.prix - res.paid;
  return res;
}

export function computeTotals(postes) {
  let total = 0;
  let paye = 0;
  let reste = 0;
  let nPaye = 0;
  let nReserve = 0;
  let nAreserver = 0;
  let resteReserve = 0;
  let resteAreserver = 0;
  let nAChiffrer = 0;

  for (const p of postes) {
    const a = analyzePoste(p);
    if (p.prix !== null) total += p.prix;
    paye += a.paid;
    reste += a.reste;

    if (p.prix === null) nAChiffrer += 1;

    if (p.statut === 'paye') nPaye += 1;
    else if (p.statut === 'reserve') {
      nReserve += 1;
      resteReserve += a.reste;
    } else if (p.statut === 'areserver') {
      nAreserver += 1;
      resteAreserver += a.reste;
    }
  }

  return {
    total,
    paye,
    reste,
    nPaye,
    nReserve,
    nAreserver,
    resteReserve,
    resteAreserver,
    nAChiffrer,
  };
}

// Tri chronologique par `du`, postes sans date regroupés en bas.
export function sortPostes(postes) {
  return [...postes].sort((a, b) => {
    if (a.du && b.du) return a.du < b.du ? -1 : a.du > b.du ? 1 : 0;
    if (a.du && !b.du) return -1;
    if (!a.du && b.du) return 1;
    return 0;
  });
}

// ── Formatters ────────────────────────────────────────────────────────────
const MOIS = [
  'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

// Montant sans le symbole € (séparateur de milliers fr).
export function fmtMoney(n) {
  return Math.round(n || 0).toLocaleString('fr-FR');
}

// 'YYYY-MM-DD' → '12 juil.'
export function fmtDateShort(d) {
  if (!d) return '';
  const [, m, day] = d.split('-');
  const mi = parseInt(m, 10) - 1;
  return `${parseInt(day, 10)} ${MOIS[mi] || ''}`.trim();
}

// Plage de dates d'un poste/projet. '' si pas de date `du`.
export function fmtRange(du, au) {
  if (!du) return '';
  if (!au) return fmtDateShort(du);
  const [yd, md, dd] = du.split('-');
  const [ya, ma] = au.split('-');
  if (yd === ya && md === ma) {
    // même mois : on ne répète pas le mois sur la borne de gauche
    return `${parseInt(dd, 10)} – ${fmtDateShort(au)}`;
  }
  return `${fmtDateShort(du)} – ${fmtDateShort(au)}`;
}
