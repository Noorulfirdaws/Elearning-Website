'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Star, Users, Clock, BookOpen, ArrowRight } from 'lucide-react';

const mockCourses = [
  { id: '1', slug: 'full-stack-react-nodejs', title: 'Complete Full-Stack Development', subtitle: 'React, Node.js, PostgreSQL & Deployment', instructor: 'David Kim', category: 'Development', thumbnail: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=225&fit=crop', rating: 4.9, students: 12432, duration: '42h', price: 79, comparePrice: 199, level: 'Intermediate' },
  { id: '2', slug: 'ai-machine-learning', title: 'AI & Machine Learning Mastery', subtitle: 'Python, TensorFlow, PyTorch & LLMs', instructor: 'Sarah Chen', category: 'AI/ML', thumbnail: 'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=400&h=225&fit=crop', rating: 4.8, students: 8920, duration: '56h', price: 99, comparePrice: 249, level: 'Advanced' },
  { id: '3', slug: 'ui-ux-design-system', title: 'UI/UX Design Masterclass', subtitle: 'Figma, Design Systems & Prototyping', instructor: 'Emma Wilson', category: 'Design', thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=225&fit=crop', rating: 4.9, students: 15600, duration: '38h', price: 69, comparePrice: 179, level: 'Beginner' },
  { id: '4', slug: 'devops-kubernetes', title: 'DevOps & Kubernetes', subtitle: 'Docker, K8s, CI/CD & Cloud', instructor: 'Alex Rivera', category: 'DevOps', thumbnail: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=225&fit=crop', rating: 4.7, students: 6740, duration: '48h', price: 89, comparePrice: 219, level: 'Advanced' },
  { id: '5', slug: 'product-management', title: 'Product Management 2024', subtitle: 'Strategy, Roadmaps & Agile', instructor: 'Priya Patel', category: 'Business', thumbnail: 'https://images.unsplash.com/photo-1553028826-f4804a6dba3b?w=400&h=225&fit=crop', rating: 4.8, students: 9230, duration: '32h', price: 59, comparePrice: 149, level: 'Intermediate' },
  { id: '6', slug: 'data-science-python', title: 'Data Science with Python', subtitle: 'Pandas, NumPy, Visualization & ML', instructor: 'Marcus Johnson', category: 'Data Science', thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=225&fit=crop', rating: 4.9, students: 18900, duration: '60h', price: 0, isFree: true, level: 'Beginner' },
];

const levelColors: Record<string, string> = {
  Beginner: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  Intermediate: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  Advanced: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400',
};

export function FeaturedCourses() {
  return (
    <section className="py-24 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex items-end justify-between mb-12">
          <div>
            <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-blue-200 dark:border-blue-800">
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

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockCourses.map((course, i) => (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
            >
              <Link href={`/courses/${course.slug}`}>
                <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 card-hover group">
                  {/* Thumbnail */}
                  <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-gray-700">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {(course as any).isFree && (
                      <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">FREE</div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${levelColors[course.level]}`}>{course.level}</span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">{course.category}</div>
                    <h3 className="font-semibold text-base mb-1 line-clamp-2 group-hover:text-primary transition-colors">{course.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-1">{course.subtitle}</p>

                    <div className="flex items-center gap-1 text-sm mb-3">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-semibold">{course.rating}</span>
                      <span className="text-muted-foreground">({course.students.toLocaleString()})</span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {course.duration}</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {course.students.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">by {course.instructor}</div>
                      <div className="flex items-center gap-2">
                        {course.comparePrice && (
                          <span className="text-xs text-muted-foreground line-through">${course.comparePrice}</span>
                        )}
                        <span className={`font-bold text-lg ${(course as any).isFree ? 'text-green-600' : 'text-foreground'}`}>
                          {(course as any).isFree ? 'Free' : `$${course.price}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-10 md:hidden">
          <Link href="/catalog" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-full font-semibold hover:bg-primary/90 transition-colors">
            Browse all courses <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
