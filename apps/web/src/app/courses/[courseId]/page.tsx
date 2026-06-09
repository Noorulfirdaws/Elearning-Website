'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  PlayCircle, Clock, Users, Star, Award, BookOpen, CheckCircle,
  Globe, BarChart, ShoppingCart, Zap, Lock, ChevronDown, ChevronUp
} from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { apiRoutes } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { formatCurrency, formatDuration } from '@/lib/utils';
import axios from '@/lib/api';

interface Course {
  id: string; title: string; slug: string; description: string; thumbnail?: string;
  trailerUrl?: string; previewVideo?: string; price: number; comparePrice?: number; isFree: boolean;
  level: string; language: string; totalStudents: number; rating: number;
  totalRatings: number; reviewCount?: number; totalDuration: number; totalLessons: number;
  instructor: { id: string; firstName: string; lastName: string; avatar?: string; bio?: string };
  category?: { name: string };
  sections: Array<{
    id: string; title: string; description?: string;
    lessons: Array<{ id: string; title: string; type: string; duration?: number; isFree: boolean }>;
  }>;
  outcomes: string[];
  whatYoullLearn?: string[];
  requirements: string[];
  tags: string[];
  isEnrolled?: boolean;
}

export default function CourseDetailPage() {
  const { courseId: slug } = useParams<{ courseId: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set([0].map(String)));
  const [enrolling, setEnrolling] = useState(false);

  const { data: course, isLoading } = useQuery<Course>({
    queryKey: ['course', slug],
    queryFn: () => axios.get(apiRoutes.courses.getBySlug(slug)).then(r => r.data.data),
  });

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleEnroll = async () => {
    if (!isAuthenticated) { router.push('/login'); return; }
    if (!course) return;

    if (course.isFree) {
      setEnrolling(true);
      try {
        await axios.post(apiRoutes.enrollments.enroll(course.id));
      } catch (err: any) {
        // 409 = already enrolled, just redirect
        if (err?.response?.status !== 409) {
          setEnrolling(false);
          return;
        }
      }
      router.push(`/dashboard`);
      setEnrolling(false);
    } else {
      router.push(`/checkout/${course.id}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-64 bg-muted animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
          </div>
          <div className="h-96 bg-muted animate-pulse rounded-xl" />
        </div>
      </div>
    );
  }

  if (!course) return <div className="min-h-screen flex items-center justify-center">Course not found</div>;

  const discount = course.comparePrice
    ? Math.round(((course.comparePrice - course.price) / course.comparePrice) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {course.category && (
              <span className="text-sm text-primary font-medium mb-3 block">{course.category.name}</span>
            )}
            <h1 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight">{course.title}</h1>
            <p className="text-gray-300 text-lg mb-6">{course.description}</p>

            <div className="flex flex-wrap items-center gap-4 text-sm mb-6">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                <span className="font-bold">{Number(course.rating || 0).toFixed(1)}</span>
                <span className="text-gray-400">({course.totalRatings || course.reviewCount || 0} reviews)</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-gray-400" />
                <span>{(course.totalStudents || 0).toLocaleString()} students</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>{formatDuration(course.totalDuration)}</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4 text-gray-400" />
                <span>{course.totalLessons} lessons</span>
              </div>
              <div className="flex items-center gap-1">
                <BarChart className="h-4 w-4 text-gray-400" />
                <span className="capitalize">{course.level.toLowerCase()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Globe className="h-4 w-4 text-gray-400" />
                <span>{course.language}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {course.instructor.avatar ? (
                <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                  <Image src={course.instructor.avatar} alt="" fill sizes="40px" className="object-cover" loading="lazy" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                  {course.instructor.firstName[0]}
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400">Created by</p>
                <p className="font-medium">
                  {course.instructor.firstName} {course.instructor.lastName}
                </p>
              </div>
            </div>
          </div>

          {/* Sticky Card — desktop only in hero */}
          <div className="hidden lg:block" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">

          {/* What You'll Learn */}
          {(course.outcomes || course.whatYoullLearn || []).length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border rounded-xl p-6"
            >
              <h2 className="text-xl font-bold mb-4">What you'll learn</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(course.outcomes || course.whatYoullLearn || []).map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{item}</span>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Course Curriculum */}
          <section>
            <h2 className="text-xl font-bold mb-4">Course Content</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {course.sections.length} sections • {course.totalLessons} lessons • {formatDuration(course.totalDuration)} total
            </p>
            <div className="border rounded-xl overflow-hidden">
              {course.sections.map((section, idx) => {
                const isOpen = openSections.has(section.id);
                const sectionDuration = section.lessons.reduce((sum, l) => sum + (l.duration || 0), 0);
                return (
                  <div key={section.id} className="border-b last:border-0">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        <span className="font-medium">{section.title}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {section.lessons.length} lessons • {formatDuration(sectionDuration)}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="divide-y">
                        {section.lessons.map(lesson => (
                          <div key={lesson.id} className="flex items-center gap-3 px-6 py-3">
                            {lesson.isFree ? (
                              <PlayCircle className="h-4 w-4 text-primary flex-shrink-0" />
                            ) : (
                              <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            )}
                            <span className="text-sm flex-1">{lesson.title}</span>
                            {lesson.isFree && (
                              <span className="text-xs text-primary font-medium">Preview</span>
                            )}
                            {lesson.duration && (
                              <span className="text-xs text-muted-foreground">{formatDuration(lesson.duration)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Requirements */}
          {course.requirements?.length > 0 && (
            <section>
              <h2 className="text-xl font-bold mb-4">Requirements</h2>
              <ul className="space-y-2">
                {course.requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground mt-1">•</span>
                    {req}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Instructor */}
          <section>
            <h2 className="text-xl font-bold mb-4">Your Instructor</h2>
            <div className="flex items-start gap-4">
              {course.instructor.avatar ? (
                <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                  <Image src={course.instructor.avatar} alt="" fill sizes="64px" className="object-cover" loading="lazy" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                  {course.instructor.firstName[0]}
                </div>
              )}
              <div>
                <p className="font-semibold text-lg">
                  {course.instructor.firstName} {course.instructor.lastName}
                </p>
                {course.instructor.bio && (
                  <p className="text-sm text-muted-foreground mt-2">{course.instructor.bio}</p>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* Sticky Purchase Card */}
        <div>
          <div className="sticky top-24 border rounded-xl overflow-hidden shadow-xl">
            {(course.trailerUrl || course.previewVideo) ? (
              <div className="relative aspect-video bg-black">
                <video src={course.trailerUrl || course.previewVideo} controls className="w-full h-full" />
              </div>
            ) : course.thumbnail ? (
              <div className="relative w-full aspect-video">
                <Image src={course.thumbnail} alt={course.title} fill sizes="(max-width: 768px) 100vw, 400px" className="object-cover" loading="lazy" />
              </div>
            ) : (
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                <PlayCircle className="h-16 w-16 text-primary" />
              </div>
            )}

            <div className="p-6 space-y-4">
              <div className="flex items-baseline gap-3">
                {course.isFree ? (
                  <span className="text-3xl font-bold text-green-600">Free</span>
                ) : (
                  <>
                    <span className="text-3xl font-bold">{formatCurrency(course.price)}</span>
                    {course.comparePrice && (
                      <span className="text-lg text-muted-foreground line-through">
                        {formatCurrency(course.comparePrice)}
                      </span>
                    )}
                    {discount > 0 && (
                      <span className="text-sm font-medium text-green-600">{discount}% off</span>
                    )}
                  </>
                )}
              </div>

              {course.isEnrolled ? (
                <Link
                  href={`/dashboard/courses/${course.id}/learn/${course.sections[0]?.lessons[0]?.id || ''}`}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-3 font-semibold hover:bg-primary/90 transition-colors"
                >
                  <PlayCircle className="h-5 w-5" />
                  Continue Learning
                </Link>
              ) : (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-3 font-semibold hover:bg-primary/90 transition-colors disabled:opacity-70"
                >
                  {enrolling ? (
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : course.isFree ? (
                    <><Zap className="h-5 w-5" /> Enroll for Free</>
                  ) : (
                    <><ShoppingCart className="h-5 w-5" /> Buy Now</>
                  )}
                </button>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(course.totalDuration)} of content</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  <span>{course.totalLessons} lessons</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Award className="h-4 w-4" />
                  <span>Certificate of completion</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <span>Full lifetime access</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
