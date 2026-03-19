import { Link, useNavigate } from 'react-router-dom';
import { Settings, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';

export default function ProfileDock() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const { toast } = useToast();

  if (!user) return null;

  const handleSignOut = async () => {
    await logout();
    toast({ title: 'Signed out' });
    navigate('/');
  };

  const initial = user.email.charAt(0).toUpperCase();

  return (
    <div className="flex flex-col gap-2 border-t border-white/5 pt-3">
      {/* Dashboard link */}
      <Link
        to="/dashboard"
        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-gray-400 transition-colors hover:bg-white/[0.04] hover:text-gray-200"
      >
        <LayoutDashboard className="size-4" />
        Dashboard
      </Link>

      {/* User info */}
      <div className="flex items-center gap-2.5 px-2.5 py-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-xs font-bold text-white">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-white">{user.email.split('@')[0]}</p>
          <p className="truncate text-[10px] text-gray-500">{user.credits} credits</p>
        </div>
        <Link
          to="/dashboard"
          className="rounded p-1 text-gray-600 transition-colors hover:bg-white/5 hover:text-gray-300"
          aria-label="Settings"
        >
          <Settings className="size-3.5" />
        </Link>
        <button
          onClick={handleSignOut}
          className="rounded p-1 text-gray-600 transition-colors hover:bg-white/5 hover:text-red-400"
          aria-label="Sign out"
        >
          <LogOut className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
