import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { getPendingPrompt, clearPendingPrompt } from '@/hooks/usePromptFlow';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

/**
 * Handles post-OAuth redirect:
 * - Detects when user just signed in via OAuth
 * - Checks for pending prompt in sessionStorage
 * - Creates a REAL backend project and redirects to workspace
 * - Sets auto-generate flag so IDEWorkspace picks up the prompt
 *
 * Should be called once at the App level.
 */
export function useOAuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loading = useAuthStore((s) => s.loading);
  const handledRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (handledRef.current) return;
    if (!isAuthenticated) return;

    const pending = getPendingPrompt();
    if (!pending) return;

    handledRef.current = true;

    console.log('[OAuthCallback] Detected pending prompt after auth:', pending.pendingPrompt);

    const createProjectAndRedirect = async () => {
      const projectName =
        pending.pendingPrompt
          .slice(0, 40)
          .replace(/\s+/g, '-')
          .replace(/[^a-zA-Z0-9-]/g, '')
          .toLowerCase() || 'new-project';

      try {
        const response = await fetch(`${API_URL}/api/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: projectName,
            prompt: pending.pendingPrompt,
            description: pending.pendingPrompt.slice(0, 200),
          }),
        });

        if (!response.ok) {
          throw new Error(`Project creation failed: HTTP ${response.status}`);
        }

        const data = await response.json();
        const projectId = data.project.project_id;

        console.log('[OAuthCallback] Created real backend project:', projectId);

        sessionStorage.setItem(
          'forjenta_auto_generate',
          JSON.stringify({
            projectId,
            prompt: pending.pendingPrompt,
            category: pending.selectedCategory,
          })
        );

        clearPendingPrompt();

        toast({
          title: 'Welcome!',
          description: 'Setting up your workspace from your prompt...',
        });

        navigate(`/project/${projectId}`, { replace: true });
      } catch (error) {
        console.error('[OAuthCallback] Failed to create project:', error);
        clearPendingPrompt();
        toast({
          title: 'Welcome!',
          description: 'Navigate to your workspace to start building.',
        });
        navigate('/workspace', { replace: true });
      }
    };

    createProjectAndRedirect();
  }, [isAuthenticated, loading, navigate, toast]);
}
