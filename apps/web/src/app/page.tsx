import { SiteNav } from '@/components/marketing/site-nav';
import { Hero } from '@/components/marketing/hero';
import { SubjectsSection } from '@/components/marketing/subjects-section';
import { ParcoursSection } from '@/components/marketing/parcours-section';
import { AssistantSection } from '@/components/marketing/assistant-section';
import { FeaturedCourses } from '@/components/course/featured-courses';
import { FeaturesSection } from '@/components/layout/features-section';
import { TestimonialsSection } from '@/components/layout/testimonials-section';
import { PricingPreview } from '@/components/layout/pricing-preview';
import { Footer } from '@/components/layout/footer';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Nouveau design NoorAcademie — Nav + Hero premium (phase 1) */}
      <SiteNav />
      <Hero />
      <SubjectsSection />
      <ParcoursSection />
      <AssistantSection />
      {/* Sections ci-dessous : refonte progressive (prochaines étapes) */}
      <FeaturedCourses />
      <FeaturesSection />
      <TestimonialsSection />
      <PricingPreview />

      {/* ── Bandeau programme Djibouti ── */}
      <div className="bg-white border-y border-border py-8 px-4">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
          <div>
            <p className="text-2xl font-bold mb-1 text-foreground">🇩🇯 Programme scolaire de Djibouti</p>
            <p className="text-muted-foreground text-sm">Du collège au lycée — Mathématiques, Physique, SVT, Français, Histoire-Géo</p>
          </div>
          <a
            href="/apprendre"
            className="flex-shrink-0 bg-primary text-white font-bold px-8 py-3 rounded-full hover:bg-primary/90 transition-colors text-sm"
          >
            Commencer gratuitement →
          </a>
        </div>
      </div>

      <Footer />
    </main>
  );
}
