'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Filter, SlidersHorizontal, Star, Clock, Users, X, ChevronDown } from 'lucide-react';
import { api, apiRoutes } from '@/lib/api';
import { buildQueryString, calculateDiscount } from '@/lib/utils';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { useDebounce } from '@/hooks/use-debounce';

const levels = ['ALL_LEVELS', 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
const sortOptions = [
  { value: 'newest', label: 'Plus récents' },
  { value: 'rating', label: 'Mieux notés' },
  { value: 'students', label: 'Plus populaires' },
  { value: 'price_asc', label: 'Prix croissant' },
  { value: 'price_desc', label: 'Prix décroissant' },
];

export default function CatalogPage() {
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['courses', { search: debouncedSearch, level, sortBy, page }],
    queryFn: () =>
      api.get(`${apiRoutes.courses.list}?${buildQueryString({ search: debouncedSearch, level, sortBy, page, limit: 12 })}`).then((r) => r.data.data),
  });

  const courses = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      {/* Header */}
      <section className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 pt-24 pb-8">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">Catalogue de cours</h1>
          <p className="text-muted-foreground mb-6">Explorer {meta?.total?.toLocaleString() || ''} cours disponibles</p>

          {/* Search bar */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher des cours, matières, instructeurs..."
                className="w-full pl-12 pr-12 py-3.5 border border-input rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 px-5 py-3.5 border border-input rounded-xl bg-background hover:bg-secondary transition-colors font-medium">
              <SlidersHorizontal className="w-5 h-5" />
              Filtres
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 flex flex-wrap gap-3">
              {/* Level filter */}
              <div className="flex gap-2">
                {levels.map((l) => (
                  <button
                    key={l}
                    onClick={() => setLevel(level === l ? '' : l)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${level === l ? 'bg-primary text-primary-foreground border-primary' : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}
                  >
                    {l === 'ALL_LEVELS' ? 'Tous niveaux' : l === 'BEGINNER' ? 'Débutant' : l === 'INTERMEDIATE' ? 'Intermédiaire' : 'Avancé'}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {sortOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </motion.div>
          )}
        </div>
      </section>

      {/* Course grid */}
      <section className="container mx-auto px-4 py-10">
        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 animate-pulse">
                <div className="aspect-video bg-gray-200 dark:bg-gray-700" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Aucun cours trouvé</h2>
            <p className="text-muted-foreground">Essaie d'ajuster ta recherche ou tes filtres</p>
            <button onClick={() => { setSearch(''); setLevel(''); }} className="mt-4 text-primary hover:underline">Réinitialiser les filtres</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <p className="text-muted-foreground text-sm">
                {meta?.total?.toLocaleString() || courses.length} courses found
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {courses.map((course: any, i: number) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link href={`/courses/${course.slug}`}>
                    <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 card-hover group h-full flex flex-col">
                      <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-800">
                        {course.thumbnail ? (
                          <Image
                            src={course.thumbnail}
                            alt={course.title}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-500" />
                        )}
                        {course.isFree && <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">GRATUIT</div>}
                        {Number(course.price) > 0 && course.comparePrice && calculateDiscount(Number(course.price), Number(course.comparePrice)) > 0 && (
                          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            -{calculateDiscount(Number(course.price), Number(course.comparePrice))}%
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">{course.category?.name}</p>
                        <h3 className="font-semibold text-sm mb-1 line-clamp-2 group-hover:text-primary transition-colors flex-1">{course.title}</h3>
                        <p className="text-xs text-muted-foreground mb-2">{course.instructor?.firstName} {course.instructor?.lastName}</p>
                        <div className="flex items-center gap-1 mb-2">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs font-semibold">{Number(course.rating).toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">({course.totalRatings?.toLocaleString()})</span>
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100 dark:border-gray-800">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" />
                            {course.totalStudents?.toLocaleString()}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {course.comparePrice && Number(course.comparePrice) > Number(course.price) && (
                              <span className="text-xs text-muted-foreground line-through">${Number(course.comparePrice).toFixed(0)}</span>
                            )}
                            <span className={`font-bold text-sm ${course.isFree ? 'text-green-600' : ''}`}>
                              {course.isFree ? 'Gratuit' : `${Number(course.price).toFixed(0)} USD`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                {[...Array(meta.totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${page === i + 1 ? 'bg-primary text-primary-foreground' : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-primary/50'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <Footer />
    </div>
  );
}
