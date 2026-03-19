import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, Mail, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';
import { useToast } from '@/hooks/use-toast';
import { getPendingPrompt, clearPendingPrompt } from '@/hooks/usePromptFlow';
import { supabase } from '@/lib/supabase';
import logoImg from '@/assets/logo.png';

const AUTO_CONFIRM_EMAILS = new Set(['rmcknight@virphoneusa.com']);

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  promptPreview?: string;
}

type AuthView = 'main' | 'signup-email' | 'signup-otp' | 'signup-password' | 'signin';

export default function AuthModal({ isOpen, onClose, onSuccess, promptPreview }: AuthModalProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const mapSupabaseUser = useAuthStore((s) => s.mapSupabaseUser);
  const setUser = useAuthStore((s) => s.setUser);
  const loginWithPassword = useAuthStore((s) => s.loginWithPassword);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const addProject = useProjectStore((s) => s.addProject);

  const [view, setView] = useState<AuthView>('main');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (cooldown <= 0) {
      clearInterval(cooldownRef.current);
      return;
    }
    cooldownRef.current = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(cooldownRef.current);
  }, [cooldown > 0]);

  if (!isOpen) return null;

  const handlePostAuthHandoff = async () => {
    const pending = getPendingPrompt();
    if (pending) {
      toast({ title: 'Setting up your workspace...', description: 'Creating project from your prompt.' });

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
        JSON.stringify({ projectId, prompt: pending.pendingPrompt, category: pending.selectedCategory })
      );

      clearPendingPrompt();
      onClose();
      navigate(`/project/${projectId}`);
    } else {
      onClose();
      if (onSuccess) onSuccess();
      else navigate('/workspace');
    }
  };

  /** Google OAuth */
  const handleGoogleAuth = async () => {
    const { error } = await signInWithGoogle();
    if (error) {
      toast({ title: 'Google sign-in failed', description: error, variant: 'destructive' });
    }
  };

  /** Signup Step 1: Send OTP (or skip for auto-confirm emails) */
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    // Developer emails skip OTP entirely
    if (AUTO_CONFIRM_EMAILS.has(email.toLowerCase())) {
      toast({ title: 'Developer account detected', description: 'Skipping email verification.' });
      setView('signup-password');
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) {
      toast({ title: 'Failed to send code', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    toast({ title: 'Code sent!', description: `Check ${email} for a 4-digit code.` });
    setView('signup-otp');
    setCooldown(60);
    setLoading(false);
  };

  /** Signup Step 2: Verify OTP */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
    if (error) {
      toast({ title: 'Invalid code', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    toast({ title: 'Email verified!' });
    setView('signup-password');
    setLoading(false);
  };

  /** Signup Step 3: Set password */
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: 'Password too short', description: 'Min 6 characters', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const username = email.split('@')[0];

    // Auto-confirm developer emails: signUp → confirm → signIn
    if (AUTO_CONFIRM_EMAILS.has(email.toLowerCase())) {
      const { error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (signUpErr) {
        if (signUpErr.message?.includes('already registered')) {
          const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (signInErr) {
            toast({ title: 'Login failed', description: signInErr.message, variant: 'destructive' });
            setLoading(false);
            return;
          }
          if (signInData.user) {
            const appUser = mapSupabaseUser(signInData.user);
            setUser(appUser);
            toast({ title: 'Welcome back!' });
            await handlePostAuthHandoff();
            return;
          }
        }
        toast({ title: 'Signup failed', description: signUpErr.message, variant: 'destructive' });
        setLoading(false);
        return;
      }
      await supabase.rpc('auto_confirm_developer', { target_email: email });
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        toast({ title: 'Auto-confirm sign-in failed', description: signInErr.message, variant: 'destructive' });
        setLoading(false);
        return;
      }
      if (signInData.user) {
        const appUser = mapSupabaseUser(signInData.user);
        setUser(appUser);
        toast({ title: 'Welcome to ForJenta!' });
        await handlePostAuthHandoff();
        return;
      }
      setLoading(false);
      return;
    }

    // Normal OTP-verified flow
    const { data, error } = await supabase.auth.updateUser({ password, data: { username } });
    if (error) {
      toast({ title: 'Failed to set password', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    if (data.user) {
      const appUser = mapSupabaseUser(data.user);
      setUser(appUser);
      toast({ title: 'Welcome to ForJenta!' });
      await handlePostAuthHandoff();
    } else {
      setLoading(false);
    }
  };

  /** Sign in with password */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({ title: 'All fields required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const success = await loginWithPassword(email, password);
    if (success) {
      toast({ title: 'Welcome back!' });
      await handlePostAuthHandoff();
    } else {
      toast({ title: 'Invalid credentials', description: 'Check your email and password', variant: 'destructive' });
      setLoading(false);
    }
  };

  const resetView = () => {
    setView('main');
    setEmail('');
    setOtp('');
    setPassword('');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl shadow-violet-500/5" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-white/5 hover:text-white" aria-label="Close">
          <X className="size-4" />
        </button>

        <div className="h-1 w-full gradient-primary" />

        <div className="p-8">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <img src={logoImg} alt="ForJenta" className="size-16 rounded-xl object-contain shadow-lg shadow-violet-500/20" />
          </div>

          {/* ─── Main view ─── */}
          {view === 'main' && (
            <>
              <h2 className="text-center font-display text-2xl font-bold text-white">Start your free trial</h2>
              <p className="mt-2 text-center text-sm text-gray-400">Get 3 free days and 25 credits to start building</p>

              {promptPreview && (
                <div className="mt-5 flex items-start gap-3 rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3">
                  <Sparkles className="mt-0.5 size-4 shrink-0 text-violet-400" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-violet-300">Your idea is saved</p>
                    <p className="mt-0.5 truncate text-xs text-violet-400/70">&ldquo;{promptPreview}&rdquo;</p>
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3">
                <button onClick={handleGoogleAuth} disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white transition-all hover:bg-white/10 disabled:opacity-50">
                  <svg className="size-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"/></svg>
                  Continue with Google
                </button>
              </div>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-gray-500">or</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <button onClick={() => setView('signup-email')} className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white transition-all hover:bg-white/10">
                <Mail className="size-4" />
                Continue with Email
              </button>

              <p className="mt-6 text-center text-sm text-gray-500">
                Already have an account?{' '}
                <button onClick={() => setView('signin')} className="font-medium text-violet-400 transition-colors hover:text-violet-300">Sign in</button>
              </p>
              <p className="mt-4 text-center text-xs text-gray-600">No credit card required · Cancel anytime</p>
            </>
          )}

          {/* ─── Signup: Enter email ─── */}
          {view === 'signup-email' && (
            <>
              <h2 className="text-center font-display text-xl font-bold text-white">Create your account</h2>
              <p className="mt-2 text-center text-sm text-gray-400">We will send a verification code to your email</p>

              <form onSubmit={handleSendOtp} className="mt-5 flex flex-col gap-4">
                <div>
                  <label htmlFor="modal-email" className="mb-1.5 block text-sm font-medium text-gray-300">Email</label>
                  <input id="modal-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50" required autoFocus />
                </div>
                <button type="submit" disabled={loading} className="gradient-primary mt-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                  {loading ? 'Sending code...' : 'Send verification code'}
                </button>
              </form>
              <button onClick={resetView} className="mt-4 w-full text-center text-sm text-gray-500 transition-colors hover:text-gray-300">← Back</button>
            </>
          )}

          {/* ─── Signup: Verify OTP ─── */}
          {view === 'signup-otp' && (
            <>
              <h2 className="text-center font-display text-xl font-bold text-white">Verify your email</h2>
              <div className="mt-4 rounded-xl border border-violet-500/10 bg-violet-500/5 p-4 text-center">
                <Mail className="mx-auto mb-2 size-6 text-violet-400" />
                <p className="text-sm text-violet-300">Code sent to <span className="font-semibold text-white">{email}</span></p>
                <p className="mt-1 text-xs text-gray-500">Check inbox and spam folder</p>
              </div>
              <form onSubmit={handleVerifyOtp} className="mt-5 flex flex-col gap-4">
                <div>
                  <label htmlFor="modal-otp" className="mb-1.5 block text-sm font-medium text-gray-300">4-digit code</label>
                  <input id="modal-otp" type="text" inputMode="numeric" maxLength={4} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="1234" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-lg font-bold tracking-[0.5em] text-white placeholder-gray-600 outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50" required autoFocus />
                </div>
                <button type="submit" disabled={loading} className="gradient-primary flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                  {loading ? 'Verifying...' : 'Verify code'}
                </button>
              </form>
              <div className="mt-4 flex items-center justify-between">
                <button onClick={() => { setView('signup-email'); setOtp(''); setCooldown(0); }} className="text-sm text-gray-500 hover:text-gray-300">← Different email</button>
                <button
                  onClick={async () => {
                    setCooldown(60);
                    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
                    if (error) toast({ title: 'Resend failed', description: error.message, variant: 'destructive' });
                    else toast({ title: 'Code resent', description: `New code sent to ${email}` });
                  }}
                  disabled={cooldown > 0}
                  className="text-sm font-medium text-violet-400 transition-colors hover:text-violet-300 disabled:text-gray-600 disabled:cursor-not-allowed"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </button>
              </div>
            </>
          )}

          {/* ─── Signup: Set password ─── */}
          {view === 'signup-password' && (
            <>
              <h2 className="text-center font-display text-xl font-bold text-white">Set your password</h2>
              <div className="mt-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4 text-center">
                <ShieldCheck className="mx-auto mb-2 size-6 text-emerald-400" />
                <p className="text-sm text-emerald-300">Email verified! Almost done.</p>
              </div>
              <form onSubmit={handleSetPassword} className="mt-5 flex flex-col gap-4">
                <div>
                  <label htmlFor="modal-password" className="mb-1.5 block text-sm font-medium text-gray-300">Password</label>
                  <input id="modal-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 6 characters" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50" required autoFocus />
                </div>
                <button type="submit" disabled={loading} className="gradient-primary flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                  {loading ? 'Creating account...' : 'Start free trial'}
                </button>
              </form>
            </>
          )}

          {/* ─── Sign in ─── */}
          {view === 'signin' && (
            <>
              <h2 className="text-center font-display text-xl font-bold text-white">Welcome back</h2>
              <p className="mt-2 text-center text-sm text-gray-400">Sign in to continue building</p>

              <form onSubmit={handleSignIn} className="mt-5 flex flex-col gap-4">
                <div>
                  <label htmlFor="signin-email" className="mb-1.5 block text-sm font-medium text-gray-300">Email</label>
                  <input id="signin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50" required autoFocus />
                </div>
                <div>
                  <label htmlFor="signin-password" className="mb-1.5 block text-sm font-medium text-gray-300">Password</label>
                  <input id="signin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50" required />
                </div>
                <button type="submit" disabled={loading} className="gradient-primary mt-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>
              <button onClick={resetView} className="mt-4 w-full text-center text-sm text-gray-500 transition-colors hover:text-gray-300">← Back</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
