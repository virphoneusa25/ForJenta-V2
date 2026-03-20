/**
 * Model & Provider Configuration
 * Defines the shape of model/provider configs used across the IDE.
 */

export interface ModelConfig {
  providerId: string;
  providerLabel: string;
  modelId: string;
  modelLabel: string;
  apiBaseUrl: string;
  apiKeyEnvName: string;
  authType: 'basic' | 'bearer' | 'none';
  supportsStreaming: boolean;
  enabled: boolean;
  icon: 'star' | 'sparkle' | 'bot';
}

export const INWORLD_PROVIDER: ModelConfig = {
  providerId: 'inworld',
  providerLabel: 'Inworld',
  modelId: 'inworld/default-forjenta-model',
  modelLabel: 'Inworld AI',
  apiBaseUrl: 'https://api.inworld.ai/v1/chat/completions',
  apiKeyEnvName: 'INWORLD_API_KEY',
  authType: 'basic',
  supportsStreaming: false,
  enabled: true,
  icon: 'star',
};

export const DEFAULT_MODEL = INWORLD_PROVIDER;
