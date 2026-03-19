import type {
  NavigationLink,
  BenchmarkItem,
  Feature,
  PricingPlan,
  Project,
} from '@/types';

export const navigationLinks: NavigationLink[] = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'Enterprise', href: '#enterprise' },
  { label: 'Careers', href: '#careers' },
  {
    label: 'Resources',
    href: '#resources',
    hasDropdown: true,
    dropdownItems: [
      { label: 'Documentation', href: '#docs' },
      { label: 'Blog', href: '#blog' },
      { label: 'Community', href: '#community' },
      { label: 'Support', href: '#support' },
    ],
  },
];

export const categories = [
  'Web',
  'Mobile',
  'Slack Bot',
  'AI Agent',
  'Chrome Extension',
];

export const appBenchData: BenchmarkItem[] = [
  { name: 'ForJenta', score: 76, isForJenta: true },
  { name: 'Claude Code', score: 68, isForJenta: false },
  { name: 'v0', score: 64, isForJenta: false },
  { name: 'Bolt', score: 54, isForJenta: false },
  { name: 'Google AI Studio', score: 50, isForJenta: false },
  { name: 'Codex CLI', score: 38, isForJenta: false },
  { name: 'Replit', score: 34, isForJenta: false },
  { name: 'Cursor', score: 27, isForJenta: false },
  { name: 'Lovable', score: 25, isForJenta: false },
  { name: 'Gemini CLI', score: 0, isForJenta: false },
];

export const uiBenchData: BenchmarkItem[] = [
  { name: 'ForJenta', score: 30.08, isForJenta: true },
  { name: 'Figma Make', score: 27.46, isForJenta: false },
  { name: 'Lovable', score: 27.14, isForJenta: false },
  { name: 'Anything', score: 25.46, isForJenta: false },
  { name: 'Bolt', score: 24.44, isForJenta: false },
  { name: 'Magic Patterns', score: 24.23, isForJenta: false },
  { name: 'Same.new', score: 23.57, isForJenta: false },
  { name: 'Base44', score: 23.47, isForJenta: false },
  { name: 'v0', score: 22.24, isForJenta: false },
  { name: 'Replit', score: 20.95, isForJenta: false },
];

export const features: Feature[] = [
  {
    title: 'Build any app, any stack',
    description:
      'Build web apps, mobile apps, games, CLI tools, AI agents, and more. ForJenta supports every language and framework - React, Next.js, Python, Swift, Flutter, you name it.',
  },
  {
    title: 'Use your existing subscriptions',
    description:
      'Use your existing ChatGPT, Claude Code, Gemini, or GitHub Copilot subscription - or plug in any API key.',
  },
  {
    title: 'A complete full-stack coding agent',
    description:
      'ForJenta can plan, debug, run commands, and work with integrations. All just one chat away.',
  },
];

export const pricingPlans: PricingPlan[] = [
  {
    name: 'Free Trial',
    price: '$0',
    period: 'for 3 days',
    description: 'Get started with AI app building',
    features: [
      '25 starting credits',
      '3-day trial period',
      'AI code generation',
      'Code editor & live preview',
      'Version history',
    ],
    isPopular: false,
    ctaText: 'Start Free Trial',
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For professional developers',
    features: [
      '500 credits/month',
      'Unlimited projects',
      'Priority AI generation',
      'Advanced code editor',
      'GitHub export',
      'Email support',
    ],
    isPopular: true,
    ctaText: 'Get Started',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For teams and organizations',
    features: [
      'Unlimited credits',
      'Team collaboration',
      'Custom AI models',
      'Dedicated support',
      'SSO & advanced security',
      'SLA guarantee',
    ],
    isPopular: false,
    ctaText: 'Contact Sales',
  },
];

export const mockProjects: Project[] = [
  {
    id: 'proj-demo-1',
    name: 'todo-app',
    description: 'A simple todo application with local storage',
    prompt: 'Build a todo app with categories and due dates',
    categories: ['Web'],
    createdAt: '2025-01-15T10:30:00Z',
    versions: [],
    files: [
      {
        id: 'f1',
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang='en'>
<head>
  <meta charset='UTF-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1.0'>
  <title>Todo App</title>
  <link rel='stylesheet' href='styles.css'>
</head>
<body>
  <div id='app'>
    <h1>My Todos</h1>
    <div class='input-group'>
      <input type='text' id='todoInput' placeholder='Add a new todo...' />
      <button onclick='addTodo()'>Add</button>
    </div>
    <ul id='todoList'></ul>
  </div>
  <script src='script.js'></script>
</body>
</html>`,
        language: 'html',
      },
      {
        id: 'f2',
        path: 'styles.css',
        content: `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, sans-serif; background: #0a0a0a; color: #fff; min-height: 100vh; display: flex; justify-content: center; padding-top: 60px; }
#app { width: 100%; max-width: 500px; padding: 20px; }
h1 { font-size: 28px; margin-bottom: 24px; background: linear-gradient(135deg, #667eea, #f857a6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.input-group { display: flex; gap: 8px; margin-bottom: 20px; }
input { flex: 1; padding: 12px 16px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: #111; color: #fff; font-size: 14px; outline: none; }
input:focus { border-color: #667eea; }
button { padding: 12px 20px; border-radius: 10px; border: none; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; cursor: pointer; font-weight: 600; }
button:hover { opacity: 0.9; }
ul { list-style: none; }
li { padding: 14px 16px; background: #111; border: 1px solid rgba(255,255,255,0.05); border-radius: 10px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; }
li.done span { text-decoration: line-through; opacity: 0.5; }
.delete-btn { background: none; border: none; color: #f857a6; cursor: pointer; font-size: 18px; padding: 0 4px; }`,
        language: 'css',
      },
      {
        id: 'f3',
        path: 'script.js',
        content: `let todos = JSON.parse(localStorage.getItem('todos') || '[]');

function render() {
  const list = document.getElementById('todoList');
  list.innerHTML = '';
  todos.forEach((todo, i) => {
    const li = document.createElement('li');
    li.className = todo.done ? 'done' : '';
    li.innerHTML = '<span onclick="toggle(' + i + ')">' + todo.text + '</span><button class="delete-btn" onclick="remove(' + i + ')">×</button>';
    list.appendChild(li);
  });
  localStorage.setItem('todos', JSON.stringify(todos));
}

function addTodo() {
  const input = document.getElementById('todoInput');
  if (input.value.trim()) {
    todos.push({ text: input.value.trim(), done: false });
    input.value = '';
    render();
  }
}

function toggle(i) { todos[i].done = !todos[i].done; render(); }
function remove(i) { todos.splice(i, 1); render(); }

document.getElementById('todoInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addTodo();
});

render();
console.log('Todo app initialized');`,
        language: 'javascript',
      },
      {
        id: 'f4',
        path: 'README.md',
        content: `# Todo App\n\nA simple todo application built with vanilla HTML, CSS, and JavaScript.\n\n## Features\n- Add new todos\n- Toggle completion\n- Delete todos\n- Persistent storage with localStorage\n\n## Getting Started\nOpen \`index.html\` in your browser.`,
        language: 'markdown',
      },
    ],
  },
];
