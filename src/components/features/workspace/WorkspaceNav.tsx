import { Link, useLocation } from 'react-router-dom';
import { Home, Search, BookOpen, LayoutDashboard } from 'lucide-react';

const navItems = [
  { label: 'Home', icon: Home, href: '/workspace' },
  { label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Search', icon: Search, href: '/workspace/search' },
  { label: 'Resources', icon: BookOpen, href: '/resources' },
];

export default function WorkspaceNav() {
  const location = useLocation();

  return (
    <nav className="flex flex-col gap-0.5">
      {navItems.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.label}
            to={item.href}
            className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
              isActive
                ? 'bg-white/[0.08] text-white'
                : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
            }`}
          >
            <item.icon className={`size-4 ${isActive ? 'text-violet-400' : ''}`} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
