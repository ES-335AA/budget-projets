import { useEffect, useMemo, useState } from 'react';
import { applyTheme } from './theme.js';
import { loadState } from './storage.js';
import {
  analyzePoste,
  categorieLabel,
  computeTotals,
  fmtDateShort,
  fmtMoney,
  fmtRange,
  sortPostes,
} from './data.js';

const MASK = '••••';

function EyeIcon({ off }) {
  if (off) {
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M3 3l18 18M10.6 5.2A9.7 9.7 0 0 1 12 5c5.5 0 9 5.5 9 7a12 12 0 0 1-2.4 3M6.1 6.6C3.8 8 2 10.4 2 12c0 1.5 3.5 7 10 7 1.7 0 3.2-.4 4.5-1.1"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.6 9.7a3.4 3.4 0 0 0 4.8 4.8"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

// Grand chiffre : montant gras primary + " €" en secondary-deep (le SEUL € coloré).
function HeroAmount({ value, masque }) {
  if (masque) return <div className="hero__amount">{MASK}</div>;
  return (
    <div className="hero__amount">
      {fmtMoney(value)}
      <span className="cur">&nbsp;€</span>
    </div>
  );
}

// Libellé adaptatif sous le montant d'un poste échelonné non soldé.
function echLabel(a) {
  const when = a.prochaine && a.prochaine.date
    ? fmtDateShort(a.prochaine.date)
    : 'à venir';
  if (a.restants <= 1) return `solde · ${when}`;
  return `prochain · ${when} · ${a.restants} restants`;
}

function derivePoste(p) {
  const a = analyzePoste(p);
  const isPaye = p.statut === 'paye';
  const range = fmtRange(p.du, p.au);
  const meta = range
    ? `${categorieLabel(p.categorie)} · ${range}`
    : categorieLabel(p.categorie);
  return { a, isPaye, meta };
}

export default function App() {
  const [state] = useState(() => loadState());
  const [masque, setMasque] = useState(false);

  useEffect(() => {
    applyTheme();
  }, []);

  const projet = state?.projets?.[0] || null;
  const postes = useMemo(
    () => (state ? state.postes.filter((p) => p.projetId === projet?.id) : []),
    [state, projet],
  );
  const totals = useMemo(() => computeTotals(postes), [postes]);
  const sorted = useMemo(() => sortPostes(postes), [postes]);

  if (!projet) return null;

  // Montant masquable (avec " €").
  const money = (n) => (masque ? MASK : `${fmtMoney(n)} €`);

  const marge = projet.enveloppe !== null ? projet.enveloppe - totals.total : null;
  const projDates = fmtRange(projet.du, projet.au);

  return (
    <div className="app">
      {/* 1. En-tête */}
      <header className="header">
        <div>
          <h1 className="header__name">{projet.nom}</h1>
          {projDates && <div className="header__dates">{projDates}</div>}
        </div>
        <button
          type="button"
          className="eye-btn"
          aria-label={masque ? 'Afficher les montants' : 'Masquer les montants'}
          aria-pressed={masque}
          onClick={() => setMasque((m) => !m)}
        >
          <EyeIcon off={masque} />
        </button>
      </header>

      {/* 2. Grand chiffre */}
      <section className="hero">
        <div className="hero__label">Reste à payer</div>
        <HeroAmount value={totals.reste} masque={masque} />
        <div className="hero__sub">
          sur {masque ? MASK : `${fmtMoney(totals.total)} €`} au total
          {totals.nAChiffrer > 0 && (
            <>
              {' '}
              · + {totals.nAChiffrer} poste{totals.nAChiffrer > 1 ? 's' : ''} à chiffrer
            </>
          )}
        </div>
      </section>

      {/* 3. Ligne enveloppe */}
      {projet.enveloppe !== null && (
        <div className="enveloppe">
          Enveloppe {masque ? MASK : `${fmtMoney(projet.enveloppe)} €`} ·{' '}
          {marge >= 0 ? (
            <span className="marge-ok">
              marge {masque ? MASK : `${fmtMoney(marge)} €`}
            </span>
          ) : (
            <span className="marge-over">
              dépassement {masque ? MASK : `${fmtMoney(-marge)} €`}
            </span>
          )}
        </div>
      )}

      {/* 4. Sous-totaux */}
      <section className="subtotals">
        <div className="subtotal-row">
          <span className="subtotal-row__label">Déjà payé</span>
          <span className="subtotal-row__value">
            {money(totals.paye)}
            <span className="subtotal-row__count">({totals.nPaye})</span>
          </span>
        </div>
        <div className="subtotal-row">
          <span className="subtotal-row__label">Réservé, à payer</span>
          <span className="subtotal-row__value">
            {money(totals.resteReserve)}
            <span className="subtotal-row__count">({totals.nReserve})</span>
          </span>
        </div>
        <div className="subtotal-row">
          <span className="subtotal-row__label">À réserver</span>
          <span className="subtotal-row__value">
            {money(totals.resteAreserver)}
            <span className="subtotal-row__count">({totals.nAreserver})</span>
          </span>
        </div>
      </section>

      {/* 5. Liste postes */}
      <div className="section-title">Postes</div>
      <section>
        {sorted.map((p) => {
          const { a, isPaye, meta } = derivePoste(p);
          return (
            <button
              type="button"
              key={p.id}
              className={`poste${isPaye ? ' poste--paye' : ''}`}
              onClick={() => {}}
            >
              <span className="poste__left">
                <span className="poste__check">{isPaye ? '✓' : ''}</span>
                <span>
                  <span className="poste__titre">{p.titre}</span>
                  <span className="poste__meta">{meta}</span>
                </span>
              </span>
              <span className="poste__right">
                {a.aChiffrer ? (
                  <span className="poste__amount poste__amount--todo">à chiffrer</span>
                ) : a.hasEch && !isPaye ? (
                  <>
                    <span className="poste__amount">{money(a.reste)}</span>
                    <span className="poste__subamount">{echLabel(a)}</span>
                  </>
                ) : (
                  <span className="poste__amount">{money(p.prix)}</span>
                )}
              </span>
            </button>
          );
        })}
      </section>

      {/* 6. FAB */}
      <button type="button" className="fab" aria-label="Ajouter" onClick={() => {}}>
        +
      </button>
    </div>
  );
}
