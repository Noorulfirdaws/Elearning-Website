'use client';

import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  { name: 'Amina Hassan', role: 'Élève en Terminale, Djibouti-ville', avatar: 'AH', rating: 5, text: 'Grâce aux cours structurés, j\'ai enfin compris les fonctions en mathématiques. Les exemples pas à pas sont parfaits. J\'ai eu 16/20 à mon devoir !' },
  { name: 'Mohamed Ali', role: 'Élève en 3ème, Ali-Sabieh', avatar: 'MA', rating: 5, text: 'Le quiz sur Pythagore m\'a vraiment aidé à me préparer pour le Brevet. Je refais les questions jusqu\'à avoir 100%. C\'est motivant !' },
  { name: 'Fatouma Ibrahim', role: 'Élève en Seconde, Obock', avatar: 'FI', rating: 5, text: 'Je vis loin et je n\'ai pas toujours accès à un bon professeur. Cette plateforme m\'a permis de réviser Physique-Chimie de chez moi.' },
  { name: 'Ismail Daoud', role: 'Parent d\'élève, Djibouti', avatar: 'ID', rating: 5, text: 'Mon fils utilise la plateforme chaque soir pour ses révisions. Les corrigés détaillés lui permettent de comprendre ses erreurs sans aide extérieure.' },
  { name: 'Hodan Warsame', role: 'Élève en 6ème, Tadjourah', avatar: 'HW', rating: 5, text: 'Les fractions c\'était difficile avant. Maintenant avec les exemples et les exercices, j\'ai compris. Mon professeur est étonné de mes progrès !' },
  { name: 'Abdi Youssouf', role: 'Élève en Première, Djibouti', avatar: 'AY', rating: 5, text: 'Interface claire, cours bien organisés par chapitre. Je peux suivre ma progression et voir exactement ce qu\'il me reste à réviser avant le Bac.' },
];

export function TestimonialsSection() {
  return (
    <section className="py-24 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">
            Ce que disent nos <span className="text-gradient">élèves</span>
          </h2>
          <p className="text-xl text-muted-foreground">Des témoignages d'élèves djiboutiens qui progressent chaque jour</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 card-hover relative"
            >
              <Quote className="absolute top-4 right-4 w-8 h-8 text-gray-200 dark:text-gray-700" />
              <div className="flex items-center gap-1 mb-3">
                {[1,2,3,4,5].map((s) => <Star key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-bold">
                  {t.avatar}
                </div>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
