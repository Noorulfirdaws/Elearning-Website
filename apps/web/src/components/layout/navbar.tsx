'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu, X, GraduationCap, Sun, Moon, ChevronDown,
  LogOut, LayoutDashboard, BookOpen, User, Megaphone,
  School, Building2
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const COLLEGE = [
  { id: 'C6', nom: '6ème',  desc: 'Début du collège',        icone: '🏫' },
  { id: 'C5', nom: '5ème',  desc: 'Fractions & géométrie',   icone: '📐' },
  { id: 'C4', nom: '4ème',  desc: 'Équations & physique',    icone: '⚗️' },
  { id: 'C3', nom: '3ème',  desc: 'Préparation au Brevet',   icone: '🎯' },
];

const LYCEE = [
  { id: 'LS', nom: 'Seconde',   desc: 'Entrée au lycée',         icone: '📚' },
  { id: 'LP', nom: 'Première',  desc: 'Spécialisations',         icone: '🔬' },
  { id: 'LT', nom: 'Terminale', desc: 'Préparation au Bac',      icone: '🏆' },
];

const navLinks = [
  { name: 'Accueil',            href: '/' },
  { name: 'Cours',              href: '/catalog' },
  { name: 'À propos',           href: '/about' },
  { name: 'Contact',            href: '/contact' },
  { name: 'Devenir Instructeur',href: '/instructor' },
];

