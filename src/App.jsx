import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { applyTheme } from './theme.js';
import { loadState, saveState } from './storage.js';
import {
  analyzePoste,
  categorieLabel,
  CATEGORIES,
  computeTotals,
  fmtDateShort,
  fmtMoney,
  fmtRange,
  newPosteId,
  nextStatut,
  sortPostes,
  STATUT_LABELS,
  todayISO,
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
  const statut = a.hasEch && a.restants === 0 ? 'paye' : a.hasEch ? 'reserve' : p.statut;
  const isPaye = statut === 'paye';
  const range = fmtRange(p.du, p.au);
  const meta = range
    ? `${categorieLabel(p.categorie)} · ${range}`
    : categorieLabel(p.categorie);
  return { a, isPaye, meta, statut };
}

// Pastille de statut, tapable pour avancer le statut d'un cran.
function StatusPastille({ statut, onClick }) {
  return (
    <button
      type="button"
      className={`pastille pastille--${statut}`}
      onClick={onClick}
      aria-label={`Statut : ${STATUT_LABELS[statut]} · changer`}
    >
      {statut === 'paye' && <span className="pastille__check">✓</span>}
    </button>
  );
}

// Ligne de poste : pastille (cycle statut) + corps tapable (édition) + chevron.
function PosteRow({ p, money, onCycle, onEdit }) {
  const { a, isPaye, meta, statut } = derivePoste(p);
  return (
    <div className={`poste${isPaye ? ' poste--paye' : ''}`}>
      <StatusPastille statut={statut} onClick={() => (a.hasEch ? onEdit(p) : onCycle(p.id))} />
      <button type="button" className="poste__body" onClick={() => onEdit(p)}>
        <span className="poste__left">
          <span className="poste__titre">{p.titre}</span>
          <span className="poste__meta">{meta}</span>
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
        <span className="poste__chevron" aria-hidden="true">›</span>
      </button>
    </div>
  );
}

