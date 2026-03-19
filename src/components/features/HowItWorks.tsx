import { MessageSquareText, Cpu, Rocket } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: MessageSquareText,
    title: 'Describe your app',
    description: 'Type what you want to build in plain English. Be as specific or high-level as you like — our AI understands context.',
  },
  {
    number: '02',
    icon: Cpu,
    title: 'AI generates your code',
    description: 'Our 9-router pipeline plans, architects, and generates production-ready code across your entire stack in seconds.',
  },
  {
    number: '03',
    icon: Rocket,
    title: 'Preview, edit & deploy',
    description: 'See your app live instantly. Refine with the AI assistant, edit code directly, and deploy when ready.',
  },
];

export default function HowItWorks() {
  return (
    <section className="relative px-4 py-24 lg:px-8">
      {/* Subtle divider glow */}
      <div className="pointer-events-none absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />

      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
            How it works
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-white md:text-4xl">
            Three steps to your next app
          </h2>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.number} className="relative text-center md:text-left">
              {/* Connector line (desktop) */}
              {i < steps.length - 1 && (
                <div className="pointer-events-none absolute right-0 top-12 hidden h-px w-8 translate-x-full bg-gradient-to-r from-white/10 to-transparent md:block" />
              )}

              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 md:mx-0">
                <step.icon className="size-6 text-violet-400" />
              </div>

              <p className="mt-5 font-display text-xs font-bold uppercase tracking-widest text-violet-500/60">
                Step {step.number}
              </p>
              <h3 className="mt-2 font-display text-xl font-semibold text-white">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
