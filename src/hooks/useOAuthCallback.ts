import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';
import { getPendingPrompt, clearPendingPrompt } from '@/hooks/usePromptFlow';
import { useToast } from '@/hooks/use-toast';

/**
 * Handles post-OAuth redirect:
 * - Detects when user just signed in via OAuth
 * - Checks for pending prompt in sessionStorage
 * - Creates a project and redirects to workspace if prompt exists
 *
 * Should be called once at the App level.
 */
export function useOAuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const loading = useAuthStore((s) => s.loading);
  const addProject = useProjectStore((s) => s.addProject);
  const handledRef = useRef(false);

  useEffect(() => {
    // Wait until auth initialization is done
    if (loading) return;

    // Only process once per mount
    if (handledRef.current) return;

    // Only process if user is authenticated
    if (!isAuthenticated) return;

    // Check for pending prompt from pre-auth flow
    const pending = getPendingPrompt();
    if (!pending) return;

    // Mark as handled to prevent double execution
    handledRef.current = true;

    console.log('[OAuthCallback] Detected pending prompt after auth:', pending.pendingPrompt);

    // Create a new project from the pending prompt
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
          content: `# ${projectName}\n\nGenerating project from prompt:\n> ${pending.pendingPrompt}\n\nPlease wait while the AI generates your files...`,
          language: 'markdown',
        },
      ],
    });

    // Set auto-generate flag for ProjectBuilder
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

    // Navigate to the workspace
    navigate(`/project/${projectId}`, { replace: true });
  }, [isAuthenticated, loading, navigate, addProject, toast]);
}
