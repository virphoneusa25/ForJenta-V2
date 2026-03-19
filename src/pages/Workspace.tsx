import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, Plus, FolderOpen, Sparkles, History, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useProjectStore } from '@/stores/projectStore';
import { usePersistentProjectStore } from '@/stores/persistentProjectStore';
import { useToast } from '@/hooks/use-toast';
import { savePendingPrompt } from '@/hooks/usePromptFlow';
import AuthModal from '@/components/features/AuthModal';
import WorkspaceSidebar from '@/components/features/workspace/WorkspaceSidebar';
import ComposerHero from '@/components/features/workspace/ComposerHero';
import WorkspaceContentDeck from '@/components/features/workspace/WorkspaceContentDeck';
import PersistentProjectCard from '@/components/features/workspace/PersistentProjectCard';
import ProjectDetailPanel from '@/components/features/workspace/ProjectDetailPanel';
import type { ProjectFile } from '@/types';
import logoImg from '@/assets/logo.png';
import { cn } from '@/lib/utils';

export default function Workspace() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const projects = useProjectStore((s) => s.projects);
  const addProject = useProjectStore((s) => s.addProject);
  
  // Persistent projects
  const persistentProjects = usePersistentProjectStore((s) => s.projects);
  const fetchProjects = usePersistentProjectStore((s) => s.fetchProjects);
  const createPersistentProject = usePersistentProjectStore((s) => s.createProject);
  const loadingProjects = usePersistentProjectStore((s) => s.loading);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authPromptPreview, setAuthPromptPreview] = useState('');
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showProjectDetail, setShowProjectDetail] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch persistent projects on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [isAuthenticated, fetchProjects]);

  /** Create a new project from the prompt and redirect to builder */
  const createProjectFromPrompt = async (prompt: string) => {
    const projectName =
      prompt
        .slice(0, 40)
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9-]/g, '')
        .toLowerCase() || 'new-project';

    // Create persistent project first
    const persistentProject = await createPersistentProject(
      projectName,
      prompt,
      prompt.slice(0, 200)
    );

    // Also create local project for UI compatibility
    const projectId = persistentProject?.project_id || `proj-${Date.now()}`;
    
    const readmeFile: ProjectFile = {
      id: `f-${Date.now()}-readme`,
      path: 'README.md',
      content: `# ${projectName}\n\nGenerating project from prompt:\n> ${prompt}\n\nPlease wait while the AI generates your files...`,
      language: 'markdown',
    };

    // Set auto-generate flag
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

  const handleProjectSelect = (projectId: string) => {
    setSelectedProjectId(projectId);
    // On mobile, show the detail panel
    if (window.innerWidth < 1024) {
      setShowProjectDetail(true);
    }
  };

  // Combine persistent projects for display
  const displayProjects = persistentProjects.length > 0 ? persistentProjects : [];

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
      <main className="flex flex-1 flex-col overflow-hidden lg:ml-60">
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

        {/* Content split view - FIXED: Added overflow-y-auto for mobile scrolling */}
        <div className="flex flex-1 overflow-hidden lg:overflow-visible">
          {/* Left panel - Projects list */}
          <div className={cn(
            "flex flex-col overflow-y-auto border-r border-white/5",
            selectedProjectId && window.innerWidth >= 1024 ? "w-1/2 xl:w-3/5" : "flex-1"
          )}>
            {/* Hero composer */}
            <div className="shrink-0">
              <ComposerHero onSubmit={handlePromptSubmit} />
            </div>

            {/* Projects section */}
            {isAuthenticated && displayProjects.length > 0 && (
              <div className="flex-1 px-4 lg:px-8 pb-8">
                {/* Section header */}
                <div className="flex items-center justify-between mb-4 sticky top-0 bg-black py-2 z-10">
                  <div className="flex items-center gap-2">
                    <History className="size-4 text-gray-500" />
                    <h2 className="text-sm font-medium text-gray-400">Your Projects</h2>
                    <span className="text-xs text-gray-600">({displayProjects.length})</span>
                  </div>
                </div>

                {/* Project grid */}
                <div className={cn(
                  "grid gap-4",
                  viewMode === 'grid' 
                    ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" 
                    : "grid-cols-1"
                )}>
                  {displayProjects.map((project) => (
                    <PersistentProjectCard
                      key={project.project_id}
                      project={project}
                      onSelect={handleProjectSelect}
                      isSelected={selectedProjectId === project.project_id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state or templates */}
            {(!isAuthenticated || displayProjects.length === 0) && (
              <WorkspaceContentDeck
                projects={projects}
                onTemplateSelect={handlePromptSubmit}
              />
            )}
          </div>

          {/* Right panel - Project detail (desktop) */}
          {selectedProjectId && (
            <div className="hidden lg:flex w-1/2 xl:w-2/5 flex-col border-l border-white/5">
              <ProjectDetailPanel
                projectId={selectedProjectId}
                onClose={() => setSelectedProjectId(null)}
              />
            </div>
          )}
        </div>
      </main>

      {/* Mobile project detail overlay */}
      {showProjectDetail && selectedProjectId && (
        <div className="fixed inset-0 z-50 lg:hidden animate-fade-in">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowProjectDetail(false)}
          />
          <div className="absolute inset-x-0 bottom-0 top-14 z-10 bg-zinc-950 rounded-t-2xl overflow-hidden">
            <ProjectDetailPanel
              projectId={selectedProjectId}
              onClose={() => setShowProjectDetail(false)}
              isMobile
            />
          </div>
        </div>
      )}

      {/* Auth modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        promptPreview={authPromptPreview}
      />
    </div>
  );
}
