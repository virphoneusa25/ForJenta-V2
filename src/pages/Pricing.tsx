import { Link } from 'react-router-dom';
import { Check, ArrowRight } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { pricingPlans } from '@/constants/mockData';

const faqs = [
  {
    q: 'What are credits?',
    a: 'Credits are used for AI code generation. Each generation request uses 1 credit. The free trial includes 25 credits to get started.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes. Cancel your subscription at any time. Access continues until the end of your billing period.',
  },
  {
    q: 'What happens after my trial ends?',
    a: 'After 3 days, you can upgrade to Pro for continued access. Your projects and generated code remain yours forever.',
  },
  {
    q: 'Do you offer refunds?',
    a: '30-day money-back guarantee. Not satisfied? Contact us for a full refund within 30 days of purchase.',
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <section className="px-4 pt-32 pb-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
              Pricing
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold text-white md:text-5xl">
              Start building for free
            </h1>
            <p className="mx-auto mt-4 max-w-md text-base text-gray-400">
              3-day free trial with 25 credits. No credit card required.
              Upgrade when you are ready.
            </p>
          </div>

          {/* Plans */}
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-8 transition-all ${
                  plan.isPopular
                    ? 'border-violet-500/30 bg-zinc-950 shadow-xl shadow-violet-500/5'
                    : 'border-white/[0.06] bg-zinc-950 hover:border-white/10'
                }`}
              >
                {plan.isPopular && (
                  <div className="gradient-primary absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-semibold text-white shadow-lg shadow-violet-500/20">
                    Most Popular
                  </div>
                )}

                <h3 className="font-display text-lg font-semibold text-white">
                  {plan.name}
                </h3>
                <p className="mt-1.5 text-sm text-gray-500">
                  {plan.description}
                </p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold text-gradient">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-sm text-gray-500">{plan.period}</span>
                  )}
                </div>

                <Link
                  to={plan.name === 'Enterprise' ? '/enterprise' : '/signup'}
                  className={`mt-8 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
                    plan.isPopular
                      ? 'gradient-primary text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30'
                      : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
                  }`}
                >
                  {plan.ctaText}
                  <ArrowRight className="size-3.5" />
                </Link>

                <ul className="mt-8 flex flex-1 flex-col gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check className="mt-0.5 size-4 shrink-0 text-violet-400" />
                      <span className="text-sm text-gray-400">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <div className="mx-auto mt-24 max-w-2xl">
            <h2 className="mb-10 text-center font-display text-2xl font-bold text-white">
              Frequently asked questions
            </h2>
            <div className="flex flex-col gap-4">
              {faqs.map((faq) => (
                <div key={faq.q} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
                  <h3 className="font-display text-sm font-semibold text-white">{faq.q}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
