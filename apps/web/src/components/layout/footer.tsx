import Link from 'next/link';
import { GraduationCap, Twitter, Linkedin, Github, Youtube } from 'lucide-react';

const links = {
  Plateforme: [
    { label: 'Apprendre', href: '/apprendre' },
    { label: 'Cours', href: '/catalog' },
    { label: 'Webinaires', href: '/webinars' },
    { label: 'Mode hors-ligne', href: '/offline' },
  ],
  Communauté: [
    { label: 'Forum', href: '/community' },
    { label: 'Marketplace', href: '/marketplace' },
    { label: 'Devenir instructeur', href: '/register' },
    { label: 'Se connecter', href: '/login' },
  ],
  Ressources: [
    { label: 'Tous les niveaux', href: '/apprendre' },
    { label: 'Catalogue', href: '/catalog' },
    { label: 'Tableau de bord', href: '/dashboard' },
    { label: 'Mon profil', href: '/settings' },
  ],
};

const social = [
  { Icon: Twitter, href: 'https://twitter.com' },
  { Icon: Linkedin, href: 'https://linkedin.com' },
  { Icon: Github, href: 'https://github.com' },
  { Icon: Youtube, href: 'https://youtube.com' },
];

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              NoorAcademie
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              La plateforme éducative dédiée aux élèves de Djibouti. Du collège au lycée, progressez à votre rythme.
            </p>
            <div className="flex items-center gap-3">
              {social.map(({ Icon, href }, i) => (
                <a key={i} href={href} target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 transition-colors">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {Object.entries(links).map(([section, items]) => (
            <div key={section}>
              <h4 className="font-semibold text-white mb-4 text-sm">{section}</h4>
              <ul className="space-y-2">
                {items.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className="text-sm text-gray-400 hover:text-white transition-colors">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">© 2026 NoorAcademie. Tous droits réservés.</p>
          <p className="text-sm text-gray-500">🇩🇯 Fait avec ♥ pour les élèves djiboutiens</p>
        </div>
      </div>
    </footer>
  );
}
