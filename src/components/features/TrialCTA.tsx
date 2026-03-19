import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function TrialCTA() {
  return (
    <section className="relative px-4 py-24 lg:px-8">
      <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />

      <div className="mx-auto max-w-3xl text-center">
        {/* Glow backdrop */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[500px] rounded-full bg-gradient-to-br from-violet-600/10 via-fuchsia-600/5 to-transparent blur-3xl" />

        <div className="relative">
          <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10">
            <Sparkles className="size-6 text-violet-400" />
          </div>

          <h2 className="font-display text-3xl font-bold text-white md:text-4xl lg:text-5xl">
            Ready to build your next app?
          </h2>
          <p className="mx-auto mt-5 max-w-md text-base text-gray-400 leading-relaxed">
            Start your 3-day free trial with 25 credits. No credit card required.
            Go from idea to deployed app in minutes.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/signup"
              className="gradient-primary group flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:shadow-violet-500/30"
            >
              Start free trial
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/pricing"
              className="rounded-xl border border-white/10 bg-white/5 px-8 py-3.5 text-sm font-medium text-gray-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              View pricing
            </Link>
          </div>

          <p className="mt-6 text-xs text-gray-600">
            Free trial · 25 credits · No credit card · Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}
