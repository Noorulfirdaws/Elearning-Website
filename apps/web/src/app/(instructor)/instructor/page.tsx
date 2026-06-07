'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, BookOpen, Users, DollarSign, Star, Eye, BarChart2 } from 'lucide-react';
import Link from 'next/link';
import axios, { apiRoutes } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { formatCurrency } from '@/lib/utils';

export default function InstructorDashboard() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
  }, [isAuthenticated, router]);

  const { data: courses, isLoading } = useQuery<any[]>({
    queryKey: ['instructor-courses'],
    queryFn: () => axios.get(apiRoutes.courses.instructorCourses).then(r => r.data.data),
    enabled: isAuthenticated,
  });

  const { data: analytics } = useQuery({
    queryKey: ['instructor-analytics'],
    queryFn: () => axios.get(apiRoutes.analytics.instructor).then(r => r.data.data),
    enabled: isAuthenticated,
  });

  const stats = [
    { label: 'Total Courses', value: courses?.length || 0, icon: BookOpen, color: 'text-blue-500' },
    { label: 'Total Students', value: analytics?.totalStudents || 0, icon: Users, color: 'text-green-500' },
    { label: 'Total Revenue', value: formatCurrency(analytics?.totalRevenue || 0), icon: DollarSign, color: 'text-yellow-500' },
    { label: 'Avg Rating', value: analytics?.avgRating?.toFixed(1) || '0.0', icon: Star, color: 'text-purple-500' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Instructor Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user?.firstName}!</p>
          </div>
          <Link
            href="/instructor/courses/new"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> New Course
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="border rounded-xl p-5 bg-card"
            >
              <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Courses */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Courses</h2>
          {isLoading ? (
            <div className="grid gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
              ))}
            </div>
          ) : courses?.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed rounded-xl">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No courses yet</h3>
              <p className="text-muted-foreground text-sm mb-4">Create your first course to start teaching</p>
              <Link href="/instructor/courses/new" className="text-primary font-medium hover:underline">
                Create a course
              </Link>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium">Course</th>
                    <th className="text-left px-4 py-3 text-sm font-medium hidden sm:table-cell">Status</th>
                    <th className="text-left px-4 py-3 text-sm font-medium hidden md:table-cell">Students</th>
                    <th className="text-left px-4 py-3 text-sm font-medium hidden md:table-cell">Revenue</th>
                    <th className="text-left px-4 py-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {courses?.map((course: any) => (
                    <tr key={course.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {course.thumbnail && (
                            <img src={course.thumbnail} className="w-10 h-8 rounded object-cover hidden sm:block" alt="" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{course.title}</p>
                            <p className="text-xs text-muted-foreground">{formatCurrency(course.price)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          course.status === 'PUBLISHED'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}>
                          {course.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm hidden md:table-cell">{course.totalStudents}</td>
                      <td className="px-4 py-3 text-sm hidden md:table-cell">{formatCurrency(course.revenue || 0)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/instructor/courses/${course.id}/edit`} className="text-xs text-primary hover:underline">
                            Edit
                          </Link>
                          <Link href={`/courses/${course.slug}`} className="text-xs text-muted-foreground hover:underline">
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          <Link href={`/instructor/courses/${course.id}/analytics`} className="text-xs text-muted-foreground hover:underline">
                            <BarChart2 className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
