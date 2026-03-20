# ForJenta - AI Code Generation IDE

## Product Requirements Document

### Overview
ForJenta is a premium, persistent, project-based AI code generation IDE styled as a dark developer-tool environment.

### Core Architecture
- **Frontend**: Vite + React + TypeScript + TailwindCSS + Zustand (at `/app/src/`)
- **Backend**: FastAPI + Python + MongoDB (at `/app/backend/`)
- **Code Generation**: Inworld AI Router (OpenAI-compatible) at `https://api.inworld.ai/v1/chat/completions`
- **Auth**: Emergent-managed Google OAuth + GitHub OAuth

### IDE Workspace Components
- `IDEWorkspace.tsx` - Main page shell (CSS grid + react-resizable-panels), loads project via workspaceStore
- `WorkspaceHeader.tsx` - Compact 46px header with project name, App/Code tabs, search, Deploy
- `AIFeedPanel.tsx` - Left AI build feed with real chat history, generation state, and prompt composer
- `ActivityBar.tsx` - 46px vertical icon bar (explorer, search, git, debug, extensions, user, settings)
- `ExplorerPanel.tsx` - File tree built from real project files via API
- `EditorCanvas.tsx` - Monaco Editor with real file content, tab management, live editing
- `PreviewPane.tsx` - Live HTML/CSS/JS preview via iframe (blob URLs)
- `BottomTerminalDock.tsx` - Expandable terminal with real generation logs
- `ide-workspace.css` - Full dark IDE theme (CSS variables, no gradients, near-black backgrounds)

### State Management
- `workspaceStore.ts` - Central Zustand store managing all IDE state:
  - Project data, files, file tree
  - Open tabs, active file, editor content
  - AI chat messages, generation state
  - Terminal output, preview HTML
  - Full generation pipeline: prompt -> Inworld AI -> save files -> refresh

### Key Routes
- `/` - Homepage
- `/workspace` - Project workspace
- `/project/:id` - IDE Workspace (dark IDE interface)

### 3rd Party Integrations
- **Inworld AI**: Code generation via Router API (`inworld/default-forjenta-model`)
- **Emergent Google Auth**: Login
- **GitHub OAuth**: Login + repo management

### What's Been Implemented
- [x] Full IDE workspace matching reference screenshot (static visual rebuild)
- [x] **Inworld AI integration** replacing GPT-4o for code generation
- [x] **Central Zustand workspace store** (workspaceStore.ts)
- [x] **Functional file explorer** with real project files from API
- [x] **Monaco Editor** with real file content, tab management, editing
- [x] **AI chat panel** with real prompt history, generation flow, progress indicator
- [x] **Live HTML/CSS/JS preview** via iframe (App tab)
- [x] **Terminal dock** with real generation logs
- [x] **Full generation pipeline**: user prompt -> register -> Inworld AI -> save -> refresh
- [x] Resizable panels with persistent layout
- [x] Activity bar with VS Code-style icons
- [x] Global status bar with git branch, errors, warnings, file count
- [x] Working code generation via Inworld AI backend endpoint
- [x] Full project flow: workspace prompt -> builder -> generation -> follow-up
- [x] Bug fixes: generator reset, .trim() crash, credit blocking, Supabase dependency removal

### Bug Fixes Applied
- [x] P0: Generator crash (`onSend={handleSend}` -> `onSend={() => handleSend()}`)
- [x] P0: Dead Supabase edge function -> Built `/api/generate-code` with GPT-4o -> Inworld AI
- [x] P0: Credit check blocking -> Made non-blocking
- [x] P1: HeroSection persistent project creation

### Pending/Backlog Tasks
#### P1 - Upcoming
- Smart Auto-Repair for preview errors
- GitHub integration (Pull from GitHub)
- Auto-save during generation

#### P2 - Future
- Project templates (React, HTML, TypeScript starters)
- Framework support (Vue, Svelte)
- Smart Agent streaming narration
- Mobile responsive IDE layout
- Deprecate/cleanup legacy ProjectBuilder.tsx

### Test Credentials
- Google login: rmcknight@virphoneusa.com
- Test session: test-session-5109b5df9ac34742
- Test project: proj_c427dc85e06a

### Test Reports
- iteration_17.json: Full E2E test of functional IDE - 100% pass rate (backend 23/23, frontend 12/12)
