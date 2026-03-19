import { Gift } from 'lucide-react';

export default function ReferralCard() {
  const handleCopy = () => {
    navigator.clipboard.writeText('https://forjenta.com/r/invite');
  };

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
      <div className="flex items-center gap-2">
        <Gift className="size-4 text-fuchsia-400" />
        <span className="text-xs font-semibold text-white">Earn Credits</span>
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400">
        Invite friends and earn 10 credits for each signup.
      </p>
      <button
        onClick={handleCopy}
        className="mt-3 w-full rounded-lg border border-white/10 bg-white/[0.04] py-1.5 text-center text-xs font-medium text-gray-300 transition-colors hover:bg-white/[0.08] hover:text-white"
      >
        Copy Invite Link
      </button>
    </div>
  );
}
