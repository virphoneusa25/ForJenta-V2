import { MapPin, ArrowRight } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

const openings = [
  {
    title: 'Senior Frontend Engineer',
    team: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
  },
  {
    title: 'AI/ML Engineer',
    team: 'AI Platform',
    location: 'Remote',
    type: 'Full-time',
  },
  {
    title: 'Product Designer',
    team: 'Design',
    location: 'Remote',
    type: 'Full-time',
  },
  {
    title: 'Developer Advocate',
    team: 'Growth',
    location: 'Remote',
    type: 'Full-time',
  },
  {
    title: 'Backend Engineer',
    team: 'Engineering',
    location: 'Remote',
    type: 'Full-time',
  },
];

const values = [
  { title: 'Ship fast', description: 'We bias toward action. Build, test, learn, repeat.' },
  { title: 'Think big', description: 'We are building the future of software development.' },
  { title: 'Stay humble', description: 'Great ideas come from everywhere. Listen and learn.' },
  { title: 'Own it', description: 'Take responsibility. Make decisions. Drive outcomes.' },
];

export default function Careers() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <section className="px-4 pt-32 pb-24 lg:px-8">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
              Careers
            </p>
            <h1 className="mt-3 font-display text-4xl font-bold text-white md:text-5xl">
              Build the future of AI development
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-base text-gray-400">
              Join a small, ambitious team reimagining how software gets built. Remote-first. High impact.
            </p>
          </div>

          {/* Values */}
          <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value) => (
              <div key={value.title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                <h3 className="font-display text-sm font-semibold text-white">{value.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{value.description}</p>
              </div>
            ))}
          </div>

          {/* Open positions */}
          <div className="mt-20">
            <h2 className="font-display text-2xl font-bold text-white">Open positions</h2>
            <p className="mt-2 text-sm text-gray-500">All positions are remote-first.</p>

            <div className="mt-8 flex flex-col gap-3">
              {openings.map((job) => (
                <a
                  key={job.title}
                  href="mailto:careers@forjenta.com"
                  className="group flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all hover:border-white/10 hover:bg-white/[0.04]"
                >
                  <div>
                    <h3 className="font-display text-sm font-semibold text-white group-hover:text-violet-300 transition-colors">
                      {job.title}
                    </h3>
                    <div className="mt-1.5 flex items-center gap-3">
                      <span className="text-xs text-gray-500">{job.team}</span>
                      <span className="text-gray-700">·</span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="size-3" />
                        {job.location}
                      </span>
                      <span className="text-gray-700">·</span>
                      <span className="text-xs text-gray-500">{job.type}</span>
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-gray-600 transition-all group-hover:translate-x-0.5 group-hover:text-violet-400" />
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
