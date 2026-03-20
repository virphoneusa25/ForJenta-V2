# ForJenta - AI Code Generation IDE

## Product Requirements Document

### Overview
ForJenta is a premium, persistent, project-based AI code generation IDE styled as a dark developer-tool environment.

### Core Architecture
- **Frontend**: Vite + React + TypeScript + TailwindCSS + Zustand (at `/app/src/`)
- **Backend**: FastAPI + Python + MongoDB (at `/app/backend/`)
- **Code Generation**: GPT-4o via Emergent LLM key (`/app/backend/code_generator.py`)
- **Auth**: Emergent-managed Google OAuth + GitHub OAuth

### IDE Workspace Components (NEW - March 2026)
- `IDEWorkspace.tsx` - Main page shell (CSS grid + react-resizable-panels)
- `WorkspaceHeader.tsx` - Compact 46px header with project name, App/Code tabs, search, Deploy
- `AIFeedPanel.tsx` - Left AI build feed (response chips, file change cards, code preview, todo, composer)
- `ActivityBar.tsx` - 46px vertical icon bar (explorer, search, git, debug, extensions, user, settings)
- `ExplorerPanel.tsx` - File tree with collapsible folders, OUTLINE/TIMELINE sections
- `EditorCanvas.tsx` - Monaco Editor with dark theme, empty state, tab bar
- `BottomTerminalDock.tsx` - Expandable terminal with npm output
- `ide-workspace.css` - Full dark IDE theme (CSS variables, no gradients, near-black backgrounds)

### Key Routes
- `/` - Homepage
- `/workspace` - Project workspace
- `/project/:id` - IDE Workspace (dark IDE interface)

### Bug Fixes Applied (March 19, 2026)
- [x] P0: Generator crash (`onSend={handleSend}` → `onSend={() => handleSend()}`)
- [x] P0: Dead Supabase edge function → Built `/api/generate-code` with GPT-4o
- [x] P0: Credit check blocking → Made non-blocking
- [x] P1: HeroSection persistent project creation

### What's Been Implemented
- [x] Full IDE workspace matching reference screenshot
- [x] Resizable panels with persistent layout
- [x] Monaco Editor integration with syntax highlighting
- [x] Activity bar with VS Code-style icons
- [x] Explorer panel with collapsible file tree
- [x] AI feed panel with code preview, file cards, todo, composer
- [x] Terminal dock (expand/collapse)
- [x] Global status bar with git branch, errors, warnings
- [x] Working code generation via GPT-4o backend endpoint
- [x] Full project flow: workspace prompt → builder → generation → follow-up

### Pending/Backlog Tasks
#### P1
- Wire IDE workspace to real project data (replace mock data with persistent store)
- Smart Auto-Repair for preview errors
- GitHub integration
- Auto-save during generation

#### P2
- Project templates
- Framework support (Vue, Svelte)
- Smart Agent streaming narration
- Mobile responsive IDE layout

### Test Credentials
- Google login: rmcknight@virphoneusa.com
- Test session: test-session-392c2617873443118634ef418010156c