// Choix en « grammaire fine » : libellés tapables séparés par ·, actif en gras.
function ChoiceRow({ value, options, onChange }) {
  return (
    <div className="choice">
      {options.map((opt, i) => (
        <Fragment key={opt.value}>
          {i > 0 && <span className="choice__sep">·</span>}
          <button
            type="button"
            className={`choice__opt${opt.value === value ? ' choice__opt--active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </button>
        </Fragment>
      ))}
    </div>
  );
}

const STATUT_OPTIONS = [
  { value: 'areserver', label: 'À réserver' },
  { value: 'reserve', label: 'Réservé' },
  { value: 'paye', label: 'Payé' },
];

const CATEGORIE_OPTIONS = CATEGORIES.map((c) => ({
  value: c,
  label: categorieLabel(c),
}));

function newEcheanceId() {
  return `e-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function moneyInputToNumber(value) {
  const raw = String(value ?? '').trim().replace(',', '.');
  if (raw === '') return 0;
  const n = Number(raw);
  return Number.isNaN(n) ? 0 : n;
}

function normalizeEcheances(echeances) {
  if (!Array.isArray(echeances) || echeances.length === 0) return null;
  return echeances.map((e) => ({
    id: e.id,
    montant: moneyInputToNumber(e.montant),
    date: e.date || null,
    paye: !!e.paye,
  }));
}

function deriveEcheanceStatut(echeances) {
  return echeances.length > 0 && echeances.every((e) => e.paye) ? 'paye' : 'reserve';
}

// Bottom sheet de création / édition d'un poste.
function PosteSheet({ poste, onClose, onSave, onDelete }) {
  const isEdit = !!poste;
  const [titre, setTitre] = useState(poste?.titre ?? '');
  const [prix, setPrix] = useState(poste?.prix == null ? '' : String(poste.prix));
  const [statut, setStatut] = useState(poste?.statut ?? 'areserver');
  const [categorie, setCategorie] = useState(poste?.categorie ?? 'Hebergement');
  const [du, setDu] = useState(poste?.du ?? '');
  const [au, setAu] = useState(poste?.au ?? '');
  const [notes, setNotes] = useState(poste?.notes ?? '');
  const [lien, setLien] = useState(poste?.lien ?? '');
  const [showNotes, setShowNotes] = useState(() => !!(poste?.notes ?? '').trim());
  const [showLien, setShowLien] = useState(() => !!(poste?.lien ?? '').trim());
  const [echeances, setEcheances] = useState(() => {
    if (!Array.isArray(poste?.echeances) || poste.echeances.length === 0) return null;
    return poste.echeances.map((e) => ({
      ...e,
      montant: e.montant == null ? '' : String(e.montant),
      date: e.date ?? null,
    }));
  });
  const [echeancesOpen, setEcheancesOpen] = useState(true);
  const [shown, setShown] = useState(false);
  const [sheetViewportStyle, setSheetViewportStyle] = useState(null);
  const notesRef = useRef(null);
  const lienRef = useRef(null);
  const echeanceAmountRefs = useRef({});
  const focusEcheanceId = useRef(null);
  const hasEcheances = Array.isArray(echeances) && echeances.length > 0;
  const normalizedEcheances = useMemo(
    () => normalizeEcheances(echeances),
    [echeances],
  );
  const echeanceSummary = useMemo(
    () => analyzePoste({ prix: 0, statut: 'reserve', echeances: normalizedEcheances }),
    [normalizedEcheances],
  );
  const effectiveStatut = hasEcheances ? deriveEcheanceStatut(echeances) : statut;

  // Animation d'entrée : on bascule la classe après le 1er rendu.
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const scrollY = window.scrollY;
    const { style } = document.body;

    style.position = 'fixed';
    style.top = `-${scrollY}px`;
    style.left = '0';
    style.right = '0';
    style.width = '100%';

    return () => {
      style.position = '';
      style.top = '';
      style.left = '';
      style.right = '';
      style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;

    let frame = 0;
    const updateViewportStyle = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const keyboardOpen = vv.height + vv.offsetTop < window.innerHeight - 80;
        if (!keyboardOpen) {
          setSheetViewportStyle(null);
          return;
        }

        setSheetViewportStyle({
          top: `${vv.offsetTop}px`,
          bottom: 'auto',
          height: `${vv.height}px`,
          maxHeight: `${vv.height}px`,
        });
      });
    };

    updateViewportStyle();
    vv.addEventListener('resize', updateViewportStyle);
    vv.addEventListener('scroll', updateViewportStyle);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      vv.removeEventListener('resize', updateViewportStyle);
      vv.removeEventListener('scroll', updateViewportStyle);
    };
  }, []);

  useEffect(() => {
    if (!focusEcheanceId.current) return;
    const el = echeanceAmountRefs.current[focusEcheanceId.current];
    if (el) {
      setTimeout(() => {
        el.focus();
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        focusEcheanceId.current = null;
      }, 0);
    }
  }, [echeances]);

  // Glissement de sortie puis démontage.
  function close() {
    setShown(false);
    setTimeout(onClose, 250);
  }

  function centerFocusedField(e) {
    const el = e.currentTarget;
    setTimeout(() => {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 250);
  }

  function buildPayload(echeancesValue = echeances, prixValue = prix) {
    if (!titre.trim()) return;
    const raw = prixValue.trim().replace(',', '.');
    const num = raw === '' ? null : Number(raw);
    const savedEcheances = normalizeEcheances(echeancesValue);
    const savedSummary = analyzePoste({ prix: 0, statut: 'reserve', echeances: savedEcheances });
    return {
      id: poste?.id ?? null,
      titre: titre.trim(),
      prix: savedEcheances ? savedSummary.total : raw === '' || Number.isNaN(num) ? null : num,
      statut: savedEcheances ? deriveEcheanceStatut(savedEcheances) : statut,
      categorie,
      du: du || null,
      au: au || null,
      notes: notes.trim(),
      lien: lien.trim(),
      echeances: savedEcheances,
    };
  }

  function persistDraft(echeancesValue = echeances, prixValue = prix) {
    if (!isEdit || !titre.trim()) return;
    onSave(buildPayload(echeancesValue, prixValue));
  }

  function submit(e) {
    e.preventDefault();
    if (!titre.trim()) return;
    onSave(buildPayload());
    close();
  }

  function convertToEcheances() {
    const amount = prix.trim() === '' ? 0 : moneyInputToNumber(prix);
    const next = [{ id: newEcheanceId(), montant: String(amount), date: null, paye: false }];
    setEcheances(next);
    setEcheancesOpen(true);
    persistDraft(next);
  }

  function revertToSimplePrice() {
    const total = echeanceSummary.total;
    const nextPrix = String(total);
    setPrix(nextPrix);
    setEcheances(null);
    persistDraft(null, nextPrix);
  }

  function updateEcheance(id, patch) {
    if (!echeances) return;
    const next = echeances.map((e) => (e.id === id ? { ...e, ...patch } : e));
    setEcheances(next);
    persistDraft(next);
  }

  function removeEcheance(id) {
    if (!echeances) return;
    const next = echeances.filter((e) => e.id !== id);
    if (next.length === 0) {
      setPrix('0');
      setEcheances(null);
      persistDraft(null, '0');
      return;
    }
    setEcheances(next);
    persistDraft(next);
  }

  function addEcheance() {
    const id = newEcheanceId();
    focusEcheanceId.current = id;
    const next = [
      ...(echeances || []),
      { id, montant: '', date: null, paye: false },
    ];
    setEcheances(next);
    persistDraft(next);
    setEcheancesOpen(true);
  }

  function revealNotes() {
    setShowNotes(true);
    setTimeout(() => notesRef.current?.focus(), 0);
  }

  function revealLien() {
    setShowLien(true);
    setTimeout(() => lienRef.current?.focus(), 0);
  }

  return (
    <div className={`sheet-overlay${shown ? ' is-open' : ''}`} onClick={close}>
      <div
        className={`sheet${shown ? ' is-open' : ''}`}
        style={sheetViewportStyle ?? undefined}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet__head">
          <h2 className="sheet__title">{isEdit ? 'Modifier le poste' : 'Nouveau poste'}</h2>
          <button type="button" className="sheet__close" aria-label="Fermer" onClick={close}>
            ✕
          </button>
        </div>

        <form className="sheet__form" onSubmit={submit} autoComplete="off">
          <div className="sheet__body">
            <div className="field">
              <label className="field__label" htmlFor="f-titre">Titre</label>
              <input
                id="f-titre"
                name="bp-f-t"
                className="input"
                type="text"
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                onFocus={centerFocusedField}
                placeholder="Ex. Hôtel Hanoï"
                autoComplete="off"
                autoCapitalize="sentences"
                autoCorrect="off"
                autoFocus
              />
            </div>

            {!hasEcheances ? (
              <div className="field">
                <label className="field__label" htmlFor="f-prix">Prix (€) · vide = à chiffrer</label>
                <input
                  id="f-prix"
                  name="bp-f-p"
                  className="input"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={prix}
                  onChange={(e) => setPrix(e.target.value)}
                  onFocus={centerFocusedField}
                  placeholder="à chiffrer"
                  autoComplete="off"
                />
                <button type="button" className="inline-link" onClick={convertToEcheances}>
                  ＋ Payer en plusieurs fois
                </button>
              </div>
            ) : (
              <div className="field field--echeances">
                <button
                  type="button"
                  className="echeances-head"
                  onClick={() => setEcheancesOpen((open) => !open)}
                  aria-expanded={echeancesOpen}
                >
                  <span className="field__label">Échéances</span>
                  <span className={`echeances-head__chevron${echeancesOpen ? ' is-open' : ''}`}>
                    ›
                  </span>
                </button>
                <div className="echeances-summary">
                  <span>
                    <span className="echeances-summary__label">Total</span>
                    <strong className="echeances-summary__total">{fmtMoney(echeanceSummary.total)} €</strong>
                  </span>
                  <span>
                    <span className="echeances-summary__label">Versé</span>
                    <strong className="echeances-summary__paid">{fmtMoney(echeanceSummary.paid)} €</strong>
                  </span>
                  <span>
                    <span className="echeances-summary__label">Reste</span>
                    <strong className="echeances-summary__reste">{fmtMoney(echeanceSummary.reste)} €</strong>
                  </span>
                </div>

                {echeancesOpen && (
                  <div className="echeances-detail">
                    {echeances.map((e) => (
                      <div className="echeance-row" key={e.id}>
                        <button
                          type="button"
                          className={`pastille echeance-row__check${e.paye ? ' pastille--paye' : ''}`}
                          aria-label={e.paye ? 'Marquer non payé' : 'Marquer payé'}
                          onClick={() => updateEcheance(e.id, { paye: !e.paye })}
                        >
                          {e.paye && <span className="pastille__check">✓</span>}
                        </button>
                        <div className="echeance-row__fields">
                          <label className="echeance-row__amount">
                            <input
                              ref={(el) => {
                                if (el) echeanceAmountRefs.current[e.id] = el;
                                else delete echeanceAmountRefs.current[e.id];
                              }}
                              name={`bp-e-a-${e.id}`}
                              className="input echeance-row__input"
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              value={e.montant}
                              onChange={(ev) => updateEcheance(e.id, { montant: ev.target.value })}
                              onFocus={centerFocusedField}
                              autoComplete="off"
                            />
                            <span>€</span>
                          </label>
                          <input
                            name={`bp-e-d-${e.id}`}
                            className="input echeance-row__date"
                            type="date"
                            inputMode="numeric"
                            value={e.date ?? ''}
                            onChange={(ev) => updateEcheance(e.id, { date: ev.target.value || null })}
                            onFocus={centerFocusedField}
                            autoComplete="off"
                          />
                        </div>
                        <button
                          type="button"
                          className="echeance-row__delete"
                          aria-label="Supprimer cette échéance"
                          onClick={() => removeEcheance(e.id)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <button type="button" className="inline-link inline-link--secondary" onClick={addEcheance}>
                      ＋ Ajouter une échéance
                    </button>
                  </div>
                )}

                <button type="button" className="inline-link inline-link--muted" onClick={revertToSimplePrice}>
                  ← Revenir à un prix simple
                </button>
              </div>
            )}

            <div className="field">
              <span className="field__label">Statut</span>
              {hasEcheances ? (
                <div className="derived-status">{STATUT_LABELS[effectiveStatut]}</div>
              ) : (
                <ChoiceRow value={statut} options={STATUT_OPTIONS} onChange={setStatut} />
              )}
            </div>

            <div className="field">
              <span className="field__label">Catégorie</span>
              <ChoiceRow value={categorie} options={CATEGORIE_OPTIONS} onChange={setCategorie} />
            </div>

            <div className="field">
              <span className="field__label">Dates · optionnelles</span>
              <div className="field__dates">
                <div className="field__date">
                  <span className="field__sublabel">du</span>
                  <input
                    name="bp-f-d1"
                    className="input"
                    type="date"
                    inputMode="numeric"
                    value={du}
                    onChange={(e) => setDu(e.target.value)}
                    onFocus={centerFocusedField}
                    autoComplete="off"
                  />
                </div>
                <div className="field__date">
                  <span className="field__sublabel">au</span>
                  <input
                    name="bp-f-d2"
                    className="input"
                    type="date"
                    inputMode="numeric"
                    value={au}
                    onChange={(e) => setAu(e.target.value)}
                    onFocus={centerFocusedField}
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>

            {showNotes ? (
              <div className="field">
                <label className="field__label" htmlFor="f-notes">Notes · optionnel</label>
                <textarea
                  ref={notesRef}
                  id="f-notes"
                  name="bp-f-n"
                  className="input input--area"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onFocus={centerFocusedField}
                  placeholder="Remarques, références…"
                  autoComplete="off"
                  autoCorrect="off"
                />
              </div>
            ) : (
              <button type="button" className="inline-link inline-link--optional" onClick={revealNotes}>
                ＋ Ajouter une note
              </button>
            )}

            {showLien ? (
              <div className="field">
                <label className="field__label" htmlFor="f-lien">Lien · optionnel</label>
                <input
                  ref={lienRef}
                  id="f-lien"
                  name="bp-f-l"
                  className="input"
                  type="url"
                  inputMode="url"
                  value={lien}
                  onChange={(e) => setLien(e.target.value)}
                  onFocus={centerFocusedField}
                  placeholder="https://…"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
            ) : (
              <button type="button" className="inline-link inline-link--optional" onClick={revealLien}>
                ＋ Ajouter un lien
              </button>
            )}
          </div>

          <div className="sheet__foot">
            <button type="submit" className="btn-primary" disabled={!titre.trim()}>
              Enregistrer
            </button>

            {isEdit && (
              <button
                type="button"
                className="btn-delete"
                onClick={() => {
                  onDelete(poste.id);
                  close();
                }}
              >
                Supprimer ce poste
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState(() => loadState());
  const [masque, setMasque] = useState(false);
  // sheet : undefined = fermé, null = nouveau poste, objet = édition.
  const [sheet, setSheet] = useState(undefined);
  // toast : poste supprimé en attente d'annulation, ou null.
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  useEffect(() => {
    applyTheme();
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const projet = state?.projets?.[0] || null;
  const postes = useMemo(
    () => (state ? state.postes.filter((p) => p.projetId === projet?.id) : []),
    [state, projet],
  );
  const totals = useMemo(() => computeTotals(postes), [postes]);
  const sorted = useMemo(() => sortPostes(postes), [postes]);

  // Mutation centrale : applique l'updater sur la liste, persiste, recalcule.
  function updatePostes(updater) {
    setState((s) => {
      const ns = { ...s, postes: updater(s.postes) };
      saveState(ns);
      return ns;
    });
  }

  function cycleStatut(id) {
    updatePostes((ps) =>
      ps.map((p) => {
        if (p.id !== id) return p;
        if (Array.isArray(p.echeances) && p.echeances.length > 0) return p;
        const statut = nextStatut(p.statut);
        return {
          ...p,
          statut,
          datePaiement: statut === 'paye' ? todayISO() : null,
        };
      }),
    );
  }

  function savePoste(data) {
    updatePostes((ps) => {
      if (data.id) {
        return ps.map((p) => {
          if (p.id !== data.id) return p;
          const merged = { ...p, ...data };
          merged.datePaiement = Array.isArray(merged.echeances) && merged.echeances.length > 0
            ? null
            : merged.statut === 'paye' ? p.datePaiement || todayISO() : null;
          return merged;
        });
      }
      const poste = {
        ...data,
        id: newPosteId(),
        projetId: projet.id,
        datePaiement: Array.isArray(data.echeances) && data.echeances.length > 0
          ? null
          : data.statut === 'paye' ? todayISO() : null,
      };
      return [...ps, poste];
    });
  }

  function showUndoToast(poste) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(poste);
    toastTimer.current = setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 5000);
  }

  function deletePoste(id) {
    const removed = state.postes.find((p) => p.id === id);
    updatePostes((ps) => ps.filter((p) => p.id !== id));
    if (removed) showUndoToast(removed);
  }

  function undoDelete() {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = null;
    if (toast) updatePostes((ps) => [...ps, toast]);
    setToast(null);
  }

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
        {sorted.map((p) => (
          <PosteRow
            key={p.id}
            p={p}
            money={money}
            onCycle={cycleStatut}
            onEdit={(poste) => setSheet(poste)}
          />
        ))}
      </section>

      {/* 6. FAB */}
      <button
        type="button"
        className="fab"
        aria-label="Ajouter un poste"
        onClick={() => setSheet(null)}
      >
        +
      </button>

      {/* Bottom sheet création / édition */}
      {sheet !== undefined && (
        <PosteSheet
          poste={sheet}
          onClose={() => setSheet(undefined)}
          onSave={savePoste}
          onDelete={deletePoste}
        />
      )}

      {/* Toast suppression annulable */}
      {toast && (
        <div className="toast" role="status">
          <span>Poste supprimé</span>
          <span className="toast__sep">·</span>
          <button type="button" className="toast__undo" onClick={undoDelete}>
            Annuler
          </button>
        </div>
      )}
    </div>
  );
}
