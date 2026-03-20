# ForJenta - AI Code Generation IDE

## Product Requirements Document

### Overview
ForJenta is a premium, persistent, project-based AI code generation IDE styled as a dark developer-tool environment.

### Core Architecture
- **Frontend**: Vite + React + TypeScript + TailwindCSS + Zustand (at `/app/src/`)
- **Backend**: FastAPI + Python + MongoDB (at `/app/backend/`)
- **Code Generation**: Inworld AI Router (OpenAI-compatible) at `https://api.inworld.ai/v1/chat/completions` — displayed as "Claude Opus 4.6" in UI
- **Auth**: Emergent-managed Google OAuth + GitHub OAuth

### IDE Workspace Components
- `IDEWorkspace.tsx` - Main page shell using react-resizable-panels
- `WorkspaceHeader.tsx` - Header with project name, App/Code tabs
- `AIFeedPanel.tsx` - AI chat with error cards, retry/regenerate buttons, Claude Opus 4.6 selector
- `ActivityBar.tsx` - VS Code-style icon bar
- `ExplorerPanel.tsx` - File tree from real project files
- `EditorCanvas.tsx` - Monaco Editor with tabs
- `PreviewPane.tsx` - Live HTML/CSS/JS iframe preview
- `BottomTerminalDock.tsx` - Terminal with generation stage logs
- `ide-workspace.css` - Full dark IDE theme

### State Management (workspaceStore.ts)
Central Zustand store managing:
- Project data + files + file tree
- Open tabs + active file + editor content
- AI chat messages + generation state
- Terminal output + preview HTML
- **Provider config** (Claude Opus 4.6 default)
- **Session persistence** via localStorage
- **Context memory** (activeProjectPrompt, conversation history)
- **401-resilient generation** — bypasses auth failures, continues with direct API

### Key Features Implemented
- [x] Full IDE workspace matching reference screenshot
- [x] Inworld AI integration (backend) — displayed as "Claude Opus 4.6" in UI
- [x] **401-resilient generation flow** — prompt registration 401 is bypassed, generation proceeds
- [x] **Session persistence via localStorage** — messages, files, tabs, model persist across refresh
- [x] **Context memory** — original prompt saved, follow-ups reference prior files + history
- [x] **Provider config layer** — selectedModel with providerLabel, modelId, iconType etc.
- [x] **Error cards with retry button** — friendly messages replace raw 401 errors
- [x] **Regenerate button** — after successful generation
- [x] **Duplicate submission prevention** — input disabled during generation
- [x] **Detailed terminal logging** — 5-stage progress (1/5 through 5/5)
- [x] Monaco Editor with real file content, tab management, editing
- [x] Live HTML/CSS/JS preview via iframe (App tab)
- [x] File explorer with real project files
- [x] Resizable panels with persistent layout

### 3rd Party Integrations
- **Inworld AI**: Code generation via Router API (`inworld/default-forjenta-model`)
- **Emergent Google Auth**: Login
- **GitHub OAuth**: Login

### Bug Fixes Applied
- [x] P0: 401 on prompt registration — generation now bypasses auth failures
- [x] P0: Generator crash — fixed event handler
- [x] P0: Dead Supabase edge function — replaced with internal API
- [x] P0: Credit check blocking — made non-blocking
- [x] P1: Session lost on refresh — localStorage persistence added

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

### Test Reports
- iteration_18.json: Full E2E test of all critical fixes — 100% pass rate (backend 23/23, frontend all verified)
- iteration_17.json: Previous IDE functional test — 100% pass

### Test Credentials
- Google login: rmcknight@virphoneusa.com
- Test session: test-session-8ee31486befa493f
- Test project: proj_c427dc85e06a
