/**
 * Generation Orchestrator
 * Manages the end-to-end generation flow:
 *   call backend /api/generate → parse response → return structured result
 *
 * All AI calls go through the backend route. Server-side Inworld credentials are used.
 * No user session/auth is required for generation.
 * Includes automatic retry for transient network failures.
 */

import { getActiveProvider } from './aiProviderRegistry';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;
const REQUEST_TIMEOUT_MS = 150_000; // 2.5 min — Inworld can be slow

// ── Types ──────────────────────────────────────────────────────────

export interface GenerationInput {
  projectId: string | null;
  rootPrompt: string;
  followUpPrompt?: string;
  fileTree: { path: string; content: string; language: string }[];
  openFiles: string[];
  buildHistory: string[];
}

export interface GenerationOutput {
  success: boolean;
  files: { path: string; content: string; language: string }[];
  actions: { type: string; path: string; language: string }[];
  todos: string[];
  logs: string[];
  summary: string;
  error?: string;
  errorCode?: string;
  provider?: string;
  model?: string;
}

export type LogCallback = (text: string, type: 'info' | 'success' | 'error' | 'command') => void;

// ── Orchestrator ───────────────────────────────────────────────────

export async function runGeneration(
  input: GenerationInput,
  onLog: LogCallback,
): Promise<GenerationOutput> {
  const provider = getActiveProvider();

  onLog(`Provider mode selected: ${provider.providerLabel}`, 'info');
  onLog('Validating server-side provider credentials...', 'info');
  onLog(`Sending generation request to backend route /api/generate`, 'info');
  onLog(`Calling Inworld model: ${provider.modelId}`, 'info');

  // Build request body
  const requestBody = JSON.stringify({
    projectId: input.projectId,
    rootPrompt: input.rootPrompt,
    followUpPrompt: input.followUpPrompt || null,
    fileTree: input.fileTree.map(f => ({ path: f.path, content: f.content, language: f.language })),
    openFiles: input.openFiles,
    buildHistory: input.buildHistory,
    selectedProvider: provider.providerId,
    selectedModel: provider.modelId,
  });

  // ── Retry loop ───────────────────────────────────────────────────
  let lastError = '';
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      onLog(`Retry attempt ${attempt}/${MAX_RETRIES}...`, 'info');
      await sleep(RETRY_DELAY_MS);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: requestBody,
      });

      clearTimeout(timeout);

      // ── Parse response ─────────────────────────────────────────────
      if (!response.ok) {
        let errMsg = `Backend returned HTTP ${response.status}`;
        try {
          const errBody = await response.json();
          errMsg = errBody.message || errBody.error || errBody.detail || errMsg;
        } catch {}
        onLog(`Backend response: HTTP ${response.status} — ${errMsg}`, 'error');
        // Don't retry on structured backend errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          return fail('PROVIDER_REQUEST_FAILED', errMsg, [`Backend response: HTTP ${response.status} — ${errMsg}`]);
        }
        lastError = errMsg;
        continue; // Retry on 5xx
      }

      let data: any;
      try {
        data = await response.json();
      } catch {
        onLog('Backend response: invalid JSON', 'error');
        lastError = 'Backend returned invalid JSON response.';
        continue; // Retry
      }

      if (!data.success) {
        const code = data.error || 'PROVIDER_REQUEST_FAILED';
        const msg = data.message || 'Generation failed at provider level.';
        onLog(`Provider response: FAILED — ${msg}`, 'error');
        // Don't retry structured provider failures (e.g. key missing, model invalid)
        if (code === 'PROVIDER_KEY_MISSING' || code === 'INVALID_MODEL_CONFIG') {
          return fail(code, msg, data.logs || []);
        }
        lastError = msg;
        continue; // Retry transient provider failures
      }

      // ── Success ────────────────────────────────────────────────────
      const files = data.files || [];
      onLog(`Provider response received`, 'success');
      onLog(`Parsed ${files.length} file operations`, 'success');
      onLog('Writing files to explorer', 'info');
      onLog('Generation complete', 'success');

      return {
        success: true,
        files,
        actions: data.actions || [],
        todos: data.todos || [],
        logs: data.logs || [],
        summary: data.summary || `Generated ${files.length} files`,
        provider: data.provider,
        model: data.model,
      };

    } catch (err: any) {
      const isAbort = err.name === 'AbortError';
      if (isAbort) {
        onLog('Generation request timed out — the AI provider may be overloaded', 'error');
        return fail('PROVIDER_REQUEST_FAILED', 'Generation request timed out after 2.5 minutes. The AI provider may be overloaded — try again.', ['Request timed out']);
      }

      lastError = err.message || 'Failed to fetch';
      onLog(`Network error (attempt ${attempt + 1}): ${lastError}`, attempt < MAX_RETRIES ? 'info' : 'error');
      // Continue to retry
    }
  }

  // All retries exhausted
  onLog(`All ${MAX_RETRIES + 1} attempts failed`, 'error');
  return fail(
    'NETWORK_FETCH_FAILED',
    `Could not reach the backend after ${MAX_RETRIES + 1} attempts. Last error: ${lastError}`,
    [`All attempts failed. Last error: ${lastError}`],
  );
}

function fail(errorCode: string, message: string, logs: string[]): GenerationOutput {
  return { success: false, files: [], actions: [], todos: [], logs, summary: '', error: message, errorCode };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
