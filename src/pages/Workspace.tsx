import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';
import { useToast } from '@/hooks/use-toast';
import { savePendingPrompt } from '@/hooks/usePromptFlow';
import AuthModal from '@/components/features/AuthModal';
import WorkspaceSidebar from '@/components/features/workspace/WorkspaceSidebar';
import ComposerHero from '@/components/features/workspace/ComposerHero';
import WorkspaceContentDeck from '@/components/features/workspace/WorkspaceContentDeck';
import type { ProjectFile } from '@/types';
import logoImg from '@/assets/logo.png';

export default function Workspace() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const projects = useProjectStore((s) => s.projects);
  const addProject = useProjectStore((s) => s.addProject);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authPromptPreview, setAuthPromptPreview] = useState('');
  const [mobileSidebar, setMobileSidebar] = useState(false);

  /** Create a new project from the prompt and redirect to builder */
  const createProjectFromPrompt = (prompt: string) => {
    const projectId = `proj-${Date.now()}`;
    const projectName =
      prompt
        .slice(0, 40)
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9-]/g, '')
        .toLowerCase() || 'new-project';

    const readmeFile: ProjectFile = {
      id: `f-${Date.now()}-readme`,
      path: 'README.md',
      content: `# ${projectName}\n\nGenerating project from prompt:\n> ${prompt}\n\nPlease wait while the AI generates your files...`,
      language: 'markdown',
    };

    // Set auto-generate flag BEFORE adding project so it's ready when ProjectBuilder mounts
    sessionStorage.setItem(
      'forjenta_auto_generate',
      JSON.stringify({
        projectId,
        prompt,
        category: 'Web',
      })
    );

    addProject({
      id: projectId,
      name: projectName,
      description: prompt,
      prompt,
      categories: ['Web'],
      createdAt: new Date().toISOString(),
      versions: [],
      files: [readmeFile],
    });

    toast({
      title: 'Project created',
      description: 'Setting up your workspace...',
    });

    // Use setTimeout to ensure store is synced before navigation
    setTimeout(() => {
      navigate(`/project/${projectId}`);
    }, 50);
  };

  /** Handle prompt submission from hero composer */
  const handlePromptSubmit = (prompt: string) => {
    if (isAuthenticated) {
      createProjectFromPrompt(prompt);
    } else {
      savePendingPrompt(prompt, {
        source: 'homepage',
        category: 'Web',
        intent: 'generate',
      });
      setAuthPromptPreview(prompt);
      setAuthModalOpen(true);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-black">
      {/* Desktop sidebar */}
      <WorkspaceSidebar projects={projects} />

      {/* Mobile sidebar overlay */}
      {mobileSidebar && (
        <div className="fixed inset-0 z-50 lg:hidden animate-fade-in">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileSidebar(false)}
          />
          <div className="relative z-10 h-full">
            <WorkspaceSidebar projects={projects} mobile />
          </div>
          <button
            onClick={() => setMobileSidebar(false)}
            className="absolute right-4 top-4 z-20 rounded-lg bg-zinc-800 p-2 text-white"
          >
            <X className="size-5" />
          </button>
        </div>
      )}

      {/* Main content area */}
      <main className="flex flex-1 flex-col overflow-y-auto lg:ml-60">
        {/* Mobile header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.06] bg-black px-4 lg:hidden">
          <button
            onClick={() => setMobileSidebar(true)}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-white/[0.04] hover:text-gray-300"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="ForJenta" className="size-9 rounded-lg object-contain" />
            <span className="font-display text-sm font-semibold text-white">ForJenta</span>
          </div>
          <div className="w-9" />
        </div>

        {/* Hero composer */}
        <ComposerHero onSubmit={handlePromptSubmit} />

        {/* Content deck */}
        <WorkspaceContentDeck
          projects={projects}
          onTemplateSelect={handlePromptSubmit}
        />
      </main>

      {/* Auth modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        promptPreview={authPromptPreview}
      />
    </div>
  );
}
