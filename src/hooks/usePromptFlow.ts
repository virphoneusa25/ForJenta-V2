const STORAGE_KEY = 'forjenta_pending_prompt_flow';

export interface PendingPromptData {
  pendingPrompt: string;
  pendingIntent: string;
  source: 'homepage' | 'auth-modal' | 'direct';
  selectedCategory: string;
  timestamp: number;
}

/**
 * Save a structured prompt + metadata to sessionStorage.
 * Used when an unauthenticated user submits a prompt on the homepage.
 */
export function savePendingPrompt(
  prompt: string,
  options?: {
    intent?: string;
    source?: PendingPromptData['source'];
    category?: string;
  }
): void {
  const data: PendingPromptData = {
    pendingPrompt: prompt,
    pendingIntent: options?.intent || 'generate',
    source: options?.source || 'homepage',
    selectedCategory: options?.category || 'Web',
    timestamp: Date.now(),
  };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  console.log('[PromptFlow] Saved pending prompt:', data);
}

/**
 * Retrieve pending prompt data from sessionStorage.
 * Returns null if nothing is stored or if the data is stale (>30 min).
 */
export function getPendingPrompt(): PendingPromptData | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const data: PendingPromptData = JSON.parse(raw);
    // Expire after 30 minutes
    if (Date.now() - data.timestamp > 30 * 60 * 1000) {
      clearPendingPrompt();
      console.log('[PromptFlow] Expired pending prompt, cleared.');
      return null;
    }
    return data;
  } catch {
    clearPendingPrompt();
    return null;
  }
}

/**
 * Remove pending prompt data from sessionStorage.
 * Called after successful project creation + redirect.
 */
export function clearPendingPrompt(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  console.log('[PromptFlow] Cleared pending prompt.');
}