export function Navbar() {
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [classeOpen,   setClasseOpen]   = useState(false);
  const [bannerVisible,setBannerVisible]= useState(true);
  const [scrolled,     setScrolled]     = useState(false);
  const classeRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, logout, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fermer le dropdown classes en cliquant dehors
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (classeRef.current && !classeRef.current.contains(e.target as Node)) {
        setClasseOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-50">

      {/* ── Barre d'annonce ──────────────────────────────────── */}
      <AnimatePresence>
        {bannerVisible && (
          <motion.div
            initial={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-emerald-700 text-white text-sm overflow-hidden"
          >
            <div className="container mx-auto px-4 h-10 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 truncate">
                <Megaphone className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">🇩🇯 Programme scolaire Djibouti — Tous les cours gratuits pour les élèves !</span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <Link href="/apprendre" className="bg-white text-emerald-700 font-semibold text-xs px-4 py-1.5 rounded-full hover:bg-emerald-50 transition-colors whitespace-nowrap">
                  Commencer
                </Link>
                <button onClick={() => setBannerVisible(false)} className="text-white/70 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navbar principale ─────────────────────────────────── */}
      <header className={cn(
        'transition-all duration-300 border-b',
        scrolled
          ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm border-gray-200 dark:border-gray-800'
          : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800',
      )}>
        <nav className="container mx-auto px-4 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg flex-shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="hidden sm:block text-gray-900 dark:text-white">
              Learn<span className="text-blue-600">Hub</span>
            </span>
          </Link>

          {/* Navigation desktop */}
          <div className="hidden lg:flex items-center gap-1">

            {navLinks.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                  pathname === item.href
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
                )}
              >
                {item.name}
              </Link>
            ))}

            {/* ── Dropdown Apprendre / Choisir sa classe ─────── */}
            <div ref={classeRef} className="relative">
              <button
                onClick={() => setClasseOpen(!classeOpen)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                  classeOpen || pathname.startsWith('/apprendre')
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                Apprendre 🇩🇯
                <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', classeOpen && 'rotate-180')} />
              </button>

              <AnimatePresence>
                {classeOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
                  >
                    {/* Collège */}
                    <div className="p-3">
                      <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
                        <div className="w-6 h-6 bg-blue-100 dark:bg-blue-950 rounded-md flex items-center justify-center">
                          <School className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                          Collège — Brevet
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {COLLEGE.map((n) => (
                          <Link
                            key={n.id}
                            href={`/apprendre/${n.id}`}
                            onClick={() => setClasseOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950 group transition-colors"
                          >
                            <span className="text-xl w-7 text-center">{n.icone}</span>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                                {n.nom}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">{n.desc}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-gray-100 dark:border-gray-800" />

                    {/* Lycée */}
                    <div className="p-3">
                      <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
                        <div className="w-6 h-6 bg-green-100 dark:bg-green-950 rounded-md flex items-center justify-center">
                          <Building2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        </div>
                        <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">
                          Lycée — Baccalauréat
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {LYCEE.map((n) => (
                          <Link
                            key={n.id}
                            href={`/apprendre/${n.id}`}
                            onClick={() => setClasseOpen(false)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-green-50 dark:hover:bg-green-950 group transition-colors"
                          >
                            <span className="text-xl w-7 text-center">{n.icone}</span>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-green-700 dark:group-hover:text-green-300 transition-colors">
                                {n.nom}
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">{n.desc}</p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>

                    {/* Footer du dropdown */}
                    <div className="border-t border-gray-100 dark:border-gray-800 p-3">
                      <Link
                        href="/apprendre"
                        onClick={() => setClasseOpen(false)}
                        className="flex items-center justify-center gap-2 w-full py-2 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                      >
                        Voir tous les niveaux →
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Actions droite */}
          <div className="flex items-center gap-2 flex-shrink-0">

            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
            >
              <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            </button>

            {isAuthenticated && user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                    {user.firstName[0]}{user.lastName[0]}
                  </div>
                  <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300 max-w-24 truncate">
                    {user.firstName}
                  </span>
                  <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden"
                    >
                      <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <p className="font-semibold text-sm">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <div className="p-1">
                        <Link href="/dashboard" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                          <LayoutDashboard className="w-4 h-4" /> Tableau de bord
                        </Link>
                        <Link href="/my-courses" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                          <BookOpen className="w-4 h-4" /> Mes cours
                        </Link>
                        <Link href="/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
                          <User className="w-4 h-4" /> Paramètres
                        </Link>
                        <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                        <button onClick={() => { logout(); setUserMenuOpen(false); }} className="flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-red-600 w-full text-left transition-colors">
                          <LogOut className="w-4 h-4" /> Se déconnecter
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link href="/login" className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  Se connecter
                </Link>
                <Link href="/register" className="px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm">
                  S'inscrire
                </Link>
              </div>
            )}

            <button
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {/* ── Menu mobile ──────────────────────────────────────── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
            >
              <div className="container mx-auto px-4 py-3 flex flex-col gap-1">
                {navLinks.map((item) => (
                  <Link key={item.name} href={item.href} onClick={() => setMobileOpen(false)}
                    className={cn('px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
                      pathname === item.href
                        ? 'bg-blue-50 dark:bg-blue-950 text-blue-700'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}>
                    {item.name}
                  </Link>
                ))}

                {/* Collège mobile */}
                <div className="px-4 py-2">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5" /> Collège
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {COLLEGE.map((n) => (
                      <Link key={n.id} href={`/apprendre/${n.id}`} onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950 rounded-xl text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors">
                        <span>{n.icone}</span> {n.nom}
                      </Link>
                    ))}
                  </div>
                </div>

                {/* Lycée mobile */}
                <div className="px-4 py-2">
                  <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" /> Lycée
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {LYCEE.map((n) => (
                      <Link key={n.id} href={`/apprendre/${n.id}`} onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-950 rounded-xl text-sm font-medium text-green-700 dark:text-green-300 hover:bg-green-100 transition-colors">
                        <span>{n.icone}</span> {n.nom}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800 my-1" />
                {!isAuthenticated && (
                  <div className="flex flex-col gap-2 pb-2">
                    <Link href="/login" onClick={() => setMobileOpen(false)}
                      className="text-center py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      Se connecter
                    </Link>
                    <Link href="/register" onClick={() => setMobileOpen(false)}
                      className="text-center py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                      S'inscrire
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </div>
  );
}
