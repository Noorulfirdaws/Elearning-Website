'use client';

import Link from 'next/link';
import { WifiOff, BookOpen, RefreshCw } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">

        {/* Icône */}
        <div className="w-24 h-24 bg-white rounded-3xl shadow-lg flex items-center justify-center mx-auto mb-8">
          <WifiOff className="w-12 h-12 text-green-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Pas de connexion 📡
        </h1>
        <p className="text-gray-500 text-lg mb-2">
          Tu es actuellement hors ligne.
        </p>
        <p className="text-gray-400 text-sm mb-10">
          Certains cours sont disponibles en mode hors ligne si tu les as consultés avant. Reconnecte-toi pour continuer à apprendre.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 bg-green-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-green-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Réessayer
          </button>

          <Link
            href="/apprendre"
            className="flex items-center justify-center gap-2 bg-white text-green-600 border border-green-200 px-8 py-3.5 rounded-xl font-semibold hover:bg-green-50 transition-colors"
          >
            <BookOpen className="w-5 h-5" />
            Cours en cache
          </Link>
        </div>

        {/* Astuce */}
        <div className="mt-10 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left">
          <p className="text-sm font-semibold text-amber-800 mb-1">💡 Astuce hors ligne</p>
          <p className="text-xs text-amber-700 leading-relaxed">
            Les cours que tu as déjà consultés sont enregistrés sur ton téléphone. Tu peux les lire sans connexion en allant sur <strong>/apprendre</strong>.
          </p>
        </div>

        <p className="text-xs text-gray-400 mt-6">🇩🇯 NoorAcademie Djibouti</p>
      </div>
    </div>
  );
}
