'use client';

import { motion } from 'framer-motion';
import { Video, FileText, Brain, Award, Users, BarChart3, Shield, Smartphone, Zap } from 'lucide-react';

const features = [
  { icon: Video, title: 'Cours vidéo HD', desc: 'Vidéos explicatives claires avec contrôle de vitesse et reprise là où tu t\'es arrêté.', color: 'bg-green-50 dark:bg-green-950 text-green-600' },
  { icon: Brain, title: 'Quiz interactifs', desc: 'Teste tes connaissances après chaque chapitre. Corrections détaillées avec explications pédagogiques.', color: 'bg-purple-50 dark:bg-purple-950 text-purple-600' },
  { icon: Award, title: 'Suivi de progression', desc: 'Suis ta progression chapitre par chapitre. Visualise ce que tu as validé et ce qu\'il te reste.', color: 'bg-yellow-50 dark:bg-yellow-950 text-yellow-600' },
  { icon: FileText, title: 'Cours structurés', desc: 'Chaque chapitre : cours complet, exemples résolus pas à pas, exercices avec corrigés détaillés.', color: 'bg-green-50 dark:bg-green-950 text-green-600' },
  { icon: BarChart3, title: 'Programme officiel', desc: 'Contenu aligné sur le programme scolaire djiboutien. Du collège (6ème-3ème) au lycée (Terminale).', color: 'bg-orange-50 dark:bg-orange-950 text-orange-600' },
  { icon: Users, title: 'Toutes les matières', desc: 'Mathématiques, Physique, SVT, Français, Histoire-Géo — toutes les matières clés couvertes.', color: 'bg-pink-50 dark:bg-pink-950 text-pink-600' },
  { icon: Shield, title: 'Accès sécurisé', desc: 'Inscription simple et sécurisée. Tes données et ta progression sont protégées.', color: 'bg-red-50 dark:bg-red-950 text-red-600' },
  { icon: Smartphone, title: 'Sur tous les appareils', desc: 'Apprends depuis ton téléphone, ta tablette ou ton ordinateur. Optimisé pour les smartphones.', color: 'bg-teal-50 dark:bg-teal-950 text-teal-600' },
  { icon: Zap, title: 'Rapide et fluide', desc: 'Chargement instantané. Les cours fonctionnent même avec une connexion lente.', color: 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600' },
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-green-200 dark:border-green-800">
            Tout ce dont tu as besoin
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            La plateforme <span className="text-gradient">complète</span> pour réussir
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Du cours structuré au quiz de validation — chaque outil conçu pour t'aider à progresser.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 card-hover"
            >
              <div className={`w-12 h-12 rounded-xl ${feat.color} flex items-center justify-center mb-4`}>
                <feat.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feat.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{feat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
