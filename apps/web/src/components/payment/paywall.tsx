'use client';
/**
 * Paywall — Composant mur de paiement LearnHub Djibouti
 * ======================================================
 * Affiche les 3 offres tarifaires et le formulaire de paiement Waafi/D-Money.
 *
 * Props :
 *   chapitreId      — chapitre demande (pour achat CHAPITRE)
 *   niveauId        — niveau (pour achat CLASSE, ex: 'C3')
 *   niveauNom       — nom lisible du niveau (ex: '3eme')
 *   chapitreNom     — nom du chapitre
 *   token           — JWT de l'utilisateur (null = non connecte)
 *   onAccesDebloque — callback apres paiement reussi
 */

import { useState, useEffect } from 'react';
import { rafraichirPermissionsOffline, TARIFS_DJF, TypeAcces } from '@/hooks/use-acces';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaywallProps {
  chapitreId:      string;
  niveauId:        string;
  niveauNom:       string;
  chapitreNom:     string;
  token:           string | null;
  onAccesDebloque: () => void;
  onConnexion?:    () => void; // redirige vers login si pas connecte
}

type Etape = 'offres' | 'telephone' | 'attente' | 'succes' | 'erreur';

// ─── Offres ───────────────────────────────────────────────────────────────────

interface Offre {
  type:       TypeAcces;
  titre:      string;
  prix:       number;
  description: string;
  avantages:  string[];
  couleur:    string;
  badge?:     string;
}

