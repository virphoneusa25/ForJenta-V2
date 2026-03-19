import { Link } from 'react-router-dom';
import { Building2, Shield, Users, Headphones, ArrowRight, CheckCircle2 } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const features = [
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Share projects, manage permissions, and collaborate in real-time with your entire engineering team.',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'SSO/SAML, SOC 2 compliance, data encryption at rest and in transit, and audit logging.',
  },
  {
    icon: Building2,
    title: 'Custom AI Models',
    description: 'Bring your own models or use our fine-tuned pipelines. Custom training on your codebase available.',
  },
  {
    icon: Headphones,
    title: 'Dedicated Support',
    description: 'Priority support with a dedicated account manager, SLA guarantees, and onboarding assistance.',
  },
];

const included = [
  'Unlimited credits',
  'Unlimited team members',
  'Custom AI model training',
  'SSO & SAML authentication',
  'SOC 2 compliance',
  'Priority support & SLA',
  'Dedicated account manager',
  'Custom integrations',
  'On-premise deployment option',
  'Audit logging & analytics',
];

export default function Enterprise() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <section className="px-4 pt-32 pb-24 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
              Enterprise
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold text-white md:text-5xl">
              ForJenta for teams
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-base text-gray-400">
              Scale AI-powered development across your organization with enterprise-grade security, collaboration, and support.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <a
                href="mailto:enterprise@forjenta.com"
                className="gradient-primary flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20"
              >
                Contact Sales
                <ArrowRight className="size-4" />
              </a>
              <Link
                to="/pricing"
                className="rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-medium text-gray-300 transition-all hover:bg-white/10 hover:text-white"
              >
                View all plans
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="mt-20 grid gap-6 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7">
                <div className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <feature.icon className="size-5 text-violet-400" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* What is included */}
          <div className="mt-20 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 md:p-12">
            <h2 className="font-display text-2xl font-bold text-white">Everything included</h2>
            <p className="mt-2 text-sm text-gray-500">Custom pricing based on team size and requirements.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {included.map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle2 className="size-4 shrink-0 text-violet-400" />
                  <span className="text-sm text-gray-300">{item}</span>
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
