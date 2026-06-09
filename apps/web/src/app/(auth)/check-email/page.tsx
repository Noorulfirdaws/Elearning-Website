'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function CheckEmailPage() {
  const params = useSearchParams();
  const email = params.get('email') || '';
  const [resending, setResending] = useState(false);
  const [sent, setSent] = useState(false);

  const resend = async () => {
    if (!email || resending) return;
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email });
      setSent(true);
      toast.success('E-mail de vérification renvoyé !');
    } catch {
      toast.error('Impossible de renvoyer. Veuillez réessayer.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 px-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-indigo-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Vérifie ton e-mail</h1>
        <p className="text-gray-500 mb-2">Nous avons envoyé un lien de vérification à</p>
        {email && <p className="font-semibold text-gray-900 mb-6">{email}</p>}
        <p className="text-gray-500 text-sm mb-8">
          Clique sur le lien dans l'e-mail pour activer ton compte. Il expire dans 24 heures.
        </p>

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-left mb-8 text-sm text-amber-800">
          <p className="font-medium mb-1">📬 Tu n'as pas reçu l'e-mail ?</p>
          <ul className="space-y-1 text-amber-700 list-disc list-inside">
            <li>Vérifie ton dossier spam / courrier indésirable</li>
            <li>Assure-toi que l'adresse e-mail est correcte</li>
            <li>Attends une minute et réessaie</li>
          </ul>
        </div>

        <button
          onClick={resend}
          disabled={resending || sent}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
          {sent ? 'E-mail renvoyé !' : resending ? 'Envoi en cours…' : 'Renvoyer l\'e-mail de vérification'}
        </button>

        <Link href="/login" className="text-sm text-indigo-600 hover:underline font-medium">
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
