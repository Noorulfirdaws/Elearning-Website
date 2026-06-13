'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import axios from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import {
  Users, BookOpen, ShoppingBag, TrendingUp,
  UserCheck, GraduationCap, Settings, BarChart3,
  ChevronRight, Shield, Ban, Clock,
} from 'lucide-react';

interface Stats {
  totalEleves: number;
  totalInstructeurs: number;
  totalChapitres: number;
  achatsValides: number;
  revenusMois: number;
  derniersEleves: { id: string; firstName: string; lastName: string; email: string; createdAt: string; isBanned: boolean }[];
}

function StatCard({
  label, value, sub, icon: Icon, color, href, delay,
}: {
  label: string; value: string | number; sub?: string;
  icon: any; color: string; href: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Link href={href}>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-all group cursor-pointer">
          <div className="flex items-start justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center shadow-sm`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all mt-1" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          <p className="text-sm font-medium text-gray-500 mt-1">{label}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </Link>
    </motion.div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    axios.get('/users/admin/stats')
      .then(r => setStats(r.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  const formatDJF = (n: number) =>
    new Intl.NumberFormat('fr-DJ').format(n) + ' DJF';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* En-tête */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-5 w-5 text-emerald-600" />
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Tableau de bord</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {greet()}{user ? `, ${(user as any).firstName || 'Admin'}` : ''} 👋
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">NoorAcademie Djibouti — Vue d'ensemble de la plateforme</p>
          </div>
          <Link
            href="/apprendre"
            className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Voir le site élève →
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ─── Stats ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatCard
            label="Élèves inscrits"
            value={loading ? '…' : (stats?.totalEleves ?? 0)}
            sub="Comptes STUDENT actifs"
            icon={Users}
            color="bg-green-500"
            href="/admin/users"
            delay={0}
          />
          <StatCard
            label="Chapitres publiés"
            value={loading ? '…' : (stats?.totalChapitres ?? 0)}
            sub="Tous niveaux confondus"
            icon={BookOpen}
            color="bg-emerald-500"
            href="/admin/contenu"
            delay={0.07}
          />
          <StatCard
            label="Achats validés"
            value={loading ? '…' : (stats?.achatsValides ?? 0)}
            sub="Total depuis le début"
            icon={ShoppingBag}
            color="bg-amber-500"
            href="/admin/achats"
            delay={0.14}
          />
          <StatCard
            label="Revenus ce mois"
            value={loading ? '…' : formatDJF(stats?.revenusMois ?? 0)}
            sub={`${stats?.totalInstructeurs ?? '…'} instructeur(s)`}
            icon={TrendingUp}
            color="bg-purple-500"
            href="/admin/analytics"
            delay={0.21}
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">

          {/* ─── Derniers élèves ─────────────────────────────────── */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <h2 className="font-bold text-gray-900 dark:text-white text-sm">Derniers élèves inscrits</h2>
                </div>
                <Link href="/admin/users" className="text-xs text-green-600 hover:text-green-700 font-semibold">
                  Voir tous →
                </Link>
              </div>
              {loading ? (
                <div className="p-6 space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : stats?.derniersEleves?.length ? (
                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                  {stats.derniersEleves.map((eleve) => (
                    <div key={eleve.id} className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {(eleve.firstName?.[0] || '?').toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-gray-900 dark:text-white">
                            {eleve.firstName} {eleve.lastName}
                          </p>
                          <p className="text-xs text-gray-400">{eleve.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          eleve.isBanned
                            ? 'bg-red-100 text-red-600'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {eleve.isBanned ? 'Banni' : 'Actif'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(eleve.createdAt).toLocaleDateString('fr-DJ', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-10 text-sm">Aucun élève inscrit pour l'instant</p>
              )}
            </div>
          </motion.div>

          {/* ─── Actions rapides ─────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800">
                <h2 className="font-bold text-gray-900 dark:text-white text-sm">Actions rapides</h2>
              </div>
              <div className="p-4 space-y-2">
                {[
                  { label: 'Gérer les utilisateurs', sub: 'Élèves, instructeurs, rôles', icon: UserCheck, href: '/admin/users', color: 'text-green-600 bg-green-50 dark:bg-green-950' },
                  { label: 'Contenu pédagogique', sub: 'Niveaux, matières, chapitres', icon: GraduationCap, href: '/apprendre', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950' },
                  { label: 'Analytiques', sub: 'Progression et statistiques', icon: BarChart3, href: '/admin/analytics', color: 'text-purple-600 bg-purple-50 dark:bg-purple-950' },
                  { label: 'Paramètres', sub: 'Configuration plateforme', icon: Settings, href: '/admin/settings', color: 'text-gray-600 bg-gray-50 dark:bg-gray-800' },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                  >
                    <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-gray-400 truncate">{item.sub}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Niveaux rapides */}
            <div className="mt-4 bg-gradient-to-br from-emerald-600 to-green-700 rounded-2xl p-5 text-white">
              <p className="font-bold text-sm mb-1">🇩🇯 Programme Djibouti</p>
              <p className="text-xs text-green-100 mb-4">Collège C6→C3 · Lycée LS→LT</p>
              <Link
                href="/apprendre"
                className="block text-center bg-white text-emerald-700 font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-green-50 transition-colors"
              >
                Voir les cours →
              </Link>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
