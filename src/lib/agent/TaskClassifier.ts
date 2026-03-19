/**
 * AgentTaskClassifier - Intelligent task classification for the AI Build Agent
 * 
 * Classifies user prompts into task types and determines the best approach
 * before any action is taken.
 */

// Supported task types for the AI Build Agent
export type TaskType = 
  | 'create_new_project'
  | 'continue_existing'
  | 'add_feature'
  | 'modify_feature'
  | 'redesign_ui'
  | 'repair_preview'
  | 'fix_bug'
  | 'create_tests'
  | 'validate_feature'
  | 'refactor_code'
  | 'improve_mobile_ui'
  | 'connect_backend'
  | 'update_auth'
  | 'run_verification'
  | 'inspect_project';

export interface TaskClassification {
  taskType: TaskType;
  confidence: number; // 0-1
  reasoning: string;
  suggestedApproach: string;
  targetedAreas: string[];
  requiresInspection: boolean;
  isDestructive: boolean;
  estimatedFileChanges: 'few' | 'moderate' | 'many';
  humanReadableType: string;
}

// Keywords and patterns for classification
const TASK_PATTERNS: Record<TaskType, { keywords: string[]; phrases: RegExp[] }> = {
  create_new_project: {
    keywords: ['build', 'create', 'make', 'generate', 'start', 'new'],
    phrases: [/build\s+(a|an|me)\s+/i, /create\s+(a|an|me)\s+/i, /make\s+(a|an|me)\s+/i, /start\s+fresh/i],
  },
  continue_existing: {
    keywords: ['continue', 'keep', 'maintain', 'extend', 'expand'],
    phrases: [/continue\s+(with|building|working)/i, /keep\s+the/i, /based\s+on\s+current/i],
  },
  add_feature: {
    keywords: ['add', 'implement', 'include', 'integrate', 'new feature'],
    phrases: [/add\s+(a|an|the)?\s*\w+/i, /implement\s+/i, /include\s+/i, /integrate\s+/i, /new\s+feature/i],
  },
  modify_feature: {
    keywords: ['change', 'modify', 'update', 'alter', 'adjust', 'tweak'],
    phrases: [/change\s+the/i, /modify\s+/i, /update\s+the/i, /adjust\s+/i, /tweak\s+/i],
  },
  redesign_ui: {
    keywords: ['redesign', 'restyle', 'theme', 'appearance', 'look', 'visual', 'ui', 'ux', 'layout'],
    phrases: [/redesign\s+/i, /change\s+(the\s+)?look/i, /new\s+design/i, /make\s+it\s+look/i, /improve\s+(the\s+)?ui/i],
  },
  repair_preview: {
    keywords: ['fix preview', 'preview broken', 'not rendering', 'white screen', 'blank page', 'crash'],
    phrases: [/preview\s+(is\s+)?(broken|not\s+working)/i, /white\s+screen/i, /blank\s+page/i, /app\s+crashes/i],
  },
  fix_bug: {
    keywords: ['fix', 'bug', 'error', 'issue', 'problem', 'broken', 'not working', 'wrong'],
    phrases: [/fix\s+(the|a|this)/i, /there'?s?\s+(a|an)\s+(bug|error|issue)/i, /not\s+working/i, /is\s+broken/i],
  },
  create_tests: {
    keywords: ['test', 'tests', 'testing', 'spec', 'unit test', 'e2e'],
    phrases: [/add\s+tests/i, /create\s+tests/i, /write\s+tests/i, /test\s+coverage/i],
  },
  validate_feature: {
    keywords: ['validate', 'verify', 'check', 'ensure', 'confirm'],
    phrases: [/validate\s+(the|that)/i, /verify\s+(the|that)/i, /make\s+sure/i, /check\s+(if|that)/i],
  },
  refactor_code: {
    keywords: ['refactor', 'clean up', 'reorganize', 'restructure', 'optimize', 'improve code'],
    phrases: [/refactor\s+/i, /clean\s+up/i, /reorganize\s+/i, /improve\s+(the\s+)?code/i],
  },
  improve_mobile_ui: {
    keywords: ['mobile', 'responsive', 'phone', 'tablet', 'small screen'],
    phrases: [/mobile\s+(ui|ux|version|layout)/i, /responsive/i, /on\s+(phone|mobile)/i, /small\s+screen/i],
  },
  connect_backend: {
    keywords: ['backend', 'api', 'database', 'server', 'fetch', 'endpoint', 'data'],
    phrases: [/connect\s+(to\s+)?(backend|api)/i, /add\s+(an?\s+)?api/i, /fetch\s+data/i, /database/i],
  },
  update_auth: {
    keywords: ['auth', 'login', 'signup', 'authentication', 'user', 'account', 'password'],
    phrases: [/add\s+(user\s+)?auth/i, /login\s+/i, /sign\s*up/i, /authentication/i],
  },
  run_verification: {
    keywords: ['run', 'execute', 'verify', 'validation', 'lint', 'check'],
    phrases: [/run\s+(the\s+)?tests/i, /verify\s+everything/i, /run\s+validation/i],
  },
  inspect_project: {
    keywords: ['show', 'list', 'what', 'current', 'structure', 'files', 'inspect'],
    phrases: [/show\s+(me\s+)?the/i, /what\s+(are|is)\s+the/i, /list\s+(the|all)/i, /current\s+structure/i],
  },
};

// Human-readable task descriptions
const TASK_DESCRIPTIONS: Record<TaskType, string> = {
  create_new_project: 'new project creation',
  continue_existing: 'project continuation',
  add_feature: 'feature addition',
  modify_feature: 'feature modification',
  redesign_ui: 'UI/UX redesign',
  repair_preview: 'preview repair',
  fix_bug: 'bug fix',
  create_tests: 'test creation',
  validate_feature: 'feature validation',
  refactor_code: 'code refactoring',
  improve_mobile_ui: 'mobile UI improvement',
  connect_backend: 'backend connection',
  update_auth: 'authentication update',
  run_verification: 'verification run',
  inspect_project: 'project inspection',
};

// Suggested approaches for each task type
const TASK_APPROACHES: Record<TaskType, string> = {
  create_new_project: "I'll design the architecture, create the file structure, and build each component from scratch.",
  continue_existing: "I'll review the current project state and extend it without disrupting working code.",
  add_feature: "I'll identify where this feature fits in the existing architecture and add only the necessary files.",
  modify_feature: "I'll locate the affected components and update them while preserving the rest of the project.",
  redesign_ui: "I'll update the styling and layout across affected components while keeping the logic intact.",
  repair_preview: "I'll diagnose the rendering issue and fix the blocking error so the preview can load.",
  fix_bug: "I'll trace the root cause, repair the affected code, and verify the fix.",
  create_tests: "I'll set up the test infrastructure and write specs for the key functionality.",
  validate_feature: "I'll run checks and verify that the feature works as expected.",
  refactor_code: "I'll reorganize the code for better maintainability without changing behavior.",
  improve_mobile_ui: "I'll enhance the responsive design and optimize the mobile experience.",
  connect_backend: "I'll add API integration and wire up the data flow.",
  update_auth: "I'll implement or update the authentication system.",
  run_verification: "I'll run the validation suite and report the results.",
  inspect_project: "I'll analyze the current project structure and provide a summary.",
};

/**
 * Classify a user prompt into a task type
 */
export function classifyTask(
  prompt: string,
  hasExistingProject: boolean,
  existingFileCount: number
): TaskClassification {
  const promptLower = prompt.toLowerCase();
  const scores: Record<TaskType, number> = {} as Record<TaskType, number>;

  // Score each task type
  for (const [taskType, patterns] of Object.entries(TASK_PATTERNS)) {
    let score = 0;
    
    // Keyword matching
    for (const keyword of patterns.keywords) {
      if (promptLower.includes(keyword)) {
        score += 1;
      }
    }
    
    // Phrase matching (stronger signal)
    for (const phrase of patterns.phrases) {
      if (phrase.test(prompt)) {
        score += 2;
      }
    }
    
    scores[taskType as TaskType] = score;
  }

  // Determine the winning task type
  let maxScore = 0;
  let winningType: TaskType = 'continue_existing';
  
  for (const [taskType, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      winningType = taskType as TaskType;
    }
  }

  // Apply context-based adjustments
  if (!hasExistingProject && winningType !== 'create_new_project') {
    // If no project exists, most requests should create one
    if (maxScore < 3) {
      winningType = 'create_new_project';
      maxScore = 3;
    }
  }

  if (hasExistingProject && winningType === 'create_new_project' && existingFileCount > 3) {
    // If project exists with substantial files, default to continuation unless explicitly new
    const explicitNew = /\b(new|fresh|from\s+scratch|start\s+over|rebuild\s+entirely)\b/i.test(prompt);
    if (!explicitNew) {
      winningType = 'add_feature';
      maxScore = 2;
    }
  }

  // Calculate confidence
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? maxScore / (totalScore || 1) : 0.5;

  // Determine targeted areas
  const targetedAreas: string[] = [];
  if (/\b(header|navbar|navigation)\b/i.test(prompt)) targetedAreas.push('header/navigation');
  if (/\b(footer)\b/i.test(prompt)) targetedAreas.push('footer');
  if (/\b(sidebar)\b/i.test(prompt)) targetedAreas.push('sidebar');
  if (/\b(form|input|button)\b/i.test(prompt)) targetedAreas.push('forms/inputs');
  if (/\b(dashboard|home|landing)\b/i.test(prompt)) targetedAreas.push('main pages');
  if (/\b(style|css|color|theme)\b/i.test(prompt)) targetedAreas.push('styling');
  if (/\b(state|store|zustand)\b/i.test(prompt)) targetedAreas.push('state management');
  if (/\b(api|fetch|data)\b/i.test(prompt)) targetedAreas.push('data layer');

  // Determine if inspection is needed
  const requiresInspection = hasExistingProject && winningType !== 'create_new_project';

  // Determine if this is a destructive action
  const isDestructive = winningType === 'create_new_project' && hasExistingProject && existingFileCount > 3;

  // Estimate file changes
  let estimatedFileChanges: 'few' | 'moderate' | 'many' = 'few';
  if (winningType === 'create_new_project') {
    estimatedFileChanges = 'many';
  } else if (['add_feature', 'redesign_ui', 'connect_backend'].includes(winningType)) {
    estimatedFileChanges = 'moderate';
  }

  // Generate reasoning
  const reasoning = generateReasoning(prompt, winningType, hasExistingProject, confidence);

  return {
    taskType: winningType,
    confidence: Math.min(confidence, 0.95),
    reasoning,
    suggestedApproach: TASK_APPROACHES[winningType],
    targetedAreas,
    requiresInspection,
    isDestructive,
    estimatedFileChanges,
    humanReadableType: TASK_DESCRIPTIONS[winningType],
  };
}

/**
 * Generate human-readable reasoning for the classification
 */
function generateReasoning(
  prompt: string,
  taskType: TaskType,
  hasExistingProject: boolean,
  confidence: number
): string {
  const confidenceLevel = confidence > 0.7 ? 'clearly' : confidence > 0.4 ? 'likely' : 'possibly';
  
  const typeDescriptions: Record<TaskType, string> = {
    create_new_project: `Your request ${confidenceLevel} describes a new application to build from scratch.`,
    continue_existing: `This appears to be a continuation of the current project.`,
    add_feature: `I identified this as a request to add new functionality to the existing project.`,
    modify_feature: `This looks like a modification request for existing features.`,
    redesign_ui: `I recognized this as a UI/UX redesign request.`,
    repair_preview: `This appears to be a preview/rendering issue that needs repair.`,
    fix_bug: `I detected this as a bug fix request.`,
    create_tests: `This is a testing and verification task.`,
    validate_feature: `I'll validate and verify the requested functionality.`,
    refactor_code: `This is a code quality and refactoring request.`,
    improve_mobile_ui: `I identified this as a mobile responsiveness improvement.`,
    connect_backend: `This involves backend/API integration work.`,
    update_auth: `This is an authentication-related update.`,
    run_verification: `I'll run verification checks on the project.`,
    inspect_project: `I'll inspect and analyze the current project state.`,
  };

  return typeDescriptions[taskType];
}

/**
 * Get a conversational introduction for the task
 */
export function getTaskIntroduction(classification: TaskClassification): string {
  const { taskType, humanReadableType, suggestedApproach, requiresInspection, isDestructive } = classification;
  
  let intro = `I identified this as a **${humanReadableType}** request. `;
  
  if (requiresInspection) {
    intro += `Let me first review the current project state to understand what we're working with. `;
  }
  
  if (isDestructive) {
    intro += `⚠️ Note: This will replace the existing project. `;
  }
  
  intro += suggestedApproach;
  
  return intro;
}

/**
 * Get the next recommended action based on task type
 */
export function getNextAction(
  classification: TaskClassification,
  currentStep: 'start' | 'inspected' | 'planned' | 'executing' | 'validating'
): string {
  const { taskType, requiresInspection } = classification;
  
  if (currentStep === 'start') {
    return requiresInspection ? 'inspect_project' : 'plan_changes';
  }
  
  if (currentStep === 'inspected') {
    return 'plan_changes';
  }
  
  if (currentStep === 'planned') {
    return 'execute_changes';
  }
  
  if (currentStep === 'executing') {
    return 'validate_changes';
  }
  
  if (currentStep === 'validating') {
    return 'complete';
  }
  
  return 'complete';
}
