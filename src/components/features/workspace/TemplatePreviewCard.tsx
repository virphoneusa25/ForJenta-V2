interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  gradient: string;
}

const templates: Template[] = [
  { id: 't1', name: 'SaaS Dashboard', description: 'Admin panel with analytics, user management, and charts', category: 'Web', icon: '📊', gradient: 'from-blue-600/20 to-cyan-600/10' },
  { id: 't2', name: 'E-Commerce Store', description: 'Full storefront with cart, checkout, and product catalog', category: 'Web', icon: '🛒', gradient: 'from-emerald-600/20 to-green-600/10' },
  { id: 't3', name: 'Chat Application', description: 'Real-time messaging with channels and direct messages', category: 'Web', icon: '💬', gradient: 'from-violet-600/20 to-purple-600/10' },
  { id: 't4', name: 'Portfolio Site', description: 'Beautiful personal portfolio with projects and blog', category: 'Web', icon: '🎨', gradient: 'from-pink-600/20 to-rose-600/10' },
  { id: 't5', name: 'Task Manager', description: 'Kanban board with drag-and-drop and team collaboration', category: 'Web', icon: '✅', gradient: 'from-amber-600/20 to-yellow-600/10' },
  { id: 't6', name: 'Landing Page', description: 'Conversion-focused page with hero, features, and CTA', category: 'Web', icon: '🚀', gradient: 'from-fuchsia-600/20 to-pink-600/10' },
];

interface TemplatePreviewCardProps {
  onSelect: (prompt: string) => void;
}

export default function TemplatePreviewCard({ onSelect }: TemplatePreviewCardProps) {
  return (
    <>
      {templates.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(`Build a ${t.name.toLowerCase()}: ${t.description}`)}
          className="group flex flex-col overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02] text-left transition-all hover:border-white/10 hover:bg-white/[0.04] hover:shadow-lg hover:shadow-black/20"
        >
          {/* Gradient header */}
          <div className={`flex h-36 items-center justify-center bg-gradient-to-br ${t.gradient}`}>
            <span className="text-4xl transition-transform group-hover:scale-110">{t.icon}</span>
          </div>

          <div className="flex flex-1 flex-col p-3.5">
            <h3 className="text-sm font-medium text-white group-hover:text-violet-300">
              {t.name}
            </h3>
            <p className="mt-1 line-clamp-2 text-xs text-gray-500">
              {t.description}
            </p>
            <div className="mt-auto flex items-center pt-3">
              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-500">
                {t.category}
              </span>
              <span className="ml-auto text-[10px] font-medium text-violet-400 opacity-0 transition-opacity group-hover:opacity-100">
                Use template →
              </span>
            </div>
          </div>
        </button>
      ))}
    </>
  );
}
