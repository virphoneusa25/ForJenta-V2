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
   - Added `renderPlainHTMLProject()` function that:
     - Inlines CSS files
     - Inlines JavaScript files by replacing script src references
     - Injects console capture for preview console integration
   - Plain HTML projects (like todo-app) now render correctly instead of showing "No App.tsx found" error

2. **Fixed Login/Authentication Issues**
   - Initially removed non-functional Google OAuth (Supabase provider not enabled)
   - Now replaced with **Emergent-managed Google Auth** which works!

3. **Environment Configuration**
   - Updated `vite.config.ts` to use port 3000 and allow preview hosts
   - Configured `allowedHosts` for Emergent preview environment
   - Updated supervisor to run Vite instead of old React setup

4. **Dependencies**
   - Installed missing `@monaco-editor/react` package

### New Features

#### Google OAuth via Emergent Auth
- **Login page**: "Continue with Google" button using Emergent Auth
- **Signup page**: "Continue with Google" button using Emergent Auth
- **AuthCallback component**: Handles session_id exchange from OAuth callback
- Backend endpoints:
  - `POST /api/auth/session` - Exchange Emergent session_id for app session
  - `GET /api/auth/me` - Get current authenticated user
  - `POST /api/auth/logout` - Logout and clear session

#### GitHub Integration
- **Connect GitHub account** via OAuth
- **List repositories** - View all user's public and private repos
- **Create repositories** - Create new repos from ForJenta
- **Branch management** - List and switch branches
- **Push files** - Push project files to GitHub repos
- Backend endpoints:
  - `GET /api/github/connect` - Get GitHub authorization URL
  - `POST /api/github/callback` - Exchange code for token
  - `DELETE /api/github/disconnect` - Disconnect GitHub account
  - `GET /api/github/status` - Check connection status
  - `GET /api/github/repos` - List repositories
  - `POST /api/github/repos` - Create new repository
  - `GET /api/github/repos/{owner}/{repo}/branches` - List branches
  - `GET /api/github/repos/{owner}/{repo}/contents` - Get file contents
  - `POST /api/github/repos/{owner}/{repo}/push` - Push files to repo

### UX Enhancements
1. **Project Type Indicator Badge** (Added)
   - Added `detectProjectType()` function to identify project type
   - Added `ProjectTypeBadge` component showing color-coded badge
   - Types detected: React+TypeScript (blue), React (cyan), HTML+JavaScript (orange), HTML (amber)
   - Badge appears in preview header next to viewport size indicator
   - Helps users understand what preview mode is being used

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

## Prioritized Backlog

### P0 (Critical)
- ✅ Live preview working for all project types
- ✅ Project type indicator badge

### P1 (High)
- Add Vue.js project detection and preview support
- Enhance preview loading states with better visual feedback
- Improve error recovery in preview

### P2 (Medium)
- Add syntax highlighting for more file types in editor
- Implement project templates
- Add export/download all files as zip

### P3 (Low)
- Dark/light theme toggle for preview
- Split view (code + preview side by side)
- Keyboard shortcuts documentation

## Next Tasks
1. Test with more complex React projects
2. Add better error messages for unsupported file types
3. Consider adding Python/Node backend preview support
