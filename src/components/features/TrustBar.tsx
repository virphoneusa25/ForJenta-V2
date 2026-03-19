export default function TrustBar() {
  return (
    <div className="mx-auto mt-12 flex max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-3">
      {[
        'Works with ChatGPT',
        'Works with Claude',
        'Works with Gemini',
        'Works with Copilot',
      ].map((text) => (
        <span
          key={text}
          className="text-xs font-medium text-gray-600 transition-colors hover:text-gray-500"
        >
          {text}
        </span>
      ))}
    </div>
  );
}
