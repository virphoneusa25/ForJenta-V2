import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function UpgradeCard() {
  return (
    <div className="rounded-xl border border-violet-500/10 bg-gradient-to-br from-violet-500/[0.08] to-fuchsia-500/[0.04] p-3.5">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-violet-400" />
        <span className="text-xs font-semibold text-white">Upgrade Plan</span>
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400">
        Unlock unlimited generations, priority support, and team features.
      </p>
      <Link
        to="/pricing"
        className="mt-3 block rounded-lg bg-violet-600/80 py-1.5 text-center text-xs font-medium text-white transition-colors hover:bg-violet-600"
      >
        View Plans
      </Link>
    </div>
  );
}
