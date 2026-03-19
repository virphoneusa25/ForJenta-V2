import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Zap,
  Clock,
  FolderOpen,
  Activity,
  Settings,
  User,
  CreditCard,
  Shield,
  ChevronRight,
  Loader2,
  FileCode2,
  CheckCircle2,
  XCircle,
  LogOut,
  ShoppingCart,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';
import { fetchUserBuildRuns } from '@/lib/buildLogs';
import { useCredits } from '@/hooks/useCredits';
import logoImg from '@/assets/logo.png';

interface BuildRun {
  id: string;
  project_id: string;
  prompt: string;
  status: string;
  created_at: string;
  duration_ms: number | null;
  total_files: number;
  total_lines: number;
  app_type: string | null;
  validation_result: string | null;
  error_message: string | null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const projects = useProjectStore((s) => s.projects);
  const [buildRuns, setBuildRuns] = useState<BuildRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'settings'>('overview');
  const { balance, isTrialActive, trialDaysLeft, planName } = useCredits();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchUserBuildRuns(user.id, 20).then((runs) => {
      setBuildRuns(runs as BuildRun[]);
      setLoadingRuns(false);
    });
  }, [user, navigate]);

  if (!user) return null;

  const trialActive = isTrialActive;
  const daysLeft = trialDaysLeft;

  const totalBuilds = buildRuns.length;
  const successBuilds = buildRuns.filter((r) => r.status === 'complete').length;
  const totalFilesGenerated = buildRuns.reduce((s, r) => s + (r.total_files || 0), 0);

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Zap },
    { id: 'activity' as const, label: 'Activity', icon: Activity },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-zinc-950">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/workspace')} className="text-gray-400 hover:text-white" aria-label="Back">
              <ArrowLeft className="size-4" />
            </button>
            <div className="flex items-center gap-2">
              <img src={logoImg} alt="ForJenta" className="size-9 rounded-lg object-contain" />
              <span className="font-display text-sm font-semibold text-white">Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/billing"
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-zinc-900 px-3 py-1.5 text-xs text-white transition-colors hover:bg-zinc-800"
            >
              <Zap className="size-3 text-amber-400" />
              <span className="font-semibold tabular-nums">{balance}</span>
              <span className="text-gray-500">credits</span>
            </Link>
            <div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-[10px] font-bold text-white">
              {user.email.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Greeting */}
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-white">
            Welcome back, {user.email.split('@')[0]}
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage your account, view activity, and track your usage.
          </p>
        </div>

        {/* Tab nav */}
        <div className="mb-8 flex gap-1 rounded-xl bg-zinc-900/50 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white/10 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-6">
            {/* Stats grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Credits — real balance */}
              <div className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-5">
                <div className="flex items-center gap-2 text-gray-500 mb-3">
                  <Zap className="size-4 text-amber-400" />
                  <span className="text-xs uppercase tracking-wider">Credits</span>
                </div>
                <p className="font-display text-3xl font-bold text-white">{balance}</p>
                <p className="mt-1 text-xs text-gray-500">remaining this cycle</p>
              </div>

              {/* Plan status */}
              <div className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-5">
                <div className="flex items-center gap-2 text-gray-500 mb-3">
                  <Clock className="size-4" />
                  <span className="text-xs uppercase tracking-wider capitalize">{planName}</span>
                </div>
                <p className="font-display text-3xl font-bold text-white">
                  {trialActive ? `${daysLeft}d` : 'Expired'}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {trialActive
                    ? `${daysLeft} days remaining`
                    : 'Upgrade for unlimited access'}
                </p>
                {trialActive && (
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                      style={{ width: `${Math.min(100, (daysLeft / 3) * 100)}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Projects */}
              <div className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-5">
                <div className="flex items-center gap-2 text-gray-500 mb-3">
                  <FolderOpen className="size-4" />
                  <span className="text-xs uppercase tracking-wider">Projects</span>
                </div>
                <p className="font-display text-3xl font-bold text-white">{projects.length}</p>
                <p className="mt-1 text-xs text-gray-500">total projects</p>
              </div>

              {/* Builds */}
              <div className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-5">
                <div className="flex items-center gap-2 text-gray-500 mb-3">
                  <Activity className="size-4" />
                  <span className="text-xs uppercase tracking-wider">Builds</span>
                </div>
                <p className="font-display text-3xl font-bold text-white">{totalBuilds}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {successBuilds} successful · {totalFilesGenerated} files
                </p>
              </div>
            </div>

            {/* Recent activity preview */}
            <div className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Recent Builds</h3>
                <button
                  onClick={() => setActiveTab('activity')}
                  className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300"
                >
                  View all <ChevronRight className="size-3" />
                </button>
              </div>

              {loadingRuns ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-5 text-gray-500 animate-spin" />
                </div>
              ) : buildRuns.length === 0 ? (
                <div className="py-8 text-center">
                  <Activity className="mx-auto size-8 text-gray-600 mb-2" />
                  <p className="text-sm text-gray-500">No builds yet</p>
                  <p className="mt-1 text-xs text-gray-600">Start by generating an app from the workspace</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {buildRuns.slice(0, 5).map((run) => (
                    <Link
                      key={run.id}
                      to={`/project/${run.project_id}`}
                      className="flex items-center gap-3 rounded-lg bg-black/20 px-4 py-3 transition-colors hover:bg-black/30"
                    >
                      {run.status === 'complete' ? (
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                      ) : run.status === 'failed' ? (
                        <XCircle className="size-4 shrink-0 text-red-400" />
                      ) : (
                        <Loader2 className="size-4 shrink-0 text-violet-400 animate-spin" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-gray-200">{run.prompt}</p>
                        <p className="mt-0.5 text-[10px] text-gray-500">
                          {run.total_files} files · {run.total_lines} lines
                          {run.duration_ms ? ` · ${(run.duration_ms / 1000).toFixed(1)}s` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] text-gray-600">
                        {new Date(run.created_at).toLocaleDateString()}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Activity tab */}
        {activeTab === 'activity' && (
          <div className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Build History</h3>

            {loadingRuns ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="size-6 text-gray-500 animate-spin" />
              </div>
            ) : buildRuns.length === 0 ? (
              <div className="py-12 text-center">
                <FileCode2 className="mx-auto size-10 text-gray-600 mb-3" />
                <p className="text-sm text-gray-400">No generation history yet</p>
                <p className="mt-1 text-xs text-gray-500">
                  Build logs will appear here after your first generation
                </p>
                <Link
                  to="/workspace"
                  className="mt-4 inline-flex items-center gap-2 rounded-xl gradient-primary px-5 py-2.5 text-sm font-medium text-white"
                >
                  <Zap className="size-4" />
                  Start Building
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {buildRuns.map((run) => (
                  <div
                    key={run.id}
                    className="rounded-xl border border-white/[0.04] bg-black/20 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {run.status === 'complete' ? (
                            <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
                          ) : run.status === 'failed' ? (
                            <XCircle className="size-4 shrink-0 text-red-400" />
                          ) : (
                            <Loader2 className="size-4 shrink-0 text-violet-400 animate-spin" />
                          )}
                          <span className="text-xs font-medium text-white">{run.prompt}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-gray-500">
                          <span>{run.total_files} files</span>
                          <span>{run.total_lines} lines</span>
                          {run.duration_ms && <span>{(run.duration_ms / 1000).toFixed(1)}s</span>}
                          {run.app_type && <span>{run.app_type}</span>}
                          {run.validation_result && (
                            <span className={
                              run.validation_result === 'passed'
                                ? 'text-emerald-400'
                                : run.validation_result === 'failed'
                                ? 'text-red-400'
                                : 'text-amber-400'
                            }>
                              {run.validation_result}
                            </span>
                          )}
                        </div>
                        {run.error_message && (
                          <p className="mt-1.5 text-[11px] text-red-400/80">{run.error_message}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className="text-[10px] text-gray-600">
                          {new Date(run.created_at).toLocaleString()}
                        </span>
                        <Link
                          to={`/project/${run.project_id}`}
                          className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300"
                        >
                          Open project <ChevronRight className="size-2.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings tab */}
        {activeTab === 'settings' && (
          <div className="flex flex-col gap-6">
            {/* Profile */}
            <div className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
                <User className="size-4" />
                Profile
              </h3>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">Email</label>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-gray-300">
                    {user.email}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">User ID</label>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-xs text-gray-500">
                    {user.id}
                  </div>
                </div>
              </div>
            </div>

            {/* Subscription */}
            <div className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
                <CreditCard className="size-4" />
                Subscription
              </h3>
              <div className="flex items-center justify-between rounded-lg bg-black/20 px-4 py-3">
                <div>
                  <p className="text-xs font-medium text-white capitalize">
                    {planName === 'trial' ? 'Free Trial' : `${planName} Plan`}
                  </p>
                  <p className="mt-0.5 text-[10px] text-gray-500">
                    {trialActive
                      ? `${daysLeft} days remaining · ${balance} credits`
                      : 'Upgrade to continue building'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to="/billing"
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white hover:bg-white/10"
                  >
                    <ShoppingCart className="size-3" />
                    Credits
                  </Link>
                  <Link
                    to="/pricing"
                    className="rounded-lg gradient-primary px-4 py-2 text-xs font-medium text-white"
                  >
                    {trialActive ? 'Upgrade' : 'View Plans'}
                  </Link>
                </div>
              </div>
            </div>

            {/* Security */}
            <div className="rounded-xl border border-white/[0.06] bg-zinc-900/50 p-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white mb-4">
                <Shield className="size-4" />
                Security
              </h3>
              <div className="flex flex-col gap-3">
                <button className="flex items-center justify-between rounded-lg bg-black/20 px-4 py-3 text-left transition-colors hover:bg-black/30">
                  <div>
                    <p className="text-xs font-medium text-white">Change Password</p>
                    <p className="mt-0.5 text-[10px] text-gray-500">Update your account password</p>
                  </div>
                  <ChevronRight className="size-4 text-gray-500" />
                </button>
                <button
                  onClick={async () => {
                    await logout();
                    navigate('/');
                  }}
                  className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-3 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/15"
                >
                  <LogOut className="size-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
