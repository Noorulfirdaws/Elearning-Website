import { Navbar } from '@/components/layout/navbar';
import { HeroSection } from '@/components/layout/hero-section';
import { FeaturedCourses } from '@/components/course/featured-courses';
import { StatsSection } from '@/components/layout/stats-section';
import { FeaturesSection } from '@/components/layout/features-section';
import { TestimonialsSection } from '@/components/layout/testimonials-section';
import { PricingPreview } from '@/components/layout/pricing-preview';
import { Footer } from '@/components/layout/footer';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <FeaturedCourses />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingPreview />

      {/* ── Bandeau programme Djibouti ── */}
      <div className="bg-emerald-700 text-white py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <p className="text-2xl font-bold mb-1">🇩🇯 Programme scolaire de Djibouti</p>
            <p className="text-emerald-100 text-sm">Du collège au lycée — Mathématiques, Physique, SVT, Français, Histoire-Géo</p>
          </div>
          <a
            href="/apprendre"
            className="flex-shrink-0 bg-white text-emerald-700 font-bold px-8 py-3 rounded-full hover:bg-emerald-50 transition-colors text-sm"
          >
            Commencer gratuitement →
          </a>
        </div>
      </div>

      <Footer />
    </main>
  );
}
