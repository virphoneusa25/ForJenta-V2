/**
 * GitHubPushPanel - UI for pushing project files to GitHub
 */

import { useState, useEffect } from 'react';
import { 
  Github, GitBranch, FolderGit2, Upload, Check, AlertCircle, 
  Loader2, Plus, RefreshCw, ExternalLink, Link2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { usePersistentProjectStore } from '@/stores/persistentProjectStore';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  url: string;
  clone_url: string;
  private: boolean;
  language: string | null;
  default_branch: string;
  updated_at: string;
}

interface Branch {
  name: string;
  sha: string;
  protected: boolean;
}

interface GitHubPushPanelProps {
  projectFiles: Array<{ path: string; content: string }>;
  projectName: string;
  onClose?: () => void;
}

export default function GitHubPushPanel({
  projectFiles,
  projectName,
  onClose,
}: GitHubPushPanelProps) {
  const { toast } = useToast();
  const githubConnection = useAuthStore((s) => s.githubConnection);
  const connectGitHub = useAuthStore((s) => s.connectGitHub);
  
  const [loading, setLoading] = useState(false);
  const [repos, setRepos] = useState<Repository[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [commitMessage, setCommitMessage] = useState(`Update ${projectName} from ForJenta`);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // Create new repo state
  const [showCreateRepo, setShowCreateRepo] = useState(false);
  const [newRepoName, setNewRepoName] = useState(projectName.replace(/\s+/g, '-').toLowerCase());
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Fetch repositories
  useEffect(() => {
    if (githubConnection?.connected) {
      fetchRepos();
    }
  }, [githubConnection?.connected]);

  // Fetch branches when repo is selected
  useEffect(() => {
    if (selectedRepo) {
      fetchBranches(selectedRepo.full_name);
    }
  }, [selectedRepo]);

  const fetchRepos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/github/repos`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setRepos(data.repositories);
      }
    } catch (error) {
      console.error('[GitHub] Failed to fetch repos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBranches = async (fullName: string) => {
    const [owner, repo] = fullName.split('/');
    try {
      const response = await fetch(`${API_URL}/api/github/repos/${owner}/${repo}/branches`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setBranches(data.branches);
        // Set default branch
        if (selectedRepo?.default_branch) {
          setSelectedBranch(selectedRepo.default_branch);
        }
      }
    } catch (error) {
      console.error('[GitHub] Failed to fetch branches:', error);
    }
  };

  const handleConnect = async () => {
    try {
      const authUrl = await connectGitHub();
      window.location.href = authUrl;
    } catch (error) {
      toast({
        title: 'Connection Failed',
        description: 'Failed to start GitHub connection.',
        variant: 'destructive',
      });
    }
  };

  const handleCreateRepo = async () => {
    if (!newRepoName.trim()) return;
    
    setCreating(true);
    try {
      const response = await fetch(`${API_URL}/api/github/repos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newRepoName,
          description: `Created from ForJenta: ${projectName}`,
          private: newRepoPrivate,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Repository Created',
          description: `Created ${data.repository.full_name}`,
        });
        
        // Refresh repos and select the new one
        await fetchRepos();
        setSelectedRepo(data.repository);
        setShowCreateRepo(false);
      } else {
        const error = await response.json();
        toast({
          title: 'Creation Failed',
          description: error.detail || 'Failed to create repository',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Creation Failed',
        description: 'Network error',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handlePush = async () => {
    if (!selectedRepo || !commitMessage.trim()) return;
    
    const [owner, repo] = selectedRepo.full_name.split('/');
    
    setPushing(true);
    setPushResult(null);
    
    try {
      const response = await fetch(`${API_URL}/api/github/repos/${owner}/${repo}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          owner,
          repo,
          branch: selectedBranch,
          files: projectFiles,
          message: commitMessage,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPushResult({
          success: true,
          message: `Successfully pushed ${projectFiles.length} files. Commit: ${data.commit_sha.slice(0, 7)}`,
        });
        toast({
          title: 'Push Successful',
          description: `Pushed ${projectFiles.length} files to ${selectedRepo.full_name}`,
        });
      } else {
        const error = await response.json();
        setPushResult({
          success: false,
          message: error.detail || 'Push failed',
        });
        toast({
          title: 'Push Failed',
          description: error.detail || 'Failed to push files',
          variant: 'destructive',
        });
      }
    } catch (error) {
      setPushResult({
        success: false,
        message: 'Network error',
      });
      toast({
        title: 'Push Failed',
        description: 'Network error',
        variant: 'destructive',
      });
    } finally {
      setPushing(false);
    }
  };

  // Not connected state
  if (!githubConnection?.connected) {
    return (
      <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
        <Github className="size-12 text-gray-600 mb-3" />
        <h3 className="text-sm font-medium text-white mb-1">Connect GitHub</h3>
        <p className="text-xs text-gray-500 mb-4">
          Connect your GitHub account to push project files to a repository.
        </p>
        <button
          onClick={handleConnect}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          <Github className="size-4" />
          Connect GitHub
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Github className="size-5 text-white" />
          <span className="font-medium text-white">Push to GitHub</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{githubConnection.github_login}</span>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
              ×
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Repository selection */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-400">Repository</label>
            <button
              onClick={() => setShowCreateRepo(!showCreateRepo)}
              className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300"
            >
              <Plus className="size-3" />
              New Repo
            </button>
          </div>

          {/* Create new repo form */}
          {showCreateRepo && (
            <div className="mb-3 p-3 rounded-lg border border-violet-500/20 bg-violet-500/5">
              <input
                type="text"
                value={newRepoName}
                onChange={(e) => setNewRepoName(e.target.value)}
                placeholder="Repository name"
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-sm text-white placeholder-gray-600 outline-none focus:border-violet-500"
              />
              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 text-xs text-gray-500">
                  <input
                    type="checkbox"
                    checked={newRepoPrivate}
                    onChange={(e) => setNewRepoPrivate(e.target.checked)}
                    className="rounded border-gray-600"
                  />
                  Private repository
                </label>
                <button
                  onClick={handleCreateRepo}
                  disabled={creating || !newRepoName.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500 text-white text-xs font-medium disabled:opacity-50"
                >
                  {creating ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                  Create
                </button>
              </div>
            </div>
          )}

          {/* Repo dropdown */}
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="size-5 animate-spin text-gray-500" />
            </div>
          ) : (
            <select
              value={selectedRepo?.full_name || ''}
              onChange={(e) => {
                const repo = repos.find(r => r.full_name === e.target.value);
                setSelectedRepo(repo || null);
              }}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-sm text-white outline-none focus:border-violet-500"
            >
              <option value="">Select a repository...</option>
              {repos.map((repo) => (
                <option key={repo.id} value={repo.full_name}>
                  {repo.full_name} {repo.private ? '🔒' : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Branch selection */}
        {selectedRepo && (
          <div>
            <label className="text-xs font-medium text-gray-400 mb-2 block">Branch</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-sm text-white outline-none focus:border-violet-500"
            >
              {branches.map((branch) => (
                <option key={branch.name} value={branch.name}>
                  {branch.name} {branch.protected ? '(protected)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Commit message */}
        {selectedRepo && (
          <div>
            <label className="text-xs font-medium text-gray-400 mb-2 block">Commit Message</label>
            <input
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Update from ForJenta"
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-sm text-white placeholder-gray-600 outline-none focus:border-violet-500"
            />
          </div>
        )}

        {/* Files to push */}
        {selectedRepo && (
          <div>
            <label className="text-xs font-medium text-gray-400 mb-2 block">
              Files to Push ({projectFiles.length})
            </label>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-zinc-900/50">
              {projectFiles.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-3 py-1.5 border-b border-white/5 last:border-0"
                >
                  <FolderGit2 className="size-3 text-gray-500" />
                  <span className="text-xs text-gray-400 truncate">{file.path}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Push result */}
        {pushResult && (
          <div className={cn(
            "flex items-start gap-2 p-3 rounded-lg",
            pushResult.success
              ? "bg-emerald-500/10 border border-emerald-500/20"
              : "bg-red-500/10 border border-red-500/20"
          )}>
            {pushResult.success ? (
              <Check className="size-4 text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="size-4 text-red-400 mt-0.5" />
            )}
            <span className={cn(
              "text-xs",
              pushResult.success ? "text-emerald-300" : "text-red-300"
            )}>
              {pushResult.message}
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 p-4">
        <button
          onClick={handlePush}
          disabled={!selectedRepo || !commitMessage.trim() || pushing}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
            selectedRepo && commitMessage.trim() && !pushing
              ? "bg-emerald-500 hover:bg-emerald-400 text-white"
              : "bg-white/5 text-gray-500 cursor-not-allowed"
          )}
        >
          {pushing ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Pushing...
            </>
          ) : (
            <>
              <Upload className="size-4" />
              Push {projectFiles.length} Files
            </>
          )}
        </button>

        {selectedRepo && (
          <a
            href={selectedRepo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 mt-2 text-xs text-gray-500 hover:text-gray-400"
          >
            <ExternalLink className="size-3" />
            View on GitHub
          </a>
        )}
      </div>
    </div>
  );
}
