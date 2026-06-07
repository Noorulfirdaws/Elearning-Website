import { Metadata } from 'next';
import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { PricingPreview } from '@/components/layout/pricing-preview';
import { Check } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Simple, transparent pricing for individuals, teams, and enterprises.',
};

const faqs = [
  { q: 'Can I cancel anytime?', a: 'Yes, you can cancel your subscription at any time. Your access continues until the end of the billing period.' },
  { q: 'Is there a free trial?', a: 'Yes! Pro plan comes with a 14-day free trial. No credit card required.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit cards (Visa, Mastercard, Amex), PayPal, and bank transfers for enterprise plans.' },
  { q: 'Do you offer student discounts?', a: 'Yes! Students get 50% off any plan with a valid .edu email address.' },
  { q: 'Can I switch plans?', a: 'Absolutely. You can upgrade or downgrade your plan at any time, with prorated billing.' },
  { q: 'Is my data secure?', a: 'We use industry-standard encryption and are SOC2 Type II compliant. Your data is always safe.' },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-16">
        <PricingPreview />

        {/* FAQ */}
        <section className="py-24 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-3xl font-bold text-center mb-12">Frequently asked questions</h2>
            <div className="space-y-6">
              {faqs.map((faq) => (
                <div key={faq.q} className="border-b border-gray-100 dark:border-gray-800 pb-6">
                  <h3 className="font-semibold mb-2">{faq.q}</h3>
                  <p className="text-muted-foreground">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </div>
  );
}
