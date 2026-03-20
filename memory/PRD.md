# ForJenta - AI Code Generation IDE

## Product Requirements Document

### Overview
ForJenta is a premium, persistent, project-based AI code generation IDE styled as a dark developer-tool environment.

### Core Architecture
- **Frontend**: Vite + React + TypeScript + TailwindCSS + Zustand
- **Backend**: FastAPI + Python + MongoDB
- **Code Generation**: Inworld AI Router (OpenAI-compatible)
- **Auth**: Emergent-managed Google OAuth + GitHub OAuth

### Generation State Machine
```
idle → preparing → generating → applying_files → completed
                                               → failed
```
- Only one run at a time via module-level `_genLock`
- Each run has a unique `runId` logged to terminal
- Duplicate triggers rejected with console log
- `genPhase` gates new runs: only `idle`/`completed`/`failed` allow new runs

### Anti-Loop Protections
1. `_initLock` — module-level, prevents concurrent `initProject` calls
2. `_genLock` — module-level, prevents concurrent `sendPrompt` calls
3. `_providerCheckedForProject` — tracks which project already had provider checked
4. `_currentRunId` — tracks active run, ignores stale callbacks
5. `initCalledFor` ref — prevents React strict mode / HMR double-init
6. `sendingRef` — PromptComposer local ref prevents Enter+click double-fire
7. `genPhase` state machine — rejects runs unless idle/completed/failed

### Provider Execution Layer
- `modelConfig.ts` — ModelConfig type with providerId, providerLabel, modelId, etc.
- `aiProviderRegistry.ts` — Provider registry + `/api/provider/status` health check
- `generationOrchestrator.ts` — Full flow with retry logic (2 retries, 150s timeout)
- Backend `/api/generate` — Full contract (rootPrompt, followUpPrompt, fileTree, buildHistory)
- Backend `/api/provider/status` — Health check (no auth required)

### What's Been Implemented
- [x] IDE workspace with real project data
- [x] Inworld AI provider execution layer
- [x] **Generation state machine** (idle/preparing/generating/applying_files/completed/failed)
- [x] **Module-level locks** preventing all duplicate triggers
- [x] **Ref-based guards** for React strict mode / HMR / Enter+click
- [x] **Provider status cached** (checked once per project, not every render)
- [x] **Terminal starts fresh** each session (no stale log accumulation)
- [x] **Run IDs** for each generation logged to terminal
- [x] Retry logic (2 retries on network failures)
- [x] Truncated JSON repair for oversized AI responses
- [x] localStorage persistence for messages/files/tabs
- [x] Context memory (original prompt + files as AI context)
- [x] Monaco Editor, live preview, file explorer, tab management

### Pending Tasks
#### P1 - Upcoming
- Smart Auto-Repair for preview errors
- GitHub integration (Pull from GitHub)
- Auto-save during generation

#### P2 - Future
- Project templates, Framework support
- Streaming narration, Mobile responsive IDE

### Test Reports
- iteration_20.json: Loop prevention — 100% (backend 9/9, frontend all verified, triple-Enter = 1 submission)
- iteration_19.json: Provider layer — 100%
- iteration_18.json: 401 fix — 100%
- iteration_17.json: Initial IDE — 100%

### Test Credentials
- Session: test-session-8ee31486befa493f
- Project: proj_c427dc85e06a
