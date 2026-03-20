# ForJenta - AI Code Generation IDE

## Product Requirements Document

### Overview
ForJenta is a premium, persistent, project-based AI code generation IDE styled as a dark developer-tool environment.

### Core Architecture
- **Frontend**: Vite + React + TypeScript + TailwindCSS + Zustand (at `/app/src/`)
- **Backend**: FastAPI + Python + MongoDB (at `/app/backend/`)
- **Code Generation**: Inworld AI Router (OpenAI-compatible) at `https://api.inworld.ai/v1/chat/completions`
- **Auth**: Emergent-managed Google OAuth + GitHub OAuth

### Provider Execution Layer
- `modelConfig.ts` — ModelConfig type with providerId, providerLabel, modelId, modelLabel, apiBaseUrl, authType, icon
- `aiProviderRegistry.ts` — Provider registry + `/api/provider/status` health check
- `generationOrchestrator.ts` — Full generation flow with retry logic (2 retries, 150s timeout)
- Backend `/api/generate` — Full contract endpoint (rootPrompt, followUpPrompt, fileTree, buildHistory)
- Backend `/api/provider/status` — Provider health check (no auth required)
- Startup validation logs provider configuration

### IDE Components
- `IDEWorkspace.tsx` — Main page shell
- `WorkspaceHeader.tsx` — Project name, App/Code tabs
- `AIFeedPanel.tsx` — AI chat, error cards, retry/regenerate, model picker (Inworld — Inworld AI)
- `ExplorerPanel.tsx` — File tree from real project files
- `EditorCanvas.tsx` — Monaco Editor with tabs
- `PreviewPane.tsx` — Live HTML/CSS/JS iframe preview
- `BottomTerminalDock.tsx` — Terminal with stage-by-stage logs
- `ActivityBar.tsx` — VS Code-style icon bar

### State Management (workspaceStore.ts)
- Project data, files, file tree
- Open tabs, active file, editor content
- AI chat messages, generation state
- Terminal output, preview HTML
- Provider config (Inworld default), provider availability
- Session persistence via localStorage
- Context memory (activeProjectPrompt, conversation history)

### What's Been Implemented
- [x] Full IDE workspace matching reference screenshot
- [x] **Inworld AI provider execution layer** (modelConfig, aiProviderRegistry, generationOrchestrator)
- [x] **Backend /api/generate** with full input/output contract (no user auth required)
- [x] **Backend /api/provider/status** endpoint for health checks
- [x] **Startup validation** of Inworld API key and model config
- [x] **Retry logic** (2 retries on network failures, 150s timeout)
- [x] **Truncated JSON repair** for oversized AI responses
- [x] **Truthful model picker** showing "Inworld — Inworld AI"
- [x] **Structured error codes** (PROVIDER_KEY_MISSING, PROVIDER_REQUEST_FAILED, NETWORK_FETCH_FAILED, etc.)
- [x] **No "local mode"** — generation always uses backend provider
- [x] **Precise terminal logging** (stage-by-stage: provider validation, request, response, file ops)
- [x] **Error cards with retry** button and structured error codes
- [x] **Regenerate button** after successful generation
- [x] **localStorage persistence** for messages, files, tabs, model
- [x] **Context memory** — original prompt + files + conversation as AI context
- [x] **Follow-up prompts** treated as refinements (continuation mode with fileTree)
- [x] Monaco Editor, live preview, file explorer, tab management
- [x] Resizable panels, activity bar, global status bar

### Bug Fixes Applied
- [x] P0: 401 on generation — removed auth dependency, generation uses server-side credentials
- [x] P0: "Failed to fetch" — added retry logic, increased timeouts
- [x] P0: Truncated AI responses — JSON repair for incomplete files
- [x] P0: Misleading "local mode" messages — removed, replaced with truthful provider status
- [x] P0: Generator crash, dead Supabase, credit blocking (from previous sessions)

### API Endpoints
- `GET /api/provider/status` — Provider health check (no auth)
- `POST /api/generate` — Full generation endpoint (no auth, server-side credentials)
- `POST /api/generate-code` — Legacy generation endpoint (backward compat)
- `GET /api/projects/:id` — Load project (auth required)
- `POST /api/projects/:id/prompts` — Register prompt (auth, optional)
- `POST /api/projects/:id/files` — Save files (auth, optional)

### Pending Tasks
#### P1 - Upcoming
- Smart Auto-Repair for preview errors
- GitHub integration (Pull from GitHub)
- Auto-save during generation

#### P2 - Future
- Project templates (React, HTML, TypeScript starters)
- Framework support (Vue, Svelte)
- Streaming generation narration
- Mobile responsive IDE layout
- Deprecate legacy ProjectBuilder.tsx

### Test Reports
- iteration_19.json: Provider layer + generation E2E — 100% (backend 14/14, frontend all pass)
- iteration_18.json: Previous 401 fix — 100%
- iteration_17.json: Initial functional IDE — 100%

### Test Credentials
- Session: test-session-8ee31486befa493f
- Project: proj_c427dc85e06a
- Email: rmcknight@virphoneusa.com
