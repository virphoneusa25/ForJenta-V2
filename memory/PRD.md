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
   - Removed non-functional Google OAuth button (Supabase provider not enabled)
   - Login now uses email/password only
   - Signup uses email OTP verification flow
   - Both pages work correctly without errors

3. **Environment Configuration**
   - Updated `vite.config.ts` to use port 3000 and allow preview hosts
   - Configured `allowedHosts` for Emergent preview environment
   - Updated supervisor to run Vite instead of old React setup

4. **Dependencies**
   - Installed missing `@monaco-editor/react` package

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
