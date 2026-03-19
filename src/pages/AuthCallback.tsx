import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Loader2 } from 'lucide-react';

/**
 * AuthCallback - Handles Emergent Auth OAuth callback
 * Extracts session_id from URL fragment and exchanges it for a session
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const exchangeSessionId = useAuthStore((s) => s.exchangeSessionId);
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Use useRef to prevent double processing in StrictMode
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      // Extract session_id from URL fragment (hash)
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.substring(1)); // Remove the leading #
      const sessionId = params.get('session_id');

      if (!sessionId) {
        console.error('[AuthCallback] No session_id found');
        navigate('/login', { replace: true });
        return;
      }

      console.log('[AuthCallback] Exchanging session_id...');

      const result = await exchangeSessionId(sessionId);

      if (result.success) {
        console.log('[AuthCallback] Authentication successful');
        // Clear the hash from URL and navigate to workspace
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/workspace', { replace: true });
      } else {
        console.error('[AuthCallback] Authentication failed:', result.error);
        navigate('/login', { replace: true });
      }
    };

    processAuth();
  }, [exchangeSessionId, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="size-8 animate-spin text-violet-500" />
        <p className="text-sm text-gray-400">Signing you in...</p>
      </div>
    </div>
  );
}
