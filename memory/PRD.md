# ForJenta - AI Code Generation IDE

## Product Requirements Document

### Overview
ForJenta is a premium, persistent, project-based AI code generation IDE. Users describe what they want to build, and the AI generates full web applications with multiple files, live preview, and version history.

### Core Architecture
- **Frontend**: Vite + React + TypeScript + TailwindCSS + Zustand (at `/app/src/`)
- **Backend**: FastAPI + Python + MongoDB (at `/app/backend/`)
- **Code Generation**: GPT-4o via Emergent LLM key (`/app/backend/code_generator.py`)
- **Auth**: Emergent-managed Google OAuth + GitHub OAuth
- **Credits**: Supabase-based credit system (non-blocking)
- **State Management**: `persistentProjectStore` (primary, MongoDB-backed) + `projectStore` (legacy fallback)

### Key User Flows
1. **Workspace -> Create Project**: User types prompt -> persistent project created -> navigates to builder -> auto-generation runs
2. **Builder -> Follow-up Prompt**: User types modification -> continuation prompt classified -> files updated -> preview refreshed
3. **Full Generation Cycle**: Prompt received -> GPT-4o generates files -> saved to MongoDB -> live preview rendered

### API Endpoints
- `GET /api/status` - Health check
- `POST /api/generate-code` - **Code generation via GPT-4o** (no auth required)
- `POST /api/auth/google/login` - Google OAuth
- `POST /api/auth/github/login` - GitHub OAuth
- `GET /api/auth/me` - Current user
- `GET/POST /api/projects/` - List/Create projects
- `GET/PUT /api/projects/{id}` - Get/Update project
- `POST /api/projects/{id}/prompts` - Continue project
- `POST /api/projects/{id}/files` - Save files
- `GET /api/projects/{id}/files` - Get project files

### Bug Fixes Applied (March 19, 2026)

#### P0: Generator Reset/Crash on Prompt Submit
- **Root cause**: `onSend={handleSend}` passed React MouseEvent as `overridePrompt`, causing `.trim()` crash
- **Fix**: Changed to `onSend={() => handleSend()}` in all 3 locations (lines 878, 1086, 1364)

#### P0: Code Generation Completely Broken
- **Root cause**: Supabase edge function (`generate-code`) was dead/timing out - no response ever returned
- **Fix**: Built new backend `/api/generate-code` endpoint using GPT-4o via Emergent integrations
- **Files**: `/app/backend/code_generator.py`, `/app/src/lib/api.ts`

#### P0: Credit Check Blocking All Generation
- **Root cause**: `checkCredits()` returned `allowed: false` -> pipeline returned failed immediately
- **Fix**: Made credit check non-blocking (soft check - logs warning but proceeds)

#### P1: HeroSection Not Creating Persistent Projects
- **Root cause**: Only created local/legacy project, no MongoDB entry
- **Fix**: Now calls `createPersistentProject()` before navigating

### What's Been Implemented
- [x] Full-stack persistent architecture (FastAPI + MongoDB + React/Vite)
- [x] Google and GitHub OAuth
- [x] Dual-view UI: Desktop IDE + Mobile conversational builder
- [x] **Working code generation via GPT-4o backend endpoint**
- [x] **Complete flow: workspace prompt -> project creation -> builder -> generation -> follow-up**
- [x] Live preview with auto-refresh
- [x] File persistence with version history
- [x] Project continuation with prompt classification

### Pending/Backlog Tasks
#### P1
- Smart Auto-Repair for preview errors
- GitHub "Pull from Repo" integration
- Auto-save during generation

#### P2
- Project Templates (React/HTML/TS)
- Expanded Framework Support (Vue, Svelte)
- Full Smart Agent integration (streaming narration)
- Refactor ProjectBuilder.tsx (1450+ lines)

### Test Credentials
- Google login: rmcknight@virphoneusa.com
- Test session: test-session-392c2617873443118634ef418010156c
