import {
  Zap,
  Shield,
  Code2,
  Layers,
  RefreshCcw,
  Users,
} from 'lucide-react';

const reasons = [
  {
    icon: Zap,
    title: '10x faster than coding by hand',
    description: 'Our AI pipeline generates full apps in under 60 seconds. What used to take days now takes a coffee break.',
  },
  {
    icon: Layers,
    title: '9-router pipeline architecture',
    description: 'Dedicated AI routers for planning, architecture, UI, backend, wiring, and debugging — not a single generic prompt.',
  },
  {
    icon: Code2,
    title: 'Production-ready output',
    description: 'Clean, semantic code with proper structure, responsive design, and accessibility baked in from the start.',
  },
  {
    icon: RefreshCcw,
    title: 'Built-in debug & repair',
    description: 'Errors detected automatically. The debug router diagnoses issues and the repair router fixes them — hands-free.',
  },
  {
    icon: Shield,
    title: 'Your code, your control',
    description: 'Full source code access. Download, export to GitHub, or deploy anywhere. No vendor lock-in.',
  },
  {
    icon: Users,
    title: 'Use your existing AI subscription',
    description: 'Bring your own ChatGPT, Claude, Gemini, or Copilot subscription. Pay once, build everywhere.',
  },
];

export default function WhyChooseUs() {
  return (
    <section className="relative px-4 py-24 lg:px-8">
      <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
            Why ForJenta
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-white md:text-4xl">
            Built for builders who ship fast
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-gray-400">
            Every feature is designed to remove friction between your idea and a working product.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((reason) => (
            <div
              key={reason.title}
              className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 transition-all duration-300 hover:border-white/10 hover:bg-white/[0.04]"
            >
              <div className="flex size-10 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                <reason.icon className="size-5 text-violet-400" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold text-white">
                {reason.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                {reason.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
