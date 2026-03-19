import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight, Sparkles, Mail, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';
import { useToast } from '@/hooks/use-toast';
import { getPendingPrompt, clearPendingPrompt } from '@/hooks/usePromptFlow';
import { supabase } from '@/lib/supabase';
import logoImg from '@/assets/logo.png';

const AUTO_CONFIRM_EMAILS = new Set(['rmcknight@virphoneusa.com']);

type SignupStep = 'email' | 'otp' | 'password';

export default function Signup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const mapSupabaseUser = useAuthStore((s) => s.mapSupabaseUser);
  const setUser = useAuthStore((s) => s.setUser);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const addProject = useProjectStore((s) => s.addProject);

  const [step, setStep] = useState<SignupStep>('email');
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

  /** Step 1: Send OTP to email (or skip for auto-confirm emails) */
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: 'Email required', variant: 'destructive' });
      return;
    }
    setLoading(true);

    // Developer emails skip OTP entirely
    if (AUTO_CONFIRM_EMAILS.has(email.toLowerCase())) {
      toast({ title: 'Developer account detected', description: 'Skipping email verification.' });
      setStep('password');
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
    toast({ title: 'Verification code sent', description: `Check ${email} for a 4-digit code.` });
    setStep('otp');
    setCooldown(60);
    setLoading(false);
  };

  /** Step 2: Verify OTP */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) {
      toast({ title: 'Code required', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });
    if (error) {
      toast({ title: 'Invalid code', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    toast({ title: 'Email verified', description: 'Now set your password.' });
    setStep('password');
    setLoading(false);
  };

  /** Step 3: Set password and complete signup */
  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: 'Password too short', description: 'Minimum 6 characters', variant: 'destructive' });
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
        // If user already exists, try signing in directly
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
            handlePostAuthRedirect();
            return;
          }
        }
        toast({ title: 'Signup failed', description: signUpErr.message, variant: 'destructive' });
        setLoading(false);
        return;
      }

      // Auto-confirm via database function
      await supabase.rpc('auto_confirm_developer', { target_email: email });

      // Now sign in with password
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        toast({ title: 'Auto-confirm sign-in failed', description: signInErr.message, variant: 'destructive' });
        setLoading(false);
        return;
      }
      if (signInData.user) {
        const appUser = mapSupabaseUser(signInData.user);
        setUser(appUser);
        toast({ title: 'Welcome to ForJenta!', description: 'Developer account ready.' });
        handlePostAuthRedirect();
        return;
      }
      setLoading(false);
      return;
    }

    // Normal OTP-verified flow: user is already authenticated, just set password
    const { data, error } = await supabase.auth.updateUser({
      password,
      data: { username },
    });
    if (error) {
      toast({ title: 'Failed to set password', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    if (data.user) {
      const appUser = mapSupabaseUser(data.user);
      setUser(appUser);
      toast({ title: 'Welcome to ForJenta!', description: 'Your account is ready.' });
      handlePostAuthRedirect();
      // Don't setLoading(false) — navigating away
    } else {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    // Use Emergent Auth for Google OAuth
    signInWithGoogle();
  };

  const stepIndicator = (
    <div className="mb-6 flex items-center justify-center gap-2">
      {(['email', 'otp', 'password'] as SignupStep[]).map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`flex size-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              step === s
                ? 'bg-violet-600 text-white'
                : (['email', 'otp', 'password'].indexOf(step) > i)
                  ? 'bg-violet-600/20 text-violet-400'
                  : 'bg-white/5 text-gray-600'
            }`}
          >
            {i + 1}
          </div>
          {i < 2 && <div className="h-px w-6 bg-white/10" />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <Link to="/">
            <img src={logoImg} alt="ForJenta" className="size-16 rounded-xl object-contain shadow-lg shadow-violet-500/20" />
          </Link>
          <h1 className="mt-6 font-display text-2xl font-bold text-white">
            Start your free trial
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            3 days free · 25 credits · No credit card
          </p>
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

        {step === 'email' && (
          <>
            {/* Google OAuth via Emergent Auth */}
            <button
              onClick={handleGoogleAuth}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white transition-all hover:bg-white/10"
              data-testid="google-signup-btn"
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

            <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
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
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="gradient-primary mt-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:shadow-violet-500/30 disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                {loading ? 'Sending code...' : 'Send verification code'}
              </button>
            </form>
          </>
        )}

        {step === 'otp' && (
          <>
            {stepIndicator}
            <div className="mb-5 rounded-xl border border-violet-500/10 bg-violet-500/5 p-4 text-center">
              <Mail className="mx-auto mb-2 size-6 text-violet-400" />
              <p className="text-sm text-violet-300">
                We sent a 4-digit code to <span className="font-semibold text-white">{email}</span>
              </p>
              <p className="mt-1 text-xs text-gray-500">Check your inbox and spam folder</p>
            </div>
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <div>
                <label htmlFor="otp" className="mb-1.5 block text-sm font-medium text-gray-300">
                  Verification code
                </label>
                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="1234"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-lg font-bold tracking-[0.5em] text-white placeholder-gray-600 outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50"
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="gradient-primary flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                {loading ? 'Verifying...' : 'Verify code'}
              </button>
            </form>
            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={() => { setStep('email'); setOtp(''); setCooldown(0); }}
                className="text-sm text-gray-500 hover:text-gray-300"
              >
                ← Different email
              </button>
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

        {step === 'password' && (
          <>
            {stepIndicator}
            <div className="mb-5 rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4 text-center">
              <ShieldCheck className="mx-auto mb-2 size-6 text-emerald-400" />
              <p className="text-sm text-emerald-300">
                Email verified! Now set your password.
              </p>
            </div>
            <form onSubmit={handleSetPassword} className="flex flex-col gap-4">
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-300">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-gray-600 outline-none transition-colors focus:border-violet-500 focus:ring-1 focus:ring-violet-500/50"
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="gradient-primary flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                {loading ? 'Creating account...' : 'Start free trial'}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-violet-400 transition-colors hover:text-violet-300">
            Sign in
          </Link>
        </p>

        {step === 'email' && (
          <div className="mt-6 flex items-center justify-center gap-3 rounded-xl border border-violet-500/10 bg-violet-500/5 p-4">
            <Sparkles className="size-4 shrink-0 text-violet-400" />
            <p className="text-xs text-violet-300">
              New accounts receive a 3-day trial and 25 credits instantly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
