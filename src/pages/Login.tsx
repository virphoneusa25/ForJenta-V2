import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';
import { useToast } from '@/hooks/use-toast';
import { getPendingPrompt, clearPendingPrompt } from '@/hooks/usePromptFlow';
import logoImg from '@/assets/logo.png';

export default function Login() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const loginWithPassword = useAuthStore((s) => s.loginWithPassword);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const addProject = useProjectStore((s) => s.addProject);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const pending = getPendingPrompt();

  const handlePostAuthRedirect = () => {
    if (pending) {
      const projectId = `proj-${Date.now()}`;
      const projectName =
        pending.pendingPrompt
          .slice(0, 40)
          .replace(/\s+/g, '-')
          .replace(/[^a-zA-Z0-9-]/g, '')
          .toLowerCase() || 'new-project';

      addProject({
        id: projectId,
        name: projectName,
        description: pending.pendingPrompt,
        prompt: pending.pendingPrompt,
        categories: [pending.selectedCategory],
        createdAt: new Date().toISOString(),
        versions: [],
        files: [
          {
            id: `f-${Date.now()}-readme`,
            path: 'README.md',
            content: `# ${projectName}\n\nGenerating project from prompt:\n> ${pending.pendingPrompt}`,
            language: 'markdown',
          },
        ],
      });

      sessionStorage.setItem(
        'forjenta_auto_generate',
        JSON.stringify({
          projectId,
          prompt: pending.pendingPrompt,
          category: pending.selectedCategory,
        })
      );

      clearPendingPrompt();
      navigate(`/project/${projectId}`);
    } else {
      navigate('/workspace');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({ title: 'All fields required', description: 'Please enter email and password', variant: 'destructive' });
      return;
    }
    setLoading(true);

    const success = await loginWithPassword(email, password);
    if (success) {
      toast({ title: 'Welcome back!', description: 'Signed in successfully.' });
      handlePostAuthRedirect();
    } else {
      toast({ title: 'Login failed', description: 'Check your email and password', variant: 'destructive' });
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    // Use Emergent Auth for Google OAuth
    signInWithGoogle();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <Link to="/">
            <img src={logoImg} alt="ForJenta" className="size-16 rounded-xl object-contain shadow-lg shadow-violet-500/20" />
          </Link>
          <h1 className="mt-6 font-display text-2xl font-bold text-white">Welcome back</h1>
          <p className="mt-2 text-sm text-gray-500">Sign in to continue building</p>
        </div>

        {/* Pending prompt banner */}
        {pending && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-violet-400" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-violet-300">Your idea is saved</p>
              <p className="mt-0.5 truncate text-xs text-violet-400/70">
                &ldquo;{pending.pendingPrompt}&rdquo;
              </p>
            </div>
          </div>
        )}

        {/* Google OAuth via Emergent Auth */}
        <button
          onClick={handleGoogleAuth}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white transition-all hover:bg-white/10"
          data-testid="google-login-btn"
        >
          <svg className="size-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" />
          </svg>
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-gray-600">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Email form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50"
              required
              autoFocus
              data-testid="email-input"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50"
              required
              data-testid="password-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="gradient-primary mt-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:shadow-violet-500/30 disabled:opacity-50"
            data-testid="login-submit-btn"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          No account?{' '}
          <Link to="/signup" className="font-medium text-violet-400 transition-colors hover:text-violet-300">
            Start your free trial
          </Link>
        </p>
      </div>
    </div>
  );
}
