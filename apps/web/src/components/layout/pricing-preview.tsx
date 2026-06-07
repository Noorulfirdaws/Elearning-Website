'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Check, Zap } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started',
    features: ['Access to 100+ free courses', 'Community access', 'Course certificates', 'Mobile app access'],
    cta: 'Get started free',
    href: '/register',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: 'per month',
    description: 'For serious learners',
    features: ['Unlimited course access', 'AI tutor assistant', 'Priority support', 'Offline downloads', 'Advanced certificates', 'Course completion badges'],
    cta: 'Start Pro trial',
    href: '/register?plan=pro',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: 'per team',
    description: 'For organizations',
    features: ['Everything in Pro', 'Team management', 'Custom branding', 'SSO integration', 'Dedicated CSM', 'Analytics dashboard', 'API access'],
    cta: 'Contact sales',
    href: '/contact',
    highlighted: false,
  },
];

export function PricingPreview() {
  return (
    <section className="py-24 bg-gray-50 dark:bg-gray-950">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold mb-4">Simple, transparent <span className="text-gradient">pricing</span></h2>
          <p className="text-xl text-muted-foreground">Start free, upgrade when you're ready</p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl p-8 ${plan.highlighted
                ? 'bg-gradient-to-b from-blue-600 to-indigo-600 text-white shadow-2xl shadow-blue-500/25 scale-105'
                : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
                  <Zap className="w-3 h-3" /> {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <p className={`text-sm font-semibold mb-1 ${plan.highlighted ? 'text-blue-100' : 'text-muted-foreground'}`}>{plan.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className={`text-sm ${plan.highlighted ? 'text-blue-200' : 'text-muted-foreground'}`}>/{plan.period}</span>
                </div>
                <p className={`text-sm mt-1 ${plan.highlighted ? 'text-blue-100' : 'text-muted-foreground'}`}>{plan.description}</p>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${plan.highlighted ? 'bg-white/20' : 'bg-green-50 dark:bg-green-950'}`}>
                      <Check className={`w-3 h-3 ${plan.highlighted ? 'text-white' : 'text-green-600'}`} />
                    </div>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`block text-center py-3 rounded-xl font-semibold transition-all ${plan.highlighted
                  ? 'bg-white text-blue-600 hover:bg-blue-50'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
