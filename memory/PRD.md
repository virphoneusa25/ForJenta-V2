# ForJenta - AI Code Generation IDE

## Product Requirements Document

### Overview
ForJenta is a premium, persistent, project-based AI code generation IDE. Users describe what they want to build, and the AI generates full applications with multiple files, live preview, and version history.

### Core Architecture
- **Frontend**: Vite + React + TypeScript + TailwindCSS + Zustand (at `/app/src/`)
- **Backend**: FastAPI + Python + MongoDB (at `/app/backend/`)
- **Auth**: Emergent-managed Google OAuth + GitHub OAuth
- **Credits**: Supabase-based credit system
- **State Management**: `persistentProjectStore` (primary, MongoDB-backed) + `projectStore` (legacy, localStorage fallback)

### Key User Flows
1. **Homepage -> Create Project**: User types prompt -> persistent project created in MongoDB -> redirected to builder -> auto-generation starts
2. **Workspace -> Continue Project**: User sees all projects -> clicks to continue -> loads persistent project -> submits follow-up prompts
3. **Builder -> Generate Code**: User submits prompt -> credit check -> AI generates files -> files saved to both persistent and legacy stores -> preview available

### Database Schema (MongoDB)
- `users` - User accounts and auth info
- `projects` - Project metadata
- `project_files` - Current state of all files in a project
- `file_versions` - History of file changes
- `prompts` - Log of user prompts for a project
- `generation_runs` - Tracks AI generation tasks
- `project_activity` - Timeline of project events

### API Endpoints
- `POST /api/auth/google/login` - Google OAuth
- `POST /api/auth/github/login` - GitHub OAuth
- `GET /api/auth/me` - Get current user
- `GET/POST /api/projects/` - List/Create projects
- `GET/PUT /api/projects/{id}` - Get/Update project
- `POST /api/projects/{id}/prompts` - Continue project with new prompt
- `GET /api/status` - Health check

### What's Been Implemented
- [x] Full-stack persistent architecture (FastAPI + MongoDB + React/Vite)
- [x] Google and GitHub OAuth
- [x] Dual-view UI: Desktop IDE layout + Mobile conversational builder
- [x] Project creation from homepage prompt (creates persistent project)
- [x] File generation pipeline with streaming steps
- [x] Credit system with Supabase
- [x] Code editor with syntax highlighting
- [x] Live preview with iframe
- [x] Mobile-first builder redesign with glass-morphism UI
- [x] Smart Agent foundation (TaskClassifier, ProjectInspector, AgentNarrator)

### Bug Fixes Applied (March 19, 2026)
- [x] **P0 CRITICAL: Generator Reset Bug (Desktop + Mobile)** - Root cause: `onSend={handleSend}` passed React MouseEvent as `overridePrompt` parameter, causing `(event).trim()` to crash. Fixed all 3 instances in ProjectBuilder.tsx (lines 878, 1086, 1364) to `onSend={() => handleSend()}`. Verified working on both 1920px desktop and 375px mobile viewports.
- [x] **P0: Build Failure** - Vite/SWC syntax error resolved (from prior session)
- [x] **Supporting fixes**: HeroSection creates persistent projects, project memo includes file IDs, credit check wrapped in try-catch, applyFiles handles both stores
- [x] **P1: Mobile Scrolling** - Workspace page scrolling verified working

### Pending/Backlog Tasks
#### P1 (High Priority)
- Smart Auto-Repair: Detect and fix preview errors automatically
- GitHub Integration: "Pull from GitHub" feature
- Auto-Save during code generation

#### P2 (Nice to Have)
- Project Templates: Start from React/HTML/TypeScript templates
- Expanded Framework Support: Vue, Svelte
- Full Smart Agent integration (streaming narration, auto-verify)

### Refactoring Needs
- `ProjectBuilder.tsx` is 1450+ lines - needs decomposition into smaller components
- Consolidate dual-store pattern (use `persistentProjectStore` as single source of truth)
- Clean up legacy `projectStore` usage throughout codebase

### Test Credentials
- Google login: rmcknight@virphoneusa.com
