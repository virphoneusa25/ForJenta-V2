import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User } from '@/types';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;

  /** Initialize auth — call once on app mount */
  initialize: () => () => void;

  /** Map a Supabase user to our app User. Synchronous — no DB queries. */
  mapSupabaseUser: (su: SupabaseUser) => User;

  /** Set the user directly (used by the state listener) */
  setUser: (user: User | null) => void;
  setLoading: (v: boolean) => void;

  /** Email/password login (real Supabase) */
  loginWithPassword: (email: string, password: string) => Promise<boolean>;

  /** Email/password signup (real Supabase) */
  signupWithPassword: (email: string, password: string) => Promise<boolean>;

  /** Google OAuth (redirect-based) */
  signInWithGoogle: () => Promise<{ error?: string }>;

  /** Sign out */
  logout: () => Promise<void>;

  // ── Legacy mock methods kept for backward compatibility ──
  login: (email: string, password: string) => boolean;
  signup: (email: string, password: string) => boolean;
}

const DEMO_EMAIL = 'virphoneusa25@gmail.com';
const DEMO_PASSWORD = 'Star3660!';

/** Load legacy user from localStorage (for mock fallback) */
function loadLegacyUser(): User | null {
  const stored = localStorage.getItem('forjenta_user');
  if (stored) return JSON.parse(stored);
  return null;
}

function saveLegacyUser(user: User | null) {
  if (user) localStorage.setItem('forjenta_user', JSON.stringify(user));
  else localStorage.removeItem('forjenta_user');
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: loadLegacyUser(),
  isAuthenticated: !!loadLegacyUser(),
  loading: true,

  // ── Map Supabase user → app User (synchronous, no async/DB) ──
  // Note: credits are now managed via credit_accounts table, not on User object.
  // The User.credits field is kept for backward compatibility but the real
  // source of truth is the useCredits() hook.
  mapSupabaseUser: (su: SupabaseUser): User => ({
    id: su.id,
    email: su.email!,
    credits: 0, // Real balance comes from credit_accounts table
    trialEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    isTrialActive: true,
  }),

  setUser: (user) => {
    saveLegacyUser(user);
    set({ user, isAuthenticated: !!user });
  },

  setLoading: (v) => set({ loading: v }),

  // ── Initialize: getSession + onAuthStateChange ──
  initialize: () => {
    let mounted = true;
    const { mapSupabaseUser, setUser, setLoading } = get();

    // Safety #1: Check existing session (page refresh / OAuth return)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session?.user) {
        const appUser = mapSupabaseUser(session.user);
        setUser(appUser);
        console.log('[Auth] Session restored for', appUser.email);
      }
      setLoading(false);
    });

    // Safety #2: Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        console.log('[Auth] State change:', event);

        if (event === 'SIGNED_IN' && session?.user) {
          const appUser = mapSupabaseUser(session.user);
          setUser(appUser);
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setLoading(false);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          const appUser = mapSupabaseUser(session.user);
          setUser(appUser);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  },

  // ── Real Supabase email/password login ──
  loginWithPassword: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[Auth] Login error:', error.message);
      return false;
    }
    if (data.user) {
      const appUser = get().mapSupabaseUser(data.user);
      get().setUser(appUser);
    }
    return true;
  },

  // ── Real Supabase email/password signup ──
  signupWithPassword: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error('[Auth] Signup error:', error.message);
      return false;
    }
    if (data.user) {
      const appUser = get().mapSupabaseUser(data.user);
      get().setUser(appUser);
    }
    return true;
  },

  // ── Google OAuth (redirect — no loading state before redirect) ──
  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { access_type: 'offline', prompt: 'consent' },
        skipBrowserRedirect: false,
      },
    });

    if (error) {
      console.error('[Auth] Google OAuth error:', error.message);
      return { error: error.message };
    }
    // Auto-redirects on success — no state update needed
    return {};
  },

  // ── Sign out ──
  logout: async () => {
    await supabase.auth.signOut();
    saveLegacyUser(null);
    set({ user: null, isAuthenticated: false });
  },

  // ══════════════════════════════════════════════
  // Legacy mock methods (email/password fallback)
  // Used when Supabase is not configured for email auth
  // ══════════════════════════════════════════════
  login: (email: string, password: string) => {
    const storedUsers = JSON.parse(localStorage.getItem('forjenta_users') || '[]') as User[];
    const storedPasswords = JSON.parse(localStorage.getItem('forjenta_passwords') || '{}') as Record<string, string>;

    if (email === DEMO_EMAIL && password === DEMO_PASSWORD) {
      const user: User = {
        id: 'demo-user',
        email: DEMO_EMAIL,
        credits: 25,
        trialEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        isTrialActive: true,
      };
      saveLegacyUser(user);
      set({ user, isAuthenticated: true });
      return true;
    }

    const existingUser = storedUsers.find((u) => u.email === email);
    if (existingUser && storedPasswords[email] === password) {
      saveLegacyUser(existingUser);
      set({ user: existingUser, isAuthenticated: true });
      return true;
    }

    return false;
  },

  signup: (email: string, password: string) => {
    const storedUsers = JSON.parse(localStorage.getItem('forjenta_users') || '[]') as User[];
    const storedPasswords = JSON.parse(localStorage.getItem('forjenta_passwords') || '{}') as Record<string, string>;

    if (storedUsers.find((u) => u.email === email) || email === DEMO_EMAIL) {
      return false;
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      credits: 25,
      trialEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      isTrialActive: true,
    };

    storedUsers.push(newUser);
    storedPasswords[email] = password;
    localStorage.setItem('forjenta_users', JSON.stringify(storedUsers));
    localStorage.setItem('forjenta_passwords', JSON.stringify(storedPasswords));

    saveLegacyUser(newUser);
    set({ user: newUser, isAuthenticated: true });
    return true;
  },
}));
