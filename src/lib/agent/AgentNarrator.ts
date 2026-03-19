/**
 * AgentNarrator - Real-time streaming narration for the AI Build Agent
 * 
 * Provides streaming thought output, status updates, and conversational
 * feedback throughout the generation process.
 */

export type NarrationStatus = 
  | 'thinking'
  | 'inspecting'
  | 'planning'
  | 'working'
  | 'generating'
  | 'validating'
  | 'repairing'
  | 'verifying'
  | 'complete'
  | 'failed';

export interface StreamingThought {
  id: string;
  text: string;
  status: NarrationStatus;
  timestamp: string;
  isStreaming: boolean;
  streamedLength: number;
}

export interface FileAction {
  path: string;
  action: 'read' | 'viewed' | 'created' | 'updated' | 'repaired' | 'validated' | 'tested' | 'deleted';
  timestamp: string;
}

export interface AgentMessage {
  id: string;
  type: 'thought' | 'action' | 'status' | 'file' | 'verification';
  content: string;
  status: NarrationStatus;
  fileActions?: FileAction[];
  subDetails?: { label: string; value: string; status?: 'ok' | 'warn' | 'error' }[];
  timestamp: string;
  isStreaming: boolean;
}

// Premium status messages
export const STATUS_MESSAGES: Record<NarrationStatus, string> = {
  thinking: 'Analyzing your request...',
  inspecting: 'Inspecting current project...',
  planning: 'Planning the changes...',
  working: 'Agent is working...',
  generating: 'Generating code...',
  validating: 'Validating changes...',
  repairing: 'Repairing the blocking issue...',
  verifying: 'Running verification...',
  complete: 'Task complete',
  failed: 'Something went wrong',
};

// Conversational narration templates
const NARRATION_TEMPLATES = {
  // Task Classification
  taskIdentified: (taskType: string) => 
    `I identified this as a **${taskType}** request.`,
  
  // Project Inspection
  inspectingProject: () =>
    `Let me review the current project to understand what we're working with.`,
  foundExistingProject: (fileCount: number, summary: string) =>
    `I found an existing project with ${fileCount} files. ${summary}`,
  noExistingProject: () =>
    `This is a fresh workspace. I'll create the project structure from scratch.`,
  
  // Planning
  planningApproach: (approach: string) =>
    `Here's my approach: ${approach}`,
  identifiedTargetFiles: (files: string[]) =>
    `I identified ${files.length} file(s) that need attention: ${files.slice(0, 4).join(', ')}${files.length > 4 ? ` and ${files.length - 4} more` : ''}.`,
  
  // File Actions
  creatingFile: (path: string, purpose: string) =>
    `Creating **${path}** — ${purpose}`,
  updatingFile: (path: string, reason: string) =>
    `Updating **${path}** — ${reason}`,
  readingFile: (path: string) =>
    `Reading ${path} to understand the current structure.`,
  
  // Validation
  runningValidation: () =>
    `I'm running validation to ensure everything works correctly.`,
  validationPassed: (checkCount: number) =>
    `Validation complete — **${checkCount} checks passed**. The code is clean and ready.`,
  validationIssues: (issueCount: number) =>
    `Validation found **${issueCount} issue(s)**. I'll repair them before continuing.`,
  
  // Repair
  repairingIssue: (issue: string) =>
    `Repairing: ${issue}`,
  repairComplete: (count: number) =>
    `Repairs complete — **${count} issue(s)** fixed automatically.`,
  
  // Verification
  verifyingChanges: () =>
    `Let me verify that the changes work as expected.`,
  verificationPassed: () =>
    `Verification passed — the feature is working correctly.`,
  verificationFailed: (reason: string) =>
    `Verification found an issue: ${reason}. I'm investigating.`,
  
  // Completion
  taskComplete: (summary: string) =>
    `${summary} The preview is ready — click **"App"** to see it in action.`,
  continuePrompt: () =>
    `What would you like to do next? You can refine the design, add features, or ask me to fix something.`,
  
  // Errors
  errorOccurred: (error: string) =>
    `I ran into an issue: ${error}. Let me try a different approach.`,
};

/**
 * Generate a unique ID for messages
 */
function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Get current timestamp
 */
function ts(): string {
  return new Date().toISOString();
}

/**
 * Create a streaming thought message
 */
export function createThought(
  text: string,
  status: NarrationStatus = 'working'
): AgentMessage {
  return {
    id: uid(),
    type: 'thought',
    content: text,
    status,
    timestamp: ts(),
    isStreaming: true,
  };
}

/**
 * Create a file action message
 */
export function createFileAction(
  path: string,
  action: FileAction['action'],
  description?: string
): AgentMessage {
  return {
    id: uid(),
    type: 'file',
    content: description || `${action.charAt(0).toUpperCase() + action.slice(1)} ${path}`,
    status: 'working',
    fileActions: [{ path, action, timestamp: ts() }],
    timestamp: ts(),
    isStreaming: false,
  };
}

