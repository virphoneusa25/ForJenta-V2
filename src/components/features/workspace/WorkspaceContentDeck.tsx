import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { Project } from '@/types';
import ProjectPreviewCard from '@/components/features/workspace/ProjectPreviewCard';
import TemplatePreviewCard from '@/components/features/workspace/TemplatePreviewCard';
import BuildHistoryPanel from '@/components/features/workspace/BuildHistoryPanel';

type Tab = 'recent' | 'projects' | 'templates';

interface WorkspaceContentDeckProps {
  projects: Project[];
  onTemplateSelect: (prompt: string) => void;
}

export default function WorkspaceContentDeck({ projects, onTemplateSelect }: WorkspaceContentDeckProps) {
  const [activeTab, setActiveTab] = useState<Tab>('recent');

  const tabs: { id: Tab; label: string }[] = [
    { id: 'recent', label: 'Recently viewed' },
    { id: 'projects', label: 'My projects' },
    { id: 'templates', label: 'Templates' },
  ];

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <section className="relative mx-auto w-full max-w-5xl px-4 pb-16">
      <div className="rounded-2xl border border-white/[0.06] bg-zinc-950/80 p-6 backdrop-blur-sm md:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-xl bg-white/[0.03] p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white/[0.08] text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Browse all */}
          <button className="flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-white">
            Browse all
            <ArrowRight className="size-3" />
          </button>
        </div>

        {/* Grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeTab === 'templates' ? (
            <TemplatePreviewCard onSelect={onTemplateSelect} />
          ) : (
            <>
              {(activeTab === 'recent' ? recentProjects : projects).length === 0 ? (
                <div className="col-span-full flex flex-col items-center py-12 text-center">
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-white/[0.03]">
                    <span className="text-2xl">🏗️</span>
                  </div>
                  <p className="mt-4 text-sm font-medium text-white">No projects yet</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Type a prompt above to create your first app
                  </p>
                </div>
              ) : (
                (activeTab === 'recent' ? recentProjects : projects).map((p) => (
                  <ProjectPreviewCard key={p.id} project={p} />
                ))
              )}
            </>
          )}
        </div>
      </div>
      {/* Build History Panel */}
      <div className="mt-6">
        <BuildHistoryPanel />
      </div>
    </section>
  );
}
