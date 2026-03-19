const suggestions = [
  { label: 'Build a CRM dashboard', emoji: '📊' },
  { label: 'Create a landing page', emoji: '🚀' },
  { label: 'Design a chat app', emoji: '💬' },
  { label: 'Make a task manager', emoji: '✅' },
  { label: 'Build an e-commerce store', emoji: '🛒' },
  { label: 'Create a portfolio site', emoji: '🎨' },
];

interface SuggestionChipsProps {
  onSelect: (prompt: string) => void;
}

export default function SuggestionChips({ onSelect }: SuggestionChipsProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {suggestions.map((s) => (
        <button
          key={s.label}
          onClick={() => onSelect(s.label)}
          className="flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-white/[0.03] px-3.5 py-2 text-xs text-gray-400 transition-all hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
        >
          <span>{s.emoji}</span>
          {s.label}
        </button>
      ))}
    </div>
  );
}
