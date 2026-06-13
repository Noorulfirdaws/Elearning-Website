'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Award, TrendingUp, Clock, ArrowRight, Play, CheckCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { api, apiRoutes } from '@/lib/api';
import { formatDate, formatDuration } from '@/lib/utils';
import { Navbar } from '@/components/layout/navbar';

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  const { data: enrollments } = useQuery({
    queryKey: ['enrollments'],
    queryFn: () => api.get(apiRoutes.enrollments.mine).then((r) => r.data.data),
    enabled: isAuthenticated,
  });

  const { data: certificates } = useQuery({
    queryKey: ['certificates'],
    queryFn: () => api.get(apiRoutes.certificates.mine).then((r) => r.data.data),
    enabled: isAuthenticated,
  });

  if (!user) return null;

  const inProgress = enrollments?.filter((e: any) => !e.completedAt && Number(e.progress) > 0) || [];
  const completed = enrollments?.filter((e: any) => e.completedAt) || [];
  const notStarted = enrollments?.filter((e: any) => Number(e.progress) === 0) || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-16">
        {/* Bienvenue */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-bold mb-1">
            Bon retour, <span className="text-gradient">{user.firstName}</span> 👋
          </h1>
          <p className="text-muted-foreground">Reprends là où tu t'es arrêté</p>
        </motion.div>

        {/* Statistiques */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Cours inscrits', value: enrollments?.length || 0, icon: BookOpen, color: 'text-green-500 bg-green-50 dark:bg-green-950' },
            { label: 'En cours', value: inProgress.length, icon: TrendingUp, color: 'text-orange-500 bg-orange-50 dark:bg-orange-950' },
            { label: 'Terminés', value: completed.length, icon: CheckCircle, color: 'text-green-500 bg-green-50 dark:bg-green-950' },
            { label: 'Certificats', value: certificates?.length || 0, icon: Award, color: 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950' },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color} mb-3`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Continuer l'apprentissage */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Continuer l'apprentissage</h2>
              <Link href="/my-courses" className="text-sm text-primary flex items-center gap-1 hover:gap-2 transition-all">
                Voir tout <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {inProgress.length === 0 && notStarted.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-12 border border-gray-100 dark:border-gray-800 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Aucun cours pour l'instant</h3>
                <p className="text-muted-foreground text-sm mb-4">Commence par explorer le catalogue de cours</p>
                <Link href="/catalog" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-medium hover:bg-primary/90 transition-colors">
                  Parcourir les cours <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {[...inProgress, ...notStarted].slice(0, 5).map((enrollment: any, i: number) => (
                  <motion.div key={enrollment.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                    <Link href={`/courses/${enrollment.course.slug}/learn`}>
                      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 hover:border-primary/30 card-hover flex items-center gap-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                          {enrollment.course.thumbnail ? (
                            <Image src={enrollment.course.thumbnail} alt={enrollment.course.title} fill sizes="64px" className="object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                              <BookOpen className="w-6 h-6 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm mb-1 truncate">{enrollment.course.title}</h3>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                              <div className="bg-primary h-1.5 rounded-full" style={{ width: `${enrollment.progress}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{Math.round(enrollment.progress)}%</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {enrollment.course.instructor.firstName} {enrollment.course.instructor.lastName}
                          </p>
                        </div>
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          <Play className="w-5 h-5 text-primary fill-current" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Certificats */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Certificats</h2>
              <Link href="/certificates" className="text-sm text-primary">Voir tout</Link>
            </div>
            <div className="space-y-3">
              {certificates?.slice(0, 3).map((cert: any, i: number) => (
                <motion.div key={cert.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                  <Link href={`/certificates/${cert.uniqueId}`}>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 card-hover">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-50 dark:bg-yellow-950 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Award className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{cert.course.title}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(cert.issuedAt)}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
              {(!certificates || certificates.length === 0) && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 border border-gray-100 dark:border-gray-800 text-center">
                  <Award className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Termine des cours pour obtenir des certificats</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
