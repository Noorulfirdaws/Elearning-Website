'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Star, Users, Clock, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import axios from '@/lib/api';
import { apiRoutes } from '@/lib/api';
import { formatDuration, formatCurrency } from '@/lib/utils';

const levelColors: Record<string, string> = {
  BEGINNER: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  Beginner: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  INTERMEDIATE: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  Intermediate: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  ADVANCED: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
  Advanced: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
};

interface Course {
  id: string;
  slug: string;
  title: string;
  description?: string;
  thumbnail?: string;
  level: string;
  isFree: boolean;
  price: number;
  comparePrice?: number;
  totalStudents: number;
  rating: number;
  totalDuration: number;
  totalLessons: number;
  instructor: { firstName: string; lastName: string };
  category?: { name: string };
}

export function FeaturedCourses() {
  const { data: courses, isLoading } = useQuery<Course[]>({
    queryKey: ['featured-courses'],
    queryFn: () => axios.get(apiRoutes.courses.featured).then(r => r.data.data || []),
    staleTime: 5 * 60 * 1000,
  });

  const displayCourses = courses && courses.length > 0 ? courses : [];

  return (
    <section className="py-24 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex items-end justify-between mb-12">
          <div>
            <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-green-200 dark:border-green-800">
              Top rated courses
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold">
              Featured <span className="text-gradient">Courses</span>
            </h2>
          </div>
          <Link href="/catalog" className="hidden md:flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all">
            View all courses <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>

        {isLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-pulse">
                <div className="aspect-video bg-gray-200 dark:bg-gray-700" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                  <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : displayCourses.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg mb-4">No courses available yet.</p>
            <Link href="/register" className="text-primary hover:underline">Be the first instructor →</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayCourses.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
              >
                <Link href={`/courses/${course.slug}`}>
                  <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 card-hover group h-full flex flex-col">
                    <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-700">
                      {course.thumbnail ? (
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                          <span className="text-4xl">📚</span>
                        </div>
                      )}
                      {course.isFree && (
                        <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">FREE</div>
                      )}
                      <div className="absolute top-3 right-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${levelColors[course.level] || levelColors['BEGINNER']}`}>
                          {course.level.charAt(0) + course.level.slice(1).toLowerCase()}
                        </span>
                      </div>
                    </div>

                    <div className="p-5 flex flex-col flex-1">
                      {course.category && (
                        <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">{course.category.name}</div>
                      )}
                      <h3 className="font-semibold text-base mb-1 line-clamp-2 group-hover:text-primary transition-colors">{course.title}</h3>
                      {course.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-1">{course.description}</p>
                      )}

                      <div className="flex items-center gap-1 text-sm mb-3">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{Number(course.rating || 0).toFixed(1)}</span>
                        <span className="text-muted-foreground">({(course.totalStudents || 0).toLocaleString()} students)</span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatDuration(course.totalDuration)}</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {(course.totalStudents || 0).toLocaleString()}</span>
                      </div>

                      <div className="flex items-center justify-between mt-auto">
                        <div className="text-xs text-muted-foreground">
                          by {course.instructor?.firstName} {course.instructor?.lastName}
                        </div>
                        <div className="flex items-center gap-2">
                          {course.comparePrice && (
                            <span className="text-xs text-muted-foreground line-through">{formatCurrency(course.comparePrice)}</span>
                          )}
                          <span className={`font-bold text-lg ${course.isFree ? 'text-green-600' : 'text-foreground'}`}>
                            {course.isFree ? 'Free' : formatCurrency(course.price)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        <div className="text-center mt-10 md:hidden">
          <Link href="/catalog" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-full font-semibold hover:bg-primary/90 transition-colors">
            Browse all courses <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
