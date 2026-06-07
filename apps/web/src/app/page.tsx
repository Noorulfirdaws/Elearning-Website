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
      <Footer />
    </main>
  );
}
