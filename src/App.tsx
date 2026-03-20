import { Suspense, lazy, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { useAuthStore } from '@/stores/authStore';
import { useOAuthCallback } from '@/hooks/useOAuthCallback';

const Home = lazy(() => import('@/pages/Home'));
const Pricing = lazy(() => import('@/pages/Pricing'));
const Enterprise = lazy(() => import('@/pages/Enterprise'));
const Careers = lazy(() => import('@/pages/Careers'));
const Resources = lazy(() => import('@/pages/Resources'));
const Login = lazy(() => import('@/pages/Login'));
const Signup = lazy(() => import('@/pages/Signup'));
const ProjectBuilder = lazy(() => import('@/pages/ProjectBuilder'));
const IDEWorkspace = lazy(() => import('@/pages/IDEWorkspace'));
const AdminDashboard = lazy(() => import('@/pages/AdminDashboard'));
const Workspace = lazy(() => import('@/pages/Workspace'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Billing = lazy(() => import('@/pages/Billing'));
const AuthCallback = lazy(() => import('@/pages/AuthCallback'));
const GitHubCallback = lazy(() => import('@/pages/GitHubCallback'));

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="size-8 rounded-full border-2 border-white/10 border-t-violet-500 animate-spin" />
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      <h1 className="font-display text-6xl font-bold text-gradient">404</h1>
      <p className="mt-4 text-gray-500">Page not found</p>
      <a
        href="/"
        className="gradient-primary mt-6 rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20"
      >
        Go Home
      </a>
    </div>
  );
}

/** Handles auth initialization and OAuth callback processing */
function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);
  const location = useLocation();

  // CRITICAL: Check URL for session_id synchronously during render
  // This prevents race conditions where initialize() runs before AuthCallback
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  // Initialize auth session on app mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Handle OAuth redirect + pending prompt handoff
  useOAuthCallback();

  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/enterprise" element={<Enterprise />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/project/:id" element={<IDEWorkspace />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/github/callback" element={<GitHubCallback />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Toaster />
    </AuthProvider>
  );
}

export default App;
