import { Link } from 'react-router-dom';
import logoImg from '@/assets/logo.png';
import WorkspaceSwitcher from '@/components/features/workspace/WorkspaceSwitcher';
import WorkspaceNav from '@/components/features/workspace/WorkspaceNav';
import ProjectTree from '@/components/features/workspace/ProjectTree';
import UpgradeCard from '@/components/features/workspace/UpgradeCard';
import ReferralCard from '@/components/features/workspace/ReferralCard';
import ProfileDock from '@/components/features/workspace/ProfileDock';
import type { Project } from '@/types';

interface WorkspaceSidebarProps {
  projects: Project[];
  mobile?: boolean;
}

export default function WorkspaceSidebar({ projects, mobile }: WorkspaceSidebarProps) {
  const baseClasses = 'flex h-full w-60 flex-col border-r border-white/[0.06] bg-zinc-950';
  const desktopClasses = mobile ? baseClasses : `fixed inset-y-0 left-0 z-40 hidden lg:flex w-60 flex-col border-r border-white/[0.06] bg-zinc-950`;

  return (
    <aside className={desktopClasses}>
      {/* Logo */}
      <div className="flex h-14 shrink-0 items-center gap-2.5 px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logoImg} alt="ForJenta" className="size-9 rounded-lg object-contain" />
          <span className="font-display text-sm font-semibold tracking-tight text-white">
            ForJenta
          </span>
        </Link>
      </div>

      {/* Workspace Switcher */}
      <div className="px-3">
        <WorkspaceSwitcher />
      </div>

      {/* Nav */}
      <div className="mt-4 px-3">
        <WorkspaceNav />
      </div>

      {/* Divider */}
      <div className="mx-4 my-4 h-px bg-white/5" />

      {/* Project Tree */}
      <div className="flex-1 overflow-hidden px-2">
        <ProjectTree projects={projects} />
      </div>

      {/* Bottom cards */}
      <div className="flex flex-col gap-2.5 px-3 pb-2">
        <UpgradeCard />
        <ReferralCard />
      </div>

      {/* Profile dock */}
      <div className="px-3 pb-3">
        <ProfileDock />
      </div>
    </aside>
  );
}
