/**
 * Agent Module - Smart AI Build Agent
 * 
 * Exports all agent-related functionality for the ForJenta AI Builder
 */

// Task Classification
export {
  classifyTask,
  getTaskIntroduction,
  getNextAction,
  type TaskType,
  type TaskClassification,
} from './TaskClassifier';

// Project Inspection
export {
  inspectProject,
  findRelevantFiles,
  getInspectionNarration,
  type ProjectInspection,
  type FileTreeNode,
  type CodePattern,
  type ArchitectureInfo,
} from './ProjectInspector';

// Narration
export {
  AgentNarrator,
  agentNarrator,
  createThought,
  createFileAction,
  createStatus,
  createVerification,
  STATUS_MESSAGES,
  type NarrationStatus,
  type StreamingThought,
  type FileAction,
  type AgentMessage,
} from './AgentNarrator';

// Smart Build Agent
export {
  SmartBuildAgent,
  smartAgent,
  type AgentContext,
  type AgentStep,
  type AgentPlan,
} from './SmartBuildAgent';
