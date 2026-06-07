'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Bell, Menu, X, BookOpen, ChevronDown, Sun, Moon, User, LogOut, LayoutDashboard, GraduationCap } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Courses', href: '/catalog' },
  { name: 'Community', href: '/community' },
  { name: 'Pricing', href: '/pricing' },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const { user, logout, isAuthenticated } = useAuthStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        scrolled ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm border-b border-gray-200 dark:border-gray-800' : 'bg-transparent',
      )}
    >
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-gradient">LearnHub</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'text-sm font-medium transition-colors hover:text-primary',
                pathname === item.href ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          <Link href="/catalog?focus=search" className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm bg-secondary px-3 py-1.5 rounded-full transition-colors">
            <Search className="w-4 h-4" />
            <span>Search courses...</span>
          </Link>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors"
            aria-label="Toggle theme"
          >
            <Sun className="w-4 h-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute w-4 h-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </button>

          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 hover:bg-secondary rounded-full p-1 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-semibold">
                  {user.firstName[0]}{user.lastName[0]}
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground hidden md:block" />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                  >
                    <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                      <p className="font-medium text-sm">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                    <div className="p-1">
                      <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-secondary transition-colors" onClick={() => setUserMenuOpen(false)}>
                        <LayoutDashboard className="w-4 h-4" /> Dashboard
                      </Link>
                      <Link href="/dashboard/courses" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-secondary transition-colors" onClick={() => setUserMenuOpen(false)}>
                        <BookOpen className="w-4 h-4" /> My Learning
                      </Link>
                      <Link href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-secondary transition-colors" onClick={() => setUserMenuOpen(false)}>
                        <User className="w-4 h-4" /> Settings
                      </Link>
                      <button onClick={() => { logout(); setUserMenuOpen(false); }} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-950 text-red-600 w-full text-left transition-colors">
                        <LogOut className="w-4 h-4" /> Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-full hover:bg-secondary transition-colors">
                Sign in
              </Link>
              <Link href="/register" className="text-sm font-medium px-4 py-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                Get started
              </Link>
            </div>
          )}

          <button
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
          >
            <div className="container mx-auto px-4 py-4 flex flex-col gap-3">
              {navigation.map((item) => (
                <Link key={item.name} href={item.href} className="text-sm font-medium py-2 hover:text-primary transition-colors" onClick={() => setMobileOpen(false)}>
                  {item.name}
                </Link>
              ))}
              <hr className="border-gray-200 dark:border-gray-700" />
              {isAuthenticated ? (
                <Link href="/dashboard" className="text-sm font-medium py-2" onClick={() => setMobileOpen(false)}>Dashboard</Link>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link href="/login" className="text-center py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium" onClick={() => setMobileOpen(false)}>Sign in</Link>
                  <Link href="/register" className="text-center py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium" onClick={() => setMobileOpen(false)}>Get started</Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