function getOffres(niveauNom: string, chapitreNom: string): Offre[] {
  return [
    {
      type:       'CHAPITRE',
      titre:      'Chapitre unique',
      prix:       TARIFS_DJF.CHAPITRE,
      description: `Acceder a "${chapitreNom}" uniquement`,
      avantages:   [
        'Cours complet avec exemples',
        'Exercices corriges',
        'Quiz d\'entrainement',
        'Acces permanent',
      ],
      couleur: 'blue',
    },
    {
      type:       'CLASSE',
      titre:      `Classe ${niveauNom} complete`,
      prix:       TARIFS_DJF.CLASSE,
      description: `Toutes les matieres de ${niveauNom}`,
      avantages:   [
        'Toutes les matieres debloqueees',
        'Tous les chapitres de la classe',
        'Quiz et exercices illimites',
        'Progression suivie',
        'Acces permanent',
      ],
      couleur: 'green',
      badge:   'POPULAIRE',
    },
    {
      type:       'EXAMEN',
      titre:      'Pack Examen Premium',
      prix:       TARIFS_DJF.EXAMEN,
      description: 'Preparation intensive Brevet / Bac',
      avantages:   [
        'Tout le Pack Classe inclus',
        'Annales des examens nationaux',
        'Corriges detailles',
        'Fiches de revision',
        'Simulateur d\'examen chronometre',
        'Conseils de methode',
      ],
      couleur: 'purple',
      badge:   'MEILLEURE VALEUR',
    },
  ];
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function Paywall({
  chapitreId,
  niveauId,
  niveauNom,
  chapitreNom,
  token,
  onAccesDebloque,
  onConnexion,
}: PaywallProps) {
  const offres = getOffres(niveauNom, chapitreNom);

  const [etape,         setEtape]         = useState<Etape>('offres');
  const [offreChoisie,  setOffreChoisie]  = useState<Offre | null>(null);
  const [telephone,     setTelephone]     = useState('');
  const [chargement,    setChargement]    = useState(false);
  const [erreurMsg,     setErreurMsg]     = useState('');
  const [succesMsg,     setSuccesMsg]     = useState('');
  const [pollCount,     setPollCount]     = useState(0);
  const [requestId,     setRequestId]     = useState('');
  const [transactionId, setTransactionId] = useState('');

  // ─── Polling Waafi ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (etape !== 'attente' || !requestId) return;

    const MAX_POLLS = 36; // 3 minutes x 5s
    let count = 0;

    const interval = setInterval(async () => {
      count++;
      setPollCount(count);

      if (count > MAX_POLLS) {
        clearInterval(interval);
        setEtape('erreur');
        setErreurMsg('Delai depasse. Veuillez reessayer.');
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/achats/valider`, {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:  `Bearer ${token}`,
          },
          body: JSON.stringify({
            typeAcces:     offreChoisie?.type,
            itemId:        offreChoisie?.type === 'CHAPITRE' ? chapitreId : (offreChoisie?.type === 'CLASSE' ? niveauId : 'BREVET'),
            requestId,
            transactionId,
          }),
        });

        const data = await res.json();

        if (data.success) {
          clearInterval(interval);
          // Mettre a jour les permissions offline
          if (token) await rafraichirPermissionsOffline(token);
          setSuccesMsg('Paiement confirme ! Acces debloque.');
          setEtape('succes');
        }
      } catch {
        // Continue le polling silencieusement
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [etape, requestId, transactionId, offreChoisie, chapitreId, niveauId, token]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  function choisirOffre(offre: Offre) {
    if (!token) {
      onConnexion?.();
      return;
    }
    setOffreChoisie(offre);
    setEtape('telephone');
  }

  async function lancerPaiement() {
    if (!offreChoisie || !telephone.trim()) return;
    if (!token) { onConnexion?.(); return; }

    setChargement(true);
    setErreurMsg('');

    // itemId selon le type
    const itemId =
      offreChoisie.type === 'CHAPITRE' ? chapitreId :
      offreChoisie.type === 'CLASSE'   ? niveauId   :
      'BREVET'; // TODO: detecter BREVET vs BAC selon le niveau

    try {
      const res = await fetch(`${API_BASE}/achats/initier`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({
          typeAcces:   offreChoisie.type,
          itemId,
          phoneNumber: telephone.replace(/\s+/g, ''),
          provider:    'WAAFI',
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setErreurMsg(data.message || 'Erreur lors du lancement du paiement.');
        setChargement(false);
        return;
      }

      setRequestId(data.requestId);
      setTransactionId(data.transactionId);
      setPollCount(0);
      setEtape('attente');
    } catch {
      setErreurMsg('Impossible de contacter le serveur. Verifiez votre connexion.');
    }

    setChargement(false);
  }

  async function confirmerManuellement() {
    if (!token || !offreChoisie) return;
    setChargement(true);
    setErreurMsg('');

    const itemId =
      offreChoisie.type === 'CHAPITRE' ? chapitreId :
      offreChoisie.type === 'CLASSE'   ? niveauId   : 'BREVET';

    try {
      const res = await fetch(`${API_BASE}/achats/valider`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization:  `Bearer ${token}`,
        },
        body: JSON.stringify({ typeAcces: offreChoisie.type, itemId, requestId, transactionId }),
      });
      const data = await res.json();

      if (data.success) {
        if (token) await rafraichirPermissionsOffline(token);
        setSuccesMsg('Paiement confirme ! Acces debloque.');
        setEtape('succes');
      } else {
        setErreurMsg(data.message || 'Paiement non encore confirme. Verifiez votre telephone.');
      }
    } catch {
      setErreurMsg('Erreur reseau. Reessayez dans quelques secondes.');
    }

    setChargement(false);
  }

  async function annulerPaiement() {
    if (transactionId && token) {
      try {
        await fetch(`${API_BASE}/achats/annuler`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body:    JSON.stringify({ typeAcces: offreChoisie?.type, itemId: chapitreId, transactionId }),
        });
      } catch { /* silencieux */ }
    }
    setEtape('offres');
    setRequestId('');
    setTransactionId('');
    setPollCount(0);
  }

  // ─── Rendu ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">

        {/* ─── En-tete ───────────────────────────────────────────────────── */}
        {etape !== 'succes' && (
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">🔒</div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Contenu reserve
            </h1>
            <p className="text-slate-300 text-sm max-w-md mx-auto">
              <span className="font-semibold text-white">{chapitreNom}</span> est un chapitre payant.
              Choisissez votre formule pour debloquer l'acces.
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ETAPE 1 : Choix de l'offre                                     */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {etape === 'offres' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {offres.map((offre) => (
              <OffreCard
                key={offre.type}
                offre={offre}
                onClick={() => choisirOffre(offre)}
                estConnecte={!!token}
              />
            ))}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ETAPE 2 : Saisie du numero de telephone                        */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {etape === 'telephone' && offreChoisie && (
          <div className="max-w-md mx-auto">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
              <button
                onClick={() => setEtape('offres')}
                className="text-slate-400 hover:text-white text-sm mb-4 flex items-center gap-1"
              >
                <span>←</span> Retour aux offres
              </button>

              <h2 className="text-white font-bold text-xl mb-1">Payer avec WaafiPay</h2>
              <p className="text-slate-400 text-sm mb-5">
                Salaam Bank · ZAAD · EVCPlus · SAHAL
              </p>

              {/* Recap */}
              <div className="bg-slate-700 rounded-xl p-4 mb-5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-300 text-sm">{offreChoisie.titre}</span>
                  <span className="text-white font-bold">
                    {offreChoisie.prix.toLocaleString('fr-DJ')} DJF
                  </span>
                </div>
              </div>

              <label className="block text-slate-300 text-sm font-medium mb-2">
                Numero de telephone Djibouti
              </label>
              <div className="flex gap-2 mb-2">
                <span className="bg-slate-700 border border-slate-600 text-slate-300 px-3 py-3 rounded-xl text-sm">
                  +253
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="77 XX XX XX"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="flex-1 bg-slate-700 border border-slate-600 text-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <p className="text-slate-500 text-xs mb-5">
                Un code USSD sera envoye sur ce numero pour confirmer le paiement.
              </p>

              {erreurMsg && (
                <div className="bg-red-900/40 border border-red-500 text-red-300 rounded-xl p-3 text-sm mb-4">
                  {erreurMsg}
                </div>
              )}

              <button
                onClick={lancerPaiement}
                disabled={chargement || !telephone.trim()}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition"
              >
                {chargement ? '⏳ Connexion...' : `💳 Payer ${offreChoisie.prix.toLocaleString('fr-DJ')} DJF`}
              </button>

              <p className="text-slate-500 text-xs text-center mt-3">
                Paiement securise · Sans frais supplementaires
              </p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ETAPE 3 : Attente confirmation Waafi                           */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {etape === 'attente' && (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-xl">
              <div className="text-5xl mb-4 animate-pulse">📱</div>
              <h2 className="text-white font-bold text-xl mb-2">
                Confirmez sur votre telephone
              </h2>
              <p className="text-slate-400 text-sm mb-6">
                Un message USSD a ete envoye au <strong className="text-white">{telephone}</strong>.
                Ouvrez votre appli Waafi et confirmez le paiement de{' '}
                <strong className="text-white">{offreChoisie?.prix.toLocaleString('fr-DJ')} DJF</strong>.
              </p>

              {/* Barre de progression */}
              <div className="bg-slate-700 rounded-full h-2 mb-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((pollCount / 36) * 100, 100)}%` }}
                />
              </div>
              <p className="text-slate-500 text-xs mb-6">
                Verification automatique en cours... ({Math.max(0, 36 - pollCount) * 5}s restantes)
              </p>

              {erreurMsg && (
                <div className="bg-red-900/40 border border-red-500 text-red-300 rounded-xl p-3 text-sm mb-4">
                  {erreurMsg}
                </div>
              )}

              {/* Bouton manuel apres 10s */}
              {pollCount >= 2 && (
                <button
                  onClick={confirmerManuellement}
                  disabled={chargement}
                  className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl mb-3 transition"
                >
                  {chargement ? '⏳ Verification...' : '✅ J\'ai confirme le paiement'}
                </button>
              )}

              <button
                onClick={annulerPaiement}
                className="w-full text-slate-400 hover:text-white text-sm py-2 transition"
              >
                Annuler et revenir aux offres
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ETAPE 4 : Succes                                               */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {etape === 'succes' && (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-slate-800 border border-green-500/30 rounded-2xl p-8 shadow-xl">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-white font-bold text-2xl mb-2">Acces debloque !</h2>
              <p className="text-slate-300 text-sm mb-6">
                {succesMsg} Bon apprentissage !
              </p>
              <button
                onClick={onAccesDebloque}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl transition"
              >
                Commencer le chapitre →
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ETAPE 5 : Erreur                                               */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {etape === 'erreur' && (
          <div className="max-w-md mx-auto text-center">
            <div className="bg-slate-800 border border-red-500/30 rounded-2xl p-8 shadow-xl">
              <div className="text-5xl mb-4">❌</div>
              <h2 className="text-white font-bold text-xl mb-2">Paiement echoue</h2>
              <p className="text-red-300 text-sm mb-6">{erreurMsg}</p>
              <button
                onClick={() => { setEtape('offres'); setErreurMsg(''); }}
                className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition"
              >
                Reessayer
              </button>
            </div>
          </div>
        )}

        {/* Note bas de page */}
        {etape === 'offres' && (
          <p className="text-center text-slate-500 text-xs mt-6">
            Le premier chapitre de chaque matiere est toujours gratuit.
            Paiements via WaafiPay (Salaam Bank · ZAAD · EVCPlus · SAHAL).
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Carte offre ──────────────────────────────────────────────────────────────

function OffreCard({
  offre,
  onClick,
  estConnecte,
}: {
  offre: Offre;
  onClick: () => void;
  estConnecte: boolean;
}) {
  const couleurs: Record<string, { bg: string; border: string; btn: string; badge: string }> = {
    blue:   { bg: 'bg-blue-950/40',   border: 'border-blue-500/30',   btn: 'bg-blue-600 hover:bg-blue-500',   badge: 'bg-blue-600'   },
    green:  { bg: 'bg-green-950/40',  border: 'border-green-500/30',  btn: 'bg-green-600 hover:bg-green-500',  badge: 'bg-green-600'  },
    purple: { bg: 'bg-purple-950/40', border: 'border-purple-500/30', btn: 'bg-purple-600 hover:bg-purple-500', badge: 'bg-purple-600' },
  };

  const c = couleurs[offre.couleur];

  return (
    <div className={`relative rounded-2xl border ${c.bg} ${c.border} p-5 flex flex-col`}>
      {offre.badge && (
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 ${c.badge} text-white text-xs font-bold px-3 py-1 rounded-full`}>
          {offre.badge}
        </div>
      )}

      <h3 className="text-white font-bold text-lg mb-1 mt-2">{offre.titre}</h3>
      <p className="text-slate-400 text-xs mb-4">{offre.description}</p>

      <div className="mb-5">
        <span className="text-3xl font-black text-white">
          {offre.prix.toLocaleString('fr-DJ')}
        </span>
        <span className="text-slate-400 text-sm ml-1">DJF</span>
        <p className="text-slate-500 text-xs">paiement unique · acces permanent</p>
      </div>

      <ul className="space-y-2 mb-6 flex-1">
        {offre.avantages.map((a, i) => (
          <li key={i} className="flex items-start gap-2 text-slate-300 text-xs">
            <span className="text-green-400 mt-0.5">✓</span>
            {a}
          </li>
        ))}
      </ul>

      <button
        onClick={onClick}
        className={`${c.btn} text-white font-bold py-3 rounded-xl transition w-full text-sm`}
      >
        {estConnecte ? `Choisir — ${offre.prix.toLocaleString('fr-DJ')} DJF` : 'Se connecter pour acheter'}
      </button>
    </div>
  );
}
