import { Link } from 'react-router-dom';
import logoImg from '@/assets/logo.png';

const footerColumns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Enterprise', href: '/enterprise' },
      { label: 'Changelog', href: '/resources' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/resources' },
      { label: 'Careers', href: '/careers' },
      { label: 'Blog', href: '/resources' },
      { label: 'Contact', href: '/resources' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'Documentation', href: '/resources' },
      { label: 'Community', href: '/resources' },
      { label: 'Support', href: '/resources' },
      { label: 'API', href: '/resources' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: '/resources' },
      { label: 'Terms', href: '/resources' },
      { label: 'Security', href: '/resources' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.04] bg-black">
      <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">
                {col.title}
              </h3>
              <ul className="flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-gray-500 transition-colors hover:text-gray-300"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/[0.04] pt-8 md:flex-row">
          <div className="flex items-center gap-2.5">
            <img src={logoImg} alt="ForJenta" className="size-9 rounded-lg object-contain" />
            <span className="font-display text-sm font-semibold tracking-tight text-white">
              ForJenta
            </span>
          </div>
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} ForJenta. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
