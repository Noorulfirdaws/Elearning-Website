'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch {
      setError('Impossible d\'envoyer le lien. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {sent ? (
            <div className="text-center">
              <div className="text-5xl mb-4">📧</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Vérifie ton e-mail</h2>
              <p className="text-gray-500 mb-6">
                Un lien de réinitialisation a été envoyé à <strong>{email}</strong>
              </p>
              <Link href="/login" className="text-emerald-600 font-medium hover:underline">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Mot de passe oublié ?</h1>
                <p className="text-gray-500 text-sm">Saisis ton e-mail et nous t'enverrons un lien de réinitialisation.</p>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse e-mail</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="toi@exemple.com"
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Envoi en cours…' : 'Envoyer le lien'}
                </button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-6">
                Tu te souviens de ton mot de passe ?{' '}
                <Link href="/login" className="text-emerald-600 font-medium hover:underline">Se connecter</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
