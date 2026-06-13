import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md px-6">
        <div className="text-8xl font-black text-emerald-100 mb-4">404</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Page introuvable</h2>
        <p className="text-gray-500 mb-8">La page que tu cherches n'existe pas ou a été déplacée.</p>
        <Link
          href="/"
          className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
        >
          Retour à l'accueil
        </Link>
      </div>
    </div>
  );
}
