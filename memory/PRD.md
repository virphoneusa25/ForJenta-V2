# ForJenta - AI Code Generation IDE

## Product Overview
ForJenta is a premium AI-powered code generation IDE that allows users to describe what they want to build and generates production-ready code instantly.

## Core Requirements
- Users enter a prompt on the landing page
- Unauthenticated users are prompted to sign in (Google OAuth via Emergent Auth)
- After auth, user is redirected to a new project workspace where generation starts automatically
- The user's original prompt must persist across the authentication boundary
- Generated code is displayed in a full IDE workspace with file explorer, editor, and preview

## Architecture
- **Frontend**: Vite + React + TypeScript + TailwindCSS + Zustand (state management)
- **Backend**: FastAPI + Python + MongoDB
- **Auth**: Emergent-managed Google Auth + Supabase fallback for email/password
- **AI Provider**: Inworld AI (server-side credentials)
- **State Persistence**: sessionStorage for cross-route prompt handoff

## Key User Flow
1. Landing page → User enters prompt
2. If unauthenticated → `savePendingPrompt()` → Auth Modal → Google OAuth
3. After OAuth → `AuthCallback` exchanges session → redirects to `/workspace`
4. `useOAuthCallback` detects pending prompt → calls `POST /api/projects` to create real project
5. Sets `forjenta_auto_generate` in sessionStorage → navigates to `/project/:id`
6. `IDEWorkspace` loads → `initProject` fetches project → auto-generate useEffect triggers `sendPrompt`
7. Code generation runs via `/api/generate` → files displayed in IDE

## What's Been Implemented

### Completed (as of 2026-03-20)
- [x] Full IDE workspace with Monaco editor, file explorer, terminal, preview
- [x] Inworld AI integration for code generation
- [x] Emergent-managed Google Auth (OAuth flow)
- [x] GitHub OAuth integration for repo management
- [x] Generation state machine (idle → preparing → generating → applying_files → completed)
- [x] Generation loop prevention (initGuard, sendingRef, module-level locks)
- [x] Provider execution layer (generationOrchestrator.ts, aiProviderRegistry.ts)
- [x] Backend API hardening (/api/generate with timeout, retry, JSON parsing)
- [x] **P0 FIX: E2E User Journey** - Prompt persistence through auth via sessionStorage
  - useOAuthCallback.ts: Creates REAL backend projects instead of fake client-side IDs
  - IDEWorkspace.tsx: Auto-triggers generation from pending prompt after project loads
  - workspaceStore.ts: Guards against overwriting active generation state
  - AuthModal.tsx: Creates real backend projects in handlePostAuthHandoff
- [x] Persistent project store (MongoDB CRUD for projects, files, prompts)
- [x] Project workspace page with project listing and detail panels

## Key API Endpoints
- `POST /api/auth/session` - Exchange Emergent Auth session_id
- `GET /api/auth/me` - Get current user
- `POST /api/projects` - Create project (requires auth)
- `GET /api/projects/:id` - Get project details
- `POST /api/projects/:id/prompts` - Add prompt to project
- `POST /api/projects/:id/files` - Save generated files
- `POST /api/generate` - Generate code (no auth, uses server-side Inworld API key)
- `GET /api/provider/status` - Check AI provider availability

## Prioritized Backlog

### P1 - Upcoming Tasks
- Smart Auto-Repair for code preview errors
- GitHub Integration: "Pull from GitHub" feature
- Auto-save functionality during code generation

### P2 - Future Tasks
- Project templates (React, HTML, TypeScript)
- Support for additional frameworks (Vue, Svelte)
- Streaming narration from the AI
- Mobile responsive IDE layout
- Refactor legacy ProjectBuilder.tsx page

## Key Files
- `/app/src/hooks/useOAuthCallback.ts` - Post-OAuth project creation
- `/app/src/hooks/usePromptFlow.ts` - sessionStorage prompt persistence
- `/app/src/pages/IDEWorkspace.tsx` - IDE workspace with auto-generate
- `/app/src/stores/workspaceStore.ts` - Central Zustand store
- `/app/src/components/features/HeroSection.tsx` - Landing page prompt form
- `/app/src/components/features/AuthModal.tsx` - Auth modal with prompt handoff
- `/app/src/pages/AuthCallback.tsx` - OAuth callback handler
- `/app/src/lib/generationOrchestrator.ts` - AI generation orchestration
- `/app/backend/server.py` - FastAPI backend
