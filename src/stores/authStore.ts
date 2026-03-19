import { create } from 'zustand';
import type { User } from '@/types';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

interface GitHubConnection {
  connected: boolean;
  github_login: string | null;
  github_avatar: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  githubConnection: GitHubConnection | null;

  /** Initialize auth — check existing session */
  initialize: () => Promise<void>;

  /** Set the user directly */
  setUser: (user: User | null) => void;
  setLoading: (v: boolean) => void;

  /** Exchange Emergent session_id for session */
  exchangeSessionId: (sessionId: string) => Promise<{ success: boolean; error?: string }>;

  /** Start Google OAuth via Emergent Auth */
  signInWithGoogle: () => void;

  /** Email/password login (Supabase fallback) */
  loginWithPassword: (email: string, password: string) => Promise<boolean>;

  /** Sign out */
  logout: () => Promise<void>;

  /** GitHub connection methods */
  connectGitHub: () => Promise<string>;
  handleGitHubCallback: (code: string, state?: string) => Promise<boolean>;
  disconnectGitHub: () => Promise<boolean>;
  checkGitHubStatus: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  loading: true,
  githubConnection: null,

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  setLoading: (v) => set({ loading: v }),

  // Initialize: Check existing session via /api/auth/me
  initialize: async () => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
    if (window.location.hash?.includes('session_id=')) {
      set({ loading: false });
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const user: User = {
          id: data.user_id,
          email: data.email,
          credits: 25,
          trialEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          isTrialActive: true,
          name: data.name,
          picture: data.picture,
        };
        set({ 
          user, 
          isAuthenticated: true,
          githubConnection: {
            connected: data.github_connected || false,
            github_login: data.github_login || null,
            github_avatar: null,
          }
        });
      }
    } catch (error) {
      console.log('[Auth] No existing session');
    } finally {
      set({ loading: false });
    }
  },

  // Exchange Emergent Auth session_id for session
  exchangeSessionId: async (sessionId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.detail || 'Authentication failed' };
      }

      const data = await response.json();
      
      if (data.success && data.user) {
        const user: User = {
          id: data.user.user_id,
          email: data.user.email,
          credits: 25,
          trialEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          isTrialActive: true,
          name: data.user.name,
          picture: data.user.picture,
        };
        set({ user, isAuthenticated: true });
        return { success: true };
      }

      return { success: false, error: 'Invalid response' };
    } catch (error) {
      console.error('[Auth] Session exchange error:', error);
      return { success: false, error: 'Network error' };
    }
  },

  // Start Google OAuth via Emergent Auth
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  signInWithGoogle: () => {
    const redirectUrl = window.location.origin + '/workspace';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  },

  // Email/password login (Supabase fallback - kept for compatibility)
  loginWithPassword: async (email: string, password: string) => {
    // This still uses Supabase for email/password auth
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      console.error('[Auth] Login error:', error.message);
      return false;
    }
    
    if (data.user) {
      const user: User = {
        id: data.user.id,
        email: data.user.email!,
        credits: 25,
        trialEndsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        isTrialActive: true,
      };
      set({ user, isAuthenticated: true });
    }
    return true;
  },

  // Sign out
  logout: async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('[Auth] Logout error:', error);
    }
    
    // Also sign out from Supabase if used
    try {
      const { supabase } = await import('@/lib/supabase');
      await supabase.auth.signOut();
    } catch {}
    
    localStorage.removeItem('forjenta_user');
    set({ user: null, isAuthenticated: false, githubConnection: null });
  },

  // Get GitHub connect URL
  connectGitHub: async () => {
    const response = await fetch(`${API_URL}/api/github/connect`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to get GitHub authorization URL');
    }
    
    const data = await response.json();
    return data.authorization_url;
  },

  // Handle GitHub OAuth callback
  handleGitHubCallback: async (code: string, state?: string) => {
    try {
      const response = await fetch(`${API_URL}/api/github/callback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code, state }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('[GitHub] Callback error:', error);
        return false;
      }

      const data = await response.json();
      
      if (data.success) {
        set({
          githubConnection: {
            connected: true,
            github_login: data.github_login,
            github_avatar: data.github_avatar,
          }
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error('[GitHub] Callback error:', error);
      return false;
    }
  },

  // Disconnect GitHub
  disconnectGitHub: async () => {
    try {
      const response = await fetch(`${API_URL}/api/github/disconnect`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        set({ githubConnection: { connected: false, github_login: null, github_avatar: null } });
        return true;
      }
      return false;
    } catch (error) {
      console.error('[GitHub] Disconnect error:', error);
      return false;
    }
  },

  // Check GitHub connection status
  checkGitHubStatus: async () => {
    try {
      const response = await fetch(`${API_URL}/api/github/status`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        set({
          githubConnection: {
            connected: data.connected,
            github_login: data.github_login,
            github_avatar: data.github_avatar,
          }
        });
      }
    } catch (error) {
      console.error('[GitHub] Status check error:', error);
    }
  },
}));
