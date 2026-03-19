import { Book, MessageCircle, FileText, ExternalLink } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const resources = [
  {
    icon: Book,
    title: 'Documentation',
    description: 'Comprehensive guides, API references, and tutorials to get the most out of ForJenta.',
    cta: 'Read docs',
    href: '#',
  },
  {
    icon: MessageCircle,
    title: 'Community',
    description: 'Join thousands of builders sharing tips, templates, and projects. Get help and give back.',
    cta: 'Join community',
    href: '#',
  },
  {
    icon: FileText,
    title: 'Blog',
    description: 'Product updates, engineering deep dives, and tutorials from the ForJenta team.',
    cta: 'Read blog',
    href: '#',
  },
];

const guides = [
  { title: 'Getting started with ForJenta', tag: 'Beginner' },
  { title: 'Understanding the 9-router pipeline', tag: 'Architecture' },
  { title: 'Building a full-stack SaaS app', tag: 'Tutorial' },
  { title: 'Integrating custom AI models', tag: 'Advanced' },
  { title: 'Deploying your generated apps', tag: 'DevOps' },
  { title: 'Best practices for AI prompts', tag: 'Tips' },
];

export default function Resources() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <section className="px-4 pt-32 pb-24 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
              Resources
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold text-white md:text-5xl">
              Learn, build, and connect
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-base text-gray-400">
              Everything you need to become a power user and build amazing apps with AI.
            </p>
          </div>

          {/* Resource cards */}
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {resources.map((resource) => (
              <a
                key={resource.title}
                href={resource.href}
                className="group flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 transition-all hover:border-white/10 hover:bg-white/[0.04]"
              >
                <div className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                  <resource.icon className="size-5 text-violet-400" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-white">{resource.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-500">{resource.description}</p>
                <div className="mt-5 flex items-center gap-1.5 text-sm font-medium text-violet-400 transition-colors group-hover:text-violet-300">
                  {resource.cta}
                  <ExternalLink className="size-3.5" />
                </div>
              </a>
            ))}
          </div>

          {/* Popular guides */}
          <div className="mt-20">
            <h2 className="font-display text-2xl font-bold text-white">Popular guides</h2>
            <p className="mt-2 text-sm text-gray-500">Start here if you are new to ForJenta.</p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {guides.map((guide) => (
                <a
                  key={guide.title}
                  href="#"
                  className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/10 hover:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-3">
                    <span className="rounded-md bg-violet-500/10 px-2 py-1 text-[10px] font-semibold text-violet-400">
                      {guide.tag}
                    </span>
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                      {guide.title}
                    </span>
                  </div>
                  <ExternalLink className="size-3.5 text-gray-600 transition-colors group-hover:text-violet-400" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
