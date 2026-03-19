import {
  Globe,
  Smartphone,
  Bot,
  Puzzle,
  BarChart3,
  ShoppingCart,
} from 'lucide-react';

const items = [
  {
    icon: Globe,
    title: 'Web Applications',
    description: 'Full-stack web apps with React, Next.js, or vanilla HTML/CSS/JS — deployed in minutes.',
    gradient: 'from-blue-500/20 to-cyan-500/20',
    iconColor: 'text-blue-400',
  },
  {
    icon: Smartphone,
    title: 'Mobile Apps',
    description: 'Cross-platform mobile apps with React Native or Flutter — ready for App Store & Play Store.',
    gradient: 'from-green-500/20 to-emerald-500/20',
    iconColor: 'text-green-400',
  },
  {
    icon: Bot,
    title: 'AI Agents & Bots',
    description: 'Intelligent chatbots, Slack bots, and autonomous AI agents that handle tasks for you.',
    gradient: 'from-violet-500/20 to-purple-500/20',
    iconColor: 'text-violet-400',
  },
  {
    icon: Puzzle,
    title: 'Chrome Extensions',
    description: 'Browser extensions that enhance productivity, scrape data, or add features to any website.',
    gradient: 'from-orange-500/20 to-amber-500/20',
    iconColor: 'text-orange-400',
  },
  {
    icon: BarChart3,
    title: 'Dashboards & Admin Panels',
    description: 'Data-driven dashboards, admin interfaces, and analytics tools with charts and tables.',
    gradient: 'from-pink-500/20 to-rose-500/20',
    iconColor: 'text-pink-400',
  },
  {
    icon: ShoppingCart,
    title: 'E-Commerce & SaaS',
    description: 'Online stores, subscription platforms, and SaaS products with payment integration.',
    gradient: 'from-teal-500/20 to-cyan-500/20',
    iconColor: 'text-teal-400',
  },
];

export default function WhatYouCanBuild() {
  return (
    <section className="relative px-4 py-24 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
            What you can build
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold text-white md:text-4xl">
            From idea to production in minutes
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base text-gray-400">
            Describe what you want, and ForJenta generates complete, ready-to-deploy applications.
          </p>
        </div>

        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.title}
              className="glass-card-hover group rounded-2xl p-6"
            >
              <div className={`flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient}`}>
                <item.icon className={`size-5 ${item.iconColor}`} />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold text-white">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
