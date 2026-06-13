'use client';

/**
 * DjiboutiPayment
 * ===============
 * Composant de paiement local pour les utilisateurs de Djibouti.
 * Supporte : WaafiPay (Salaam/ZAAD/EVCPlus) et D-Money (Djibouti Telecom)
 *
 * Flux :
 *  1. L'utilisateur choisit son operateur (Waafi ou D-Money)
 *  2. Il entre son numero de telephone
 *  3. Il recoit une notification USSD sur son telephone
 *  4. Il confirme le paiement sur son app
 *  5. La plateforme valide et donne acces au cours
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, CheckCircle, Clock, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

type Provider = 'waafi' | 'dmoney';
type Step = 'select' | 'phone' | 'waiting' | 'success' | 'error';

interface Props {
  courseId: string;
  courseTitle: string;
  amount: number;
  currency?: 'USD' | 'SLSH' | 'DJF';
  onSuccess?: () => void;
  onCancel?: () => void;
}

// ─── Providers disponibles ────────────────────────────────────────────────────

const PROVIDERS = [
  {
    id: 'waafi' as Provider,
    name: 'WaafiPay',
    logo: '🏦',
    color: 'from-green-600 to-green-700',
    border: 'border-green-200 dark:border-green-800',
    bg: 'bg-green-50 dark:bg-green-950',
    wallets: ['Salaam Bank', 'ZAAD', 'EVCPlus', 'SAHAL'],
    placeholder: '2526XXXXXXX',
    description: 'Payez avec votre wallet Salaam, ZAAD ou EVCPlus',
    available: true,
  },
  {
    id: 'dmoney' as Provider,
    name: 'D-Money',
    logo: '📱',
    color: 'from-green-600 to-green-700',
    border: 'border-green-200 dark:border-green-800',
    bg: 'bg-green-50 dark:bg-green-950',
    wallets: ['Djibouti Telecom'],
    placeholder: '77XXXXXXX',
    description: 'Payez avec votre compte D-Money Djibouti Telecom',
    available: false, // Activer quand credentials recus
  },
];

// ─── Composant principal ──────────────────────────────────────────────────────

export function DjiboutiPayment({ courseId, courseTitle, amount, currency = 'USD', onSuccess, onCancel }: Props) {
  const [step, setStep] = useState<Step>('select');
  const [provider, setProvider] = useState<Provider | null>(null);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [requestId, setRequestId] = useState('');
  const [pollCount, setPollCount] = useState(0);

  const selectedProvider = PROVIDERS.find(p => p.id === provider);

  // ─── Etape 1 : Choisir le provider ─────────────────────────────────────────

  const handleSelectProvider = (p: Provider) => {
    const prov = PROVIDERS.find(x => x.id === p);
    if (!prov?.available) return;
    setProvider(p);
    setStep('phone');
  };

  // ─── Etape 2 : Envoyer la demande de paiement ──────────────────────────────

  const handleInitiate = async () => {
    if (!phone.trim() || phone.length < 8) {
      setError('Entrez un numero de telephone valide');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const endpoint = provider === 'waafi'
        ? '/payments/djibouti/waafi/initiate'
        : '/payments/djibouti/dmoney/initiate';

      const res = await api.post(endpoint, {
        courseId,
        phoneNumber: phone.trim(),
        amount,
        currency: provider === 'dmoney' ? 'DJF' : currency,
      });

      const data = res.data?.data || res.data;

      if (data?.success || data?.status === 'forApproval' || data?.status === 'APPROVED') {
        setTransactionId(data.transactionId || '');
        setRequestId(data.requestId || '');

        if (data.status === 'APPROVED') {
          // Paiement immediat (rare en sandbox)
          await handleCommit(data.transactionId, data.requestId);
        } else {
          // Attendre confirmation telephone
          setStep('waiting');
          startPolling(data.transactionId, data.requestId);
        }
      } else {
        setError(data?.message || 'Echec de la demande de paiement.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Erreur de connexion. Reessayez.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Etape 3 : Valider apres confirmation telephone ────────────────────────

  const handleCommit = async (txId: string, reqId: string) => {
    try {
      const res = await api.post('/payments/djibouti/waafi/commit', {
        courseId,
        transactionId: txId,
        requestId: reqId,
      });

      const data = res.data?.data || res.data;
      if (data?.success) {
        setStep('success');
        onSuccess?.();
      } else {
        setStep('error');
        setError(data?.message || 'Validation echouee.');
      }
    } catch {
      setStep('error');
      setError('Erreur lors de la validation. Contactez le support.');
    }
  };

  // ─── Polling : verification periodique ─────────────────────────────────────
  // (En production, remplacer par WebSocket ou webhook)

  const startPolling = (txId: string, reqId: string) => {
    let count = 0;
    const interval = setInterval(async () => {
      count++;
      setPollCount(count);

      // Timeout apres 3 minutes (36 x 5s)
      if (count >= 36) {
        clearInterval(interval);
        setStep('error');
        setError('Delai depasse. Votre paiement n a pas ete confirme. Reessayez.');
        return;
      }

      // Apres 10 secondes, proposer la validation manuelle
      if (count === 2) {
        // Le bouton "J'ai confirme" apparait dans l'UI
      }
    }, 5000);

    // Nettoyage si le composant est demonte
    return () => clearInterval(interval);
  };

  // ─── Validation manuelle ────────────────────────────────────────────────────

  const handleManualConfirm = () => {
    setLoading(true);
    handleCommit(transactionId, requestId).finally(() => setLoading(false));
  };

  // ─── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-md mx-auto">
      {/* En-tete */}
      <div className="text-center mb-6">
        <p className="text-2xl mb-1">🇩🇯</p>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Paiement local Djibouti</h2>
        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{courseTitle}</p>
        <div className="inline-flex items-center gap-1.5 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-sm font-bold mt-2">
          {amount} {currency}
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ── ETAPE 1 : Choisir le provider ── */}
        {step === 'select' && (
          <motion.div key="select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <p className="text-sm text-gray-500 mb-4 text-center">Choisissez votre operateur :</p>
            <div className="space-y-3">
              {PROVIDERS.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelectProvider(p.id)}
                  disabled={!p.available}
                  className={cn(
                    'w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left',
                    p.available
                      ? `${p.border} ${p.bg} hover:scale-[1.01] hover:shadow-md cursor-pointer`
                      : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 bg-gradient-to-br text-white shadow-sm',
                    p.available ? p.color : 'from-gray-400 to-gray-500'
                  )}>
                    {p.logo}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-900 dark:text-white">{p.name}</p>
                      {!p.available && (
                        <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded-full">
                          Bientot
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{p.description}</p>
                    <div className="flex gap-1.5 mt-1.5 flex-wrap">
                      {p.wallets.map(w => (
                        <span key={w} className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-full text-gray-600 dark:text-gray-400">
                          {w}
                        </span>
                      ))}
                    </div>
                  </div>
                  {p.available && <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                </button>
              ))}
            </div>

            {onCancel && (
              <button onClick={onCancel} className="w-full mt-4 text-sm text-gray-400 hover:text-gray-600 py-2">
                Annuler
              </button>
            )}
          </motion.div>
        )}

        {/* ── ETAPE 2 : Saisir le telephone ── */}
        {step === 'phone' && selectedProvider && (
          <motion.div key="phone" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className={cn('flex items-center gap-3 p-4 rounded-2xl mb-5', selectedProvider.bg)}>
              <span className="text-2xl">{selectedProvider.logo}</span>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedProvider.name}</p>
                <p className="text-xs text-gray-500">{selectedProvider.wallets.join(' · ')}</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                <Phone className="inline w-4 h-4 mr-1.5 mb-0.5" />
                Votre numero {selectedProvider.name}
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder={selectedProvider.placeholder}
                className="w-full px-4 py-3.5 border-2 border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 text-lg tracking-wide"
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-2">
                Vous recevrez une notification sur votre telephone pour confirmer.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm mb-4 bg-red-50 dark:bg-red-950 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={handleInitiate}
              disabled={loading || !phone.trim()}
              className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-base hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Envoi en cours...</>
              ) : (
                <>Envoyer la demande de paiement</>
              )}
            </button>

            <button
              onClick={() => setStep('select')}
              className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 py-2"
            >
              ← Changer d'operateur
            </button>
          </motion.div>
        )}

        {/* ── ETAPE 3 : En attente de confirmation ── */}
        {step === 'waiting' && (
          <motion.div key="waiting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center py-4">
            <div className="w-20 h-20 bg-green-50 dark:bg-green-950 rounded-full flex items-center justify-center mx-auto mb-5">
              <Phone className="w-10 h-10 text-green-600 animate-pulse" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Confirmez sur votre telephone
            </h3>
            <p className="text-sm text-gray-500 mb-1">
              Une notification a ete envoyee au
            </p>
            <p className="text-base font-bold text-gray-900 dark:text-white mb-5">{phone}</p>

            {/* Barre de progression */}
            <div className="bg-gray-100 dark:bg-gray-800 rounded-full h-2 mb-5 mx-auto max-w-xs overflow-hidden">
              <motion.div
                className="h-full bg-green-600 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${Math.min((pollCount / 36) * 100, 95)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {/* Instructions */}
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-5 text-left">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2">
                Comment confirmer :
              </p>
              <ol className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <li>1. Ouvrez votre app <strong>Waafi / Salaam</strong></li>
                <li>2. Acceptez la demande de paiement de <strong>{amount} {currency}</strong></li>
                <li>3. Entrez votre code PIN</li>
                <li>4. Revenez sur cette page</li>
              </ol>
            </div>

            {/* Bouton validation manuelle apres 10s */}
            {pollCount >= 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <button
                  onClick={handleManualConfirm}
                  disabled={loading}
                  className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold hover:bg-green-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Verification...</>
                  ) : (
                    <><CheckCircle className="w-4 h-4" /> J'ai confirme le paiement</>
                  )}
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  Cliquez apres avoir confirme sur votre telephone
                </p>
              </motion.div>
            )}

            <button
              onClick={() => { setStep('phone'); setError(''); }}
              className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 py-2"
            >
              Recommencer
            </button>
          </motion.div>
        )}

        {/* ── ETAPE 4 : Succes ── */}
        {step === 'success' && (
          <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center py-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 200 }}
              className="w-24 h-24 bg-green-100 dark:bg-green-950 rounded-full flex items-center justify-center mx-auto mb-5"
            >
              <CheckCircle className="w-12 h-12 text-green-600" />
            </motion.div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Paiement reussi ! 🎉</h3>
            <p className="text-gray-500 text-sm mb-6">
              Vous avez maintenant acces a <strong>{courseTitle}</strong>
            </p>
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-5">
              <p className="text-sm text-green-800 dark:text-green-300 font-medium">
                ✅ {amount} {currency} debite de votre compte {selectedProvider?.name}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {phone} · {new Date().toLocaleDateString('fr-DJ')}
              </p>
            </div>
            <button
              onClick={onSuccess}
              className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold hover:bg-green-700 transition-colors"
            >
              Commencer le cours →
            </button>
          </motion.div>
        )}

        {/* ── ETAPE 5 : Erreur ── */}
        {step === 'error' && (
          <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-center py-6">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-950 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Paiement echoue</h3>
            <p className="text-sm text-red-600 mb-6">{error}</p>
            <button
              onClick={() => { setStep('phone'); setError(''); }}
              className="w-full bg-green-600 text-white py-3.5 rounded-xl font-bold hover:bg-green-700 transition-colors"
            >
              Reessayer
            </button>
            <button
              onClick={() => setStep('select')}
              className="w-full mt-3 text-sm text-gray-400 hover:text-gray-600 py-2"
            >
              Changer d'operateur
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