/**
 * Create a status update message
 */
export function createStatus(
  status: NarrationStatus,
  customMessage?: string
): AgentMessage {
  return {
    id: uid(),
    type: 'status',
    content: customMessage || STATUS_MESSAGES[status],
    status,
    timestamp: ts(),
    isStreaming: false,
  };
}

/**
 * Create a verification result message
 */
export function createVerification(
  passed: boolean,
  details: { label: string; value: string; status?: 'ok' | 'warn' | 'error' }[]
): AgentMessage {
  return {
    id: uid(),
    type: 'verification',
    content: passed ? 'Verification passed' : 'Verification found issues',
    status: passed ? 'complete' : 'repairing',
    subDetails: details,
    timestamp: ts(),
    isStreaming: false,
  };
}

/**
 * AgentNarrator class for managing streaming narration
 */
export class AgentNarrator {
  private messages: AgentMessage[] = [];
  private listeners: Set<(messages: AgentMessage[]) => void> = new Set();
  private currentStatus: NarrationStatus = 'thinking';
  
  /**
   * Subscribe to message updates
   */
  subscribe(listener: (messages: AgentMessage[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.messages);
    return () => this.listeners.delete(listener);
  }
  
  /**
   * Notify all listeners of updates
   */
  private notify(): void {
    for (const listener of this.listeners) {
      listener([...this.messages]);
    }
  }
  
  /**
   * Add a thought with streaming animation
   */
  async think(text: string, status: NarrationStatus = 'working'): Promise<void> {
    this.currentStatus = status;
    const thought = createThought(text, status);
    this.messages.push(thought);
    this.notify();
    
    // Simulate streaming by gradually revealing the text
    const fullLength = text.length;
    const charsPerTick = 20;
    const tickMs = 30;
    
    for (let i = 0; i <= fullLength; i += charsPerTick) {
      await new Promise(r => setTimeout(r, tickMs));
      const msgIndex = this.messages.findIndex(m => m.id === thought.id);
      if (msgIndex >= 0) {
        this.messages[msgIndex] = {
          ...this.messages[msgIndex],
          isStreaming: i < fullLength,
        };
        this.notify();
      }
    }
    
    // Mark as complete
    const msgIndex = this.messages.findIndex(m => m.id === thought.id);
    if (msgIndex >= 0) {
      this.messages[msgIndex] = {
        ...this.messages[msgIndex],
        isStreaming: false,
      };
      this.notify();
    }
  }
  
  /**
   * Add a quick thought without streaming
   */
  quickThought(text: string, status: NarrationStatus = 'working'): void {
    const thought = createThought(text, status);
    thought.isStreaming = false;
    this.messages.push(thought);
    this.notify();
  }
  
  /**
   * Add a file action
   */
  fileAction(path: string, action: FileAction['action'], description?: string): void {
    this.messages.push(createFileAction(path, action, description));
    this.notify();
  }
  
  /**
   * Add multiple file actions at once
   */
  fileActions(actions: { path: string; action: FileAction['action'] }[], summary?: string): void {
    const msg: AgentMessage = {
      id: uid(),
      type: 'file',
      content: summary || `${actions.length} files affected`,
      status: this.currentStatus,
      fileActions: actions.map(a => ({ ...a, timestamp: ts() })),
      timestamp: ts(),
      isStreaming: false,
    };
    this.messages.push(msg);
    this.notify();
  }
  
  /**
   * Update status
   */
  status(status: NarrationStatus, customMessage?: string): void {
    this.currentStatus = status;
    this.messages.push(createStatus(status, customMessage));
    this.notify();
  }
  
  /**
   * Add verification results
   */
  verification(
    passed: boolean,
    details: { label: string; value: string; status?: 'ok' | 'warn' | 'error' }[]
  ): void {
    this.messages.push(createVerification(passed, details));
    this.notify();
  }
  
  /**
   * Get narration template
   */
  template<K extends keyof typeof NARRATION_TEMPLATES>(
    key: K,
    ...args: Parameters<typeof NARRATION_TEMPLATES[K]>
  ): string {
    // @ts-ignore - TypeScript can't infer the spread args correctly
    return NARRATION_TEMPLATES[key](...args);
  }
  
  /**
   * Clear all messages
   */
  clear(): void {
    this.messages = [];
    this.currentStatus = 'thinking';
    this.notify();
  }
  
  /**
   * Get current messages
   */
  getMessages(): AgentMessage[] {
    return [...this.messages];
  }
  
  /**
   * Get current status
   */
  getStatus(): NarrationStatus {
    return this.currentStatus;
  }
}

// Export singleton narrator instance
export const agentNarrator = new AgentNarrator();
