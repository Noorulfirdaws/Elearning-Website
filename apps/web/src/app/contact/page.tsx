import Link from 'next/link';
import { Mail, MapPin, MessageCircle, Phone, Clock } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export const metadata = {
  title: 'Contact — NoorAcademie',
  description: 'Contacte l’équipe NoorAcademie pour toute question ou assistance.',
};

const moyens = [
  { icon: Mail, titre: 'Email', valeur: 'noorulfirdaws@gmail.com', href: 'mailto:noorulfirdaws@gmail.com' },
  { icon: MapPin, titre: 'Localisation', valeur: 'Djibouti, Corne de l’Afrique', href: null },
  { icon: Clock, titre: 'Disponibilité', valeur: 'Du dimanche au jeudi, 8h–18h', href: null },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />

      <section className="bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 pt-28 pb-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-950 mb-6">
            <MessageCircle className="w-7 h-7 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Nous <span className="text-gradient">contacter</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Une question, une suggestion, besoin d'aide ? L'équipe NoorAcademie te répond.
          </p>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-16">
        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          {moyens.map((m) => {
            const contenu = (
              <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 h-full hover:border-green-300 dark:hover:border-green-800 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-green-100 dark:bg-green-950 flex items-center justify-center mb-4">
                  <m.icon className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">{m.titre}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 break-words">{m.valeur}</p>
              </div>
            );
            return m.href
              ? <a key={m.titre} href={m.href}>{contenu}</a>
              : <div key={m.titre}>{contenu}</div>;
          })}
        </div>

        <div className="bg-green-600 rounded-2xl p-8 text-center text-white">
          <h2 className="text-xl font-bold mb-2">Besoin d'aide rapidement ?</h2>
          <p className="text-green-100 text-sm mb-6">
            Écris-nous directement par email, nous répondons sous 24-48h.
          </p>
          <a
            href="mailto:noorulfirdaws@gmail.com"
            className="inline-flex items-center gap-2 bg-white text-green-700 px-6 py-3 rounded-full font-semibold hover:bg-green-50 transition-colors"
          >
            <Mail className="w-4 h-4" /> Envoyer un email
          </a>
        </div>

        <div className="text-center mt-10">
          <Link href="/" className="text-sm text-gray-500 hover:text-green-600 transition-colors">
            ← Retour à l'accueil
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
