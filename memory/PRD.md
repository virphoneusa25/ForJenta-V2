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

2. **Environment Configuration**
   - Updated `vite.config.ts` to use port 3000 and allow preview hosts
   - Configured `allowedHosts` for Emergent preview environment
   - Updated supervisor to run Vite instead of old React setup

3. **Dependencies**
   - Installed missing `@monaco-editor/react` package

### Core Features Working
- Homepage at `/` 
- Workspace at `/workspace`
- Project Builder with file editor (Monaco)
- Live preview with auto-refresh
- Console panel showing preview logs
- Code/App view toggle
- Mobile, tablet, desktop viewport modes
- Version history

## Prioritized Backlog

### P0 (Critical)
- ✅ Live preview working for all project types

### P1 (High)
- Enhance preview loading states with better visual feedback
- Add clear console on preview refresh option
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
