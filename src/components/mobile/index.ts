/**
 * Mobile Components - Premium Mobile Builder UI
 * 
 * A collection of components for the mobile-first AI build agent experience.
 */

// Core Layout Components
export { default as MobileBuilderHeader } from './MobileBuilderHeader';
export { default as MobileBuilderView } from './MobileBuilderView';
export { default as MobileConversationFeed, convertPipelineToFeedItems } from './MobileConversationFeed';
export { default as MobileAgentDock } from './MobileAgentDock';

// Message & Card Components
export { 
  default as AgentMessageCard,
  AssistantMessageCard,
  UserPromptCard,
  StatusRow,
  VerificationCard,
  FileActionCard,
  AgentThinkingIndicator,
} from './AgentMessageCard';

// Status Components
export { default as MobileBuildStatusPill, StatusDot } from './MobileBuildStatusPill';

// Preview Components  
export { default as MobilePreviewCTA, MobilePreviewMiniCard } from './MobilePreviewCTA';
export { default as MobilePreviewSheet } from './MobilePreviewSheet';

// Tool Components
export { default as MobileToolsSheet } from './MobileToolsSheet';

// Legacy Components (for backward compatibility)
export { default as MobileFileActionCard } from './MobileFileActionCard';
export { default as MobileBuildMessageCard, MobileProcessingIndicator } from './MobileBuildMessageCard';
