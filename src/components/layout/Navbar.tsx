import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import logoImg from '@/assets/logo.png';

const resourcesDropdown = [
  { label: 'Documentation', href: '/resources' },
  { label: 'Blog', href: '/resources' },
  { label: 'Community', href: '/resources' },
  { label: 'Support', href: '/resources' },
];

export default function Navbar() {
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navLinkClass = (path: string) =>
    `rounded-lg px-3 py-2 text-sm transition-colors ${
      isActive(path)
        ? 'text-white'
        : 'text-gray-400 hover:text-white'
    }`;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.04] bg-black/70 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <img src={logoImg} alt="ForJenta" className="size-10 rounded-lg object-contain" />
          <span className="font-display text-lg font-semibold tracking-tight text-white">
            ForJenta
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-0.5 md:flex">
          <Link to="/pricing" className={navLinkClass('/pricing')}>
            Pricing
          </Link>
          <Link to="/enterprise" className={navLinkClass('/enterprise')}>
            Enterprise
          </Link>
          <Link to="/careers" className={navLinkClass('/careers')}>
            Careers
          </Link>
          <div
            className="relative"
            onMouseEnter={() => setResourcesOpen(true)}
            onMouseLeave={() => setResourcesOpen(false)}
          >
            <button
              className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors ${
                isActive('/resources') ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Resources
              <ChevronDown className={`size-3.5 transition-transform ${resourcesOpen ? 'rotate-180' : ''}`} />
            </button>
            {resourcesOpen && (
              <div className="absolute left-0 top-full mt-1 w-48 rounded-xl border border-white/10 bg-zinc-900/95 p-1.5 shadow-2xl backdrop-blur-xl">
                {resourcesDropdown.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="block rounded-lg px-3 py-2.5 text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated ? (
            <>
              <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
                {user?.credits} credits
              </span>
              <span className="text-sm text-gray-400">{user?.email}</span>
              <button
                onClick={() => logout()}
                className="rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:text-white"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-lg px-3 py-2 text-sm text-gray-400 transition-colors hover:text-white"
            >
              Sign in
            </Link>
          )}
          <Link
            to={isAuthenticated ? '/workspace' : '/signup'}
            className="gradient-primary rounded-lg px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/10 transition-all hover:shadow-violet-500/20"
          >
            {isAuthenticated ? 'Workspace' : 'Get Started'}
          </Link>
        </div>

        {/* Mobile burger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="flex size-10 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/5 hover:text-white md:hidden"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-white/5 bg-black/95 px-4 pb-6 pt-4 backdrop-blur-xl md:hidden animate-fade-in">
          <div className="flex flex-col gap-1">
            <Link to="/pricing" className="rounded-lg px-3 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white" onClick={() => setMobileOpen(false)}>Pricing</Link>
            <Link to="/enterprise" className="rounded-lg px-3 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white" onClick={() => setMobileOpen(false)}>Enterprise</Link>
            <Link to="/careers" className="rounded-lg px-3 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white" onClick={() => setMobileOpen(false)}>Careers</Link>
            <Link to="/resources" className="rounded-lg px-3 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white" onClick={() => setMobileOpen(false)}>Resources</Link>
            <div className="my-3 h-px bg-white/5" />
            {isAuthenticated ? (
              <button onClick={() => { logout(); setMobileOpen(false); }} className="rounded-lg px-3 py-3 text-left text-sm text-gray-300 hover:bg-white/5 hover:text-white">
                Sign out
              </button>
            ) : (
              <Link to="/login" className="rounded-lg px-3 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white" onClick={() => setMobileOpen(false)}>Sign in</Link>
            )}
            <Link
              to={isAuthenticated ? '/workspace' : '/signup'}
              className="gradient-primary mt-2 rounded-xl py-3 text-center text-sm font-semibold text-white"
              onClick={() => setMobileOpen(false)}
            >
              {isAuthenticated ? 'Workspace' : 'Get Started'}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
