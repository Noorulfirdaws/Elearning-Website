import Link from 'next/link';
import { GraduationCap, Target, Heart, Globe, BookOpen, Users } from 'lucide-react';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';

export const metadata = {
  title: 'À propos — NoorAcademie',
  description: "La plateforme éducative dédiée aux élèves de Djibouti, du collège au lycée.",
};

const valeurs = [
  { icon: Target, titre: 'Accessible', texte: "Un enseignement de qualité, conforme au programme officiel, accessible partout à Djibouti." },
  { icon: Heart, titre: 'Bienveillant', texte: 'Chaque élève progresse à son rythme, avec des cours clairs et des exemples concrets.' },
  { icon: Globe, titre: 'Ancré localement', texte: "Des contenus adaptés au contexte djiboutien et à la Corne de l'Afrique." },
];

const chiffres = [
  { icon: BookOpen, valeur: '7', label: 'Niveaux (6ème → Terminale)' },
  { icon: GraduationCap, valeur: '8', label: 'Matières par niveau' },
  { icon: Users, valeur: '∞', label: 'Élèves accompagnés' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />

      {/* Hero */}
      <section className="bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 pt-28 pb-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 px-4 py-2 rounded-full text-sm font-medium mb-6">
            🇩🇯 Made in Djibouti
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            À propos de <span className="text-gradient">NoorAcademie</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
            NoorAcademie est une plateforme éducative créée pour accompagner les élèves djiboutiens,
            du collège au lycée, dans toutes les matières du programme officiel — à leur rythme,
            où qu'ils soient.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Notre mission</h2>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
          Offrir à chaque élève de Djibouti un accès simple et fiable à des cours de qualité :
          des leçons structurées, des exemples résolus, des quiz interactifs et des fiches
          téléchargeables, conformes au programme français appliqué à Djibouti. Nous croyons que
          l'éducation est le moteur du développement de notre pays et de la Corne de l'Afrique.
        </p>

        <div className="grid sm:grid-cols-3 gap-6 my-12">
          {valeurs.map((v) => (
            <div key={v.titre} className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800">
              <div className="w-11 h-11 rounded-xl bg-green-100 dark:bg-green-950 flex items-center justify-center mb-4">
                <v.icon className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{v.titre}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{v.texte}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6 bg-green-600 rounded-2xl p-8 text-white">
          {chiffres.map((c) => (
            <div key={c.label} className="text-center">
              <c.icon className="w-6 h-6 mx-auto mb-2 text-green-100" />
              <div className="text-3xl font-bold">{c.valeur}</div>
              <div className="text-xs text-green-100 mt-1">{c.label}</div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link href="/apprendre" className="inline-flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-green-700 transition-colors">
            Commencer à apprendre
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
