'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Check, Star, BookOpen, GraduationCap, Flame } from 'lucide-react';

const plans = [
  {
    name: 'Chapitre',
    emoji: '📖',
    price: '1 000',
    currency: 'DJF',
    period: '/mois',
    description: 'Accès à un chapitre — renouvelé chaque mois',
    features: [
      'Cours complet du chapitre',
      'Exemples résolus pas à pas',
      'Exercices avec corrigés détaillés',
      'Quiz de validation illimités',
      'Fiches PDF téléchargeables',
      'Rappel 2 jours avant expiration',
    ],
    cta: 'Commencer — 1 000 DJF/mois',
    href: '/apprendre',
    highlighted: false,
    badge: null,
    color: 'from-blue-600 to-blue-700',
    icon: BookOpen,
  },
  {
    name: 'Classe',
    emoji: '🏆',
    price: '5 000',
    currency: 'DJF',
    period: '/mois',
    description: 'Tous les chapitres d\'un niveau scolaire',
    features: [
      'Tous les chapitres du niveau',
      'Toutes les matières incluses',
      'Cours + Exemples + Exercices',
      'Fiches PDF illimitées',
      'Export cours en PDF',
      'Quiz illimités + corrigés',
      'Rappel 2 jours avant expiration',
    ],
    cta: 'Prendre l\'accès Classe',
    href: '/apprendre',
    highlighted: true,
    badge: '⭐ Le meilleur choix',
    color: 'from-emerald-600 to-emerald-700',
    icon: GraduationCap,
  },
  {
    name: 'Examen',
    emoji: '🎓',
    price: '10 000',
    currency: 'DJF',
    period: '/mois',
    description: 'Préparation intensive Brevet / Bac',
    features: [
      'Tout l\'accès Classe inclus',
      'Annales des examens nationaux',
      'Corrigés détaillés',
      'Fiches de révision',
      'Simulateur d\'examen chronométré',
      'Conseils de méthode',
      'Rappel 2 jours avant expiration',
    ],
    cta: 'Pack Examen — 10 000 DJF/mois',
    href: '/apprendre',
    highlighted: false,
    badge: null,
    color: 'from-purple-700 to-purple-900',
    icon: GraduationCap,
  },
];

export function PricingPreview() {
  return (
    <section className="py-20 bg-gray-950">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <span className="inline-block bg-emerald-900/50 text-emerald-400 text-xs font-bold px-4 py-1.5 rounded-full mb-4 uppercase tracking-wider border border-emerald-700">
            Tarifs simples
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            Apprends à ton rythme
          </h2>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            Abonnement mensuel — paye chaque mois, accès coupé si non renouvelé.
            <br />
            <span className="text-emerald-400 font-semibold">🔔 Rappel automatique 2 jours avant expiration.</span>
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="relative"
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                  <span className="bg-amber-400 text-amber-900 text-xs font-bold px-5 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className={`h-full rounded-2xl overflow-hidden border ${
                plan.highlighted
                  ? 'border-emerald-500 shadow-2xl shadow-emerald-900/40 scale-[1.03]'
                  : 'border-gray-800'
              } bg-gray-900`}>

                {/* En-tête coloré */}
                <div className={`bg-gradient-to-br ${plan.color} px-7 py-7`}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{plan.emoji}</span>
                    <p className="text-white/90 font-bold text-lg">{plan.name}</p>
                  </div>
                  <div className="flex items-end gap-1.5">
                    <span className="text-5xl font-black text-white leading-none">{plan.price}</span>
                    <div className="mb-1">
                      <span className="text-white/80 text-sm font-semibold block">{plan.currency}</span>
                      <span className="text-white/60 text-xs">{plan.period}</span>
                    </div>
                  </div>
                  <p className="text-white/70 text-sm mt-2">{plan.description}</p>
                </div>

                {/* Features */}
                <div className="px-7 py-6">
                  <ul className="space-y-3 mb-7">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm text-gray-300">
                        <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                          plan.highlighted ? 'bg-emerald-500/20' : 'bg-gray-700'
                        }`}>
                          <Check className={`w-2.5 h-2.5 ${plan.highlighted ? 'text-emerald-400' : 'text-gray-400'}`} />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={plan.href}
                    className={`block text-center py-3 rounded-xl font-bold text-sm transition-all ${
                      plan.highlighted
                        ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-900/50'
                        : 'bg-gray-800 text-gray-200 hover:bg-gray-700 border border-gray-700'
                    }`}
                  >
                    {plan.cta} →
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Note bas de page */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-10 bg-gray-800/50 border border-gray-700 rounded-2xl px-6 py-4 max-w-2xl mx-auto"
        >
          <p className="text-center text-gray-300 text-sm font-medium mb-2">ℹ️ Comment fonctionne l'abonnement ?</p>
          <ul className="text-xs text-gray-400 space-y-1.5 text-center">
            <li>📅 L'accès est valable <strong className="text-white">30 jours</strong> à partir du paiement</li>
            <li>🔔 Un rappel SMS/notification est envoyé <strong className="text-white">2 jours avant</strong> l'expiration</li>
            <li>🔒 Sans renouvellement, l'accès est <strong className="text-white">automatiquement coupé</strong> à la date d'expiration</li>
            <li>💳 Paiement via <strong className="text-white">Waafi · D-Money</strong> · Conçu pour les élèves 🇩🇯</li>
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
