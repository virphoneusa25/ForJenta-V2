import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Github } from 'lucide-react';

/**
 * GitHubCallback - Handles GitHub OAuth callback
 * Exchanges authorization code for access token
 */
export default function GitHubCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const handleGitHubCallback = useAuthStore((s) => s.handleGitHubCallback);
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Use useRef to prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      if (error) {
        console.error('[GitHubCallback] OAuth error:', error);
        toast({
          title: 'GitHub Connection Failed',
          description: searchParams.get('error_description') || error,
          variant: 'destructive',
        });
        navigate('/workspace', { replace: true });
        return;
      }

      if (!code) {
        console.error('[GitHubCallback] No authorization code');
        toast({
          title: 'GitHub Connection Failed',
          description: 'No authorization code received',
          variant: 'destructive',
        });
        navigate('/workspace', { replace: true });
        return;
      }

      console.log('[GitHubCallback] Exchanging code for token...');

      const success = await handleGitHubCallback(code, state || undefined);

      if (success) {
        toast({
          title: 'GitHub Connected',
          description: 'Your GitHub account has been connected successfully.',
        });
      } else {
        toast({
          title: 'GitHub Connection Failed',
          description: 'Failed to connect your GitHub account.',
          variant: 'destructive',
        });
      }

      navigate('/workspace', { replace: true });
    };

    processCallback();
  }, [searchParams, handleGitHubCallback, navigate, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <Github className="size-8 text-white" />
          <Loader2 className="size-6 animate-spin text-violet-500" />
        </div>
        <p className="text-sm text-gray-400">Connecting your GitHub account...</p>
      </div>
    </div>
  );
}
