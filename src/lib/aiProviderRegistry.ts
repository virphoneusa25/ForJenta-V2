/**
 * AI Provider Registry
 * Manages available AI providers and their status.
 * Provider credentials live server-side only — never exposed to client.
 */

import type { ModelConfig } from './modelConfig';
import { INWORLD_PROVIDER } from './modelConfig';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

export interface ProviderStatus {
  available: boolean;
  provider: string;
  providerLabel?: string;
  modelId?: string;
  modelLabel?: string;
  error?: string;
  message?: string;
}

const registry: Map<string, ModelConfig> = new Map();

// Register built-in providers
registry.set('inworld', INWORLD_PROVIDER);

/**
 * Get the active provider config.
 */
export function getActiveProvider(): ModelConfig {
  return INWORLD_PROVIDER;
}

/**
 * Check if the server-side provider is configured and reachable.
 * Calls /api/provider/status — never exposes secrets to client.
 */
export async function checkProviderStatus(): Promise<ProviderStatus> {
  try {
    const res = await fetch(`${API_URL}/api/provider/status`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) {
      return {
        available: false,
        provider: 'inworld',
        error: 'ROUTE_UNREACHABLE',
        message: `Provider status endpoint returned ${res.status}`,
      };
    }

    return await res.json();
  } catch (err: any) {
    return {
      available: false,
      provider: 'inworld',
      error: 'NETWORK_FETCH_FAILED',
      message: `Cannot reach provider status endpoint: ${err.message || 'network error'}`,
    };
  }
}

export { registry as providerRegistry };
