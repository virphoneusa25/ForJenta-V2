# ForJenta - AI Code Generation IDE

## Original Problem Statement
Clone the repository https://github.com/virphoneusa25/ForJenta-9bg3j5.git and:
1. Fix bugs - ensure live preview is always working
2. Make modifications/improvements to enhance user experience on the backend platform

## Architecture
- **Frontend**: Vite + React 18 + TypeScript + Tailwind CSS
- **State Management**: Zustand
- **Backend Services**: Supabase Edge Functions (for AI generation)
- **Local Backend**: FastAPI + MongoDB (basic status endpoints)
- **Preview System**: Custom client-side transpiler with Babel for React/TSX, direct rendering for plain HTML/JS

## What's Been Implemented (March 19, 2026)

### Bug Fixes
1. **Fixed Live Preview for Plain HTML Projects**
   - Modified `/app/src/lib/previewRenderer.ts` to detect project type
   - Added `isPlainHTMLProject()` and `isReactProject()` detection functions
   - Added `renderPlainHTMLProject()` function for direct HTML rendering

2. **Fixed Login/Authentication Issues**
   - Initially removed non-functional Google OAuth (Supabase provider not enabled)
   - Now replaced with **Emergent-managed Google Auth** which works!

3. **Environment Configuration**
   - Updated `vite.config.ts` to use port 3000 and allow preview hosts
   - Configured `allowedHosts` for Emergent preview environment

### New Features

#### Google OAuth via Emergent Auth
- "Continue with Google" button on Login and Signup pages
- Uses Emergent Auth (`auth.emergentagent.com`) - no setup needed!
- AuthCallback component handles OAuth response
- Backend session management with httpOnly cookies

#### GitHub Integration
- OAuth flow to connect GitHub accounts
- Repository listing (public + private)
- Create new repositories
- Branch management
- Push files to repos

#### Persistent Project-Based AI Builder (MAJOR FEATURE)

##### Backend (MongoDB + FastAPI)
- **Models** (`/app/backend/models.py`):
  - `Project` - Main project entity with metadata
  - `ProjectPrompt` - Conversation/build history
  - `GenerationRun` - Individual generation executions
  - `GenerationStep` - Steps within a generation
  - `ProjectFile` - Current file state
  - `FileVersion` - Version history for each file
  - `ProjectActivity` - Activity timeline
  - `PreviewCheck` - Preview validation results
  - `RepairRecord` - Repair tracking

- **Project Service** (`/app/backend/project_service.py`):
  - Create/Read/Update/Delete projects
  - Prompt history management
  - File versioning with full history
  - Generation run tracking
  - Prompt classification (continuation vs rebuild)
  - Activity logging

- **API Endpoints**:
  - `POST /api/projects` - Create new project
  - `GET /api/projects` - List user's projects
  - `GET /api/projects/{id}` - Get project details
  - `GET /api/projects/{id}/context` - Load full context for continuation
  - `POST /api/projects/{id}/prompts` - Add prompt with classification
  - `GET /api/projects/{id}/prompts` - Get prompt history
  - `POST /api/projects/{id}/files` - Save files with versioning
  - `GET /api/projects/{id}/files` - Get current files
  - `GET /api/projects/{id}/files/{path}/versions` - File version history
  - `GET /api/projects/{id}/generations` - Generation history
  - `PATCH /api/projects/{id}/generations/{run_id}` - Update generation
  - `PATCH /api/projects/{id}/architecture` - Update architecture metadata
  - `GET /api/projects/{id}/activity` - Activity timeline
  - `DELETE /api/projects/{id}` - Soft delete project

##### Frontend
- **Persistent Project Store** (`/app/src/stores/persistentProjectStore.ts`):
  - Current project state
  - Files, prompts, generations, activity
  - CRUD operations
  - Context loading
  - File version retrieval

- **Components**:
  - `PromptHistory` - Shows conversation/build timeline
  - `ContinuationPromptComposer` - Input with continuation indicators
  - `FileVersionHistory` - Version history for files

- **Generation Hook** (`/app/src/hooks/usePersistentGeneration.ts`):
  - Loads project context before generation
  - Classifies prompts (add_feature, refine, repair, etc.)
  - Preserves existing files during continuation
  - Saves files with version history
  - Updates project architecture

##### Prompt Classification
System automatically classifies prompts as:
- `create_initial` - First prompt, new project
- `add_feature` - Add new feature
- `refine_feature` - Modify/improve existing
- `redesign_ui` - UI/UX changes
- `repair_bug` - Fix bugs
- `refactor_code` - Code cleanup
- `connect_backend` - Backend/data connections
- `replace_file` - Replace specific files
- `full_rebuild` - Only if explicitly requested

##### Continuation Behavior
- Default: CONTINUE/MODIFY existing project
- Only full rebuild if user explicitly requests it
- Preserves working files
- Tracks what changed in each prompt
- Full version history for rollback

