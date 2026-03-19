import { useState } from 'react';
import {
  ArrowUp,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import { savePendingPrompt, clearPendingPrompt } from '@/hooks/usePromptFlow';
import AuthModal from './AuthModal';
import TrustBar from './TrustBar';
import heroBg from '@/assets/hero-bg.jpg';

const quickPrompts = [
  'Build a CRM dashboard',
  'Create a todo app with categories',
  'Design a landing page for my SaaS',
  'Make an AI chatbot interface',
  'Build an e-commerce storefront',
];

export default function HeroSection() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const addProject = useProjectStore((s) => s.addProject);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleSubmit = () => {
    setError(null);
    const trimmed = inputValue.trim();

    if (!trimmed) {
      toast({ title: 'Enter a prompt', description: 'Describe what you want to build', variant: 'destructive' });
      return;
    }

    // ── Unauthenticated: save prompt → show auth modal ──
    if (!isAuthenticated) {
      savePendingPrompt(trimmed, {
        intent: 'generate',
        source: 'homepage',
        category: 'Web',
      });
      setShowAuthModal(true);
      return;
    }

    // ── Authenticated: create project → redirect to workspace ──
    createProjectAndRedirect(trimmed);
  };

  /** Creates a placeholder project and redirects. Auto-generation happens in ProjectBuilder. */
  const createProjectAndRedirect = (prompt: string) => {
    const projectId = `proj-${Date.now()}`;
    const projectName = prompt
      .slice(0, 40)
      .replace(/\s+/g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '')
      .toLowerCase() || 'new-project';

    addProject({
      id: projectId,
      name: projectName,
      description: prompt,
      prompt,
      categories: ['Web'],
      createdAt: new Date().toISOString(),
      versions: [],
      files: [
        {
          id: `f-${Date.now()}-readme`,
          path: 'README.md',
          content: `# ${projectName}\n\nGenerating project from prompt:\n> ${prompt}\n\nPlease wait while the AI generates your files...`,
          language: 'markdown',
        },
      ],
    });

    // Store auto-generate intent so ProjectBuilder picks it up
    sessionStorage.setItem('forjenta_auto_generate', JSON.stringify({
      projectId,
      prompt,
      category: 'Web',
    }));

    toast({ title: 'Creating workspace...', description: 'Redirecting to your project.' });
    setInputValue('');
    clearPendingPrompt();
    navigate(`/project/${projectId}`);
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputValue(prompt);
  };

  return (
    <>
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 pt-16">
        {/* Background image with overlay */}
        <div className="pointer-events-none absolute inset-0">
          <img src={heroBg} alt="" className="h-full w-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/80 to-black" />
        </div>

        {/* Top glow */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-gradient-to-b from-violet-600/8 via-fuchsia-600/4 to-transparent blur-3xl" />

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/5 px-4 py-1.5">
            <Sparkles className="size-3.5 text-violet-400" />
            <span className="text-xs font-medium text-violet-300">
              3-day free trial · 25 credits · No credit card
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-5xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Build any app
            <br />
            <span className="text-gradient">with AI</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-gray-400">
            Describe what you want to build. Our AI generates production-ready
            code, instantly. Start free — no credit card required.
          </p>
        </div>

        {/* Prompt Input */}
        <div className="relative z-10 mt-10 w-full max-w-2xl">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-4 shadow-2xl shadow-violet-500/5 backdrop-blur-xl animate-glow-pulse">
            <textarea
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Describe the app you want to build..."
              className="w-full resize-none bg-transparent text-base text-white placeholder-gray-600 outline-none"
              rows={3}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-600">
                {isAuthenticated ? 'Press Enter to create project' : 'Press Enter to get started'}
              </p>
              <button
                onClick={handleSubmit}
                className="gradient-primary flex size-10 items-center justify-center rounded-xl text-white shadow-lg shadow-violet-500/20 transition-all hover:shadow-violet-500/30"
                aria-label="Generate"
              >
                <ArrowUp className="size-4" />
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-400" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Quick prompt chips */}
        <div className="relative z-10 mt-6 flex flex-wrap justify-center gap-2 px-4">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleQuickPrompt(prompt)}
              className="rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-xs text-gray-400 transition-all hover:border-white/15 hover:bg-white/[0.06] hover:text-gray-300"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Trust bar */}
        <TrustBar />

        {/* Bottom fade */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />
      </section>

      {/* Auth Modal — handles post-auth handoff internally */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        promptPreview={inputValue.trim()}
      />
    </>
  );
}
