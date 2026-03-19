import { useAuthStore } from '@/stores/authStore';
import PromptComposer from '@/components/features/workspace/PromptComposer';
import SuggestionChips from '@/components/features/workspace/SuggestionChips';

interface ComposerHeroProps {
  onSubmit: (prompt: string) => void;
  composerRef?: (setValue: (v: string) => void) => void;
}

export default function ComposerHero({ onSubmit }: ComposerHeroProps) {
  const user = useAuthStore((s) => s.user);
  const displayName = user?.email?.split('@')[0] || 'there';

  return (
    <section className="relative flex flex-col items-center justify-center px-4 pt-16 pb-10 md:pt-20 md:pb-14">
      {/* Gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 size-[600px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-violet-600/[0.07] blur-[120px]" />
        <div className="absolute right-1/4 top-1/4 size-[400px] rounded-full bg-fuchsia-600/[0.05] blur-[100px]" />
        <div className="absolute left-1/4 top-1/3 size-[300px] rounded-full bg-blue-600/[0.04] blur-[80px]" />
      </div>

      {/* Heading */}
      <div className="relative z-10 mb-8 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
          Got an idea,{' '}
          <span className="text-gradient">{displayName}</span>?
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-gray-400 md:text-base">
          Describe what you want to build and let AI create it for you.
        </p>
      </div>

      {/* Composer */}
      <div className="relative z-10 w-full max-w-2xl">
        <PromptComposer onSubmit={onSubmit} />
      </div>

      {/* Chips */}
      <div className="relative z-10 mt-6 w-full max-w-2xl">
        <SuggestionChips onSelect={onSubmit} />
      </div>
    </section>
  );
}