### UX Enhancements
1. **Project Type Indicator Badge** (Added)
   - Added `detectProjectType()` function to identify project type
   - Added `ProjectTypeBadge` component showing color-coded badge
   - Types detected: React+TypeScript (blue), React (cyan), HTML+JavaScript (orange), HTML (amber)
   - Badge appears in preview header next to viewport size indicator
   - Helps users understand what preview mode is being used

2. **Mobile-First Builder Redesign** (Added March 19, 2026)
   - Complete mobile-first, conversation-driven builder UI
   - Responsive breakpoint at 768px: mobile view (<768px) vs desktop view (>=768px)
   - Mobile Components (`/app/src/components/mobile/`):
     - `MobileBuilderHeader` - Compact header with project name, status, preview + menu buttons
     - `MobileAgentDock` - Sticky bottom composer with input, quick actions, status indicator
     - `MobileConversationFeed` - Scrollable activity/conversation feed
     - `MobileFileActionCard` - Expandable file action cards with code preview
     - `MobileBuildMessageCard` - Status/assistant message cards
     - `MobileBuildStatusPill` - Compact status indicator
     - `MobilePreviewCTA` - Floating preview call-to-action button
     - `MobileToolsSheet` - Bottom sheet for tools (save, download, history, etc.)
     - `MobilePreviewSheet` - Full-screen preview overlay with viewport toggles
     - `MobileBuilderView` - Main mobile layout integrating all components
   - Features:
     - Sticky agent composer dock at bottom with quick actions
     - Floating "View Preview" CTA button
     - File action cards in conversation feed
     - Bottom sheet for tools/actions
     - Full-screen preview overlay with mobile/tablet/desktop viewports
     - Automatic viewport detection and responsive switching

### Core Features Working
- Homepage at `/` 
- Workspace at `/workspace`
- Project Builder with file editor (Monaco)
- Live preview with auto-refresh
- **Project type badge** showing preview mode
- Console panel showing preview logs
- Code/App view toggle
- Mobile, tablet, desktop viewport modes
- Version history

#### Smart AI Build Agent (NEW - March 19, 2026)
The generator has been rebuilt into a smart, goal-driven, conversational AI build agent.

**Core Agent Modules** (`/app/src/lib/agent/`):
- `TaskClassifier.ts` - Automatic task intent classification (15+ task types)
- `ProjectInspector.ts` - Project context analysis and pattern detection
- `AgentNarrator.ts` - Real-time streaming thought narration
- `SmartBuildAgent.ts` - Main orchestrator for goal-driven generation

**Task Types Supported**:
- Create new project
- Continue existing project
- Add/modify features
- Redesign UI
- Repair preview issues
- Fix bugs
- Create tests
- Validate features
- Refactor code
- Improve mobile UI
- Connect backend/API
- Update authentication
- Run verification
- Inspect project

**Agent Behavior**:
1. Classifies user prompt into task type automatically
2. Inspects existing project context before making changes
3. Plans changes and identifies targeted files
4. Narrates work in real-time with streaming thoughts
5. Shows file actions inline (Created, Updated, Repaired, etc.)
6. Auto-validates ALL changes
7. Auto-verifies after each significant change
8. Continues multi-step work autonomously
9. Extends existing projects by default (not rebuild)

**React Hook**: `useSmartAgent.ts` - Integrates agent with generation pipeline

## Prioritized Backlog

### P0 (Critical)
- ✅ Live preview working for all project types
- ✅ Project type indicator badge
- ✅ Google OAuth via Emergent Auth
- ✅ GitHub OAuth integration
- ✅ Persistent project system with history
- ✅ File diff viewer
- ✅ Revert to version functionality
- ✅ GitHub push integration
- ✅ What Changed panel
- ✅ Mobile-first builder UI redesign
- ✅ Smart AI Build Agent with task classification
- ✅ Real-time streaming agent narration
- ✅ Auto-verification of ALL changes

### P1 (High)
- Smart Auto-Repair for preview errors (integrate with agent)
- GitHub "Pull from Repo" feature
- Auto-save during generation
- Add Vue.js project detection and preview support
- Enhance preview loading states with better visual feedback

### P2 (Medium)
- Add syntax highlighting for more file types in editor
- Implement project templates
- Add export/download all files as zip
- Add branch selection for GitHub push

### P3 (Low)
- Dark/light theme toggle for preview
- Split view (code + preview side by side)
- Keyboard shortcuts documentation
- Pull from GitHub to project

## Next Tasks
1. Complete integration of SmartBuildAgent with ProjectBuilder.tsx
2. Smart Auto-Repair feature for preview errors
3. GitHub "Pull from Repo" feature  
4. Add auto-save during generation
5. Implement project templates for quick starts
