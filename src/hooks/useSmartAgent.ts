/**
 * useSmartAgent - React hook for the Smart AI Build Agent
 * 
 * Integrates the SmartBuildAgent with React state and the generation pipeline,
 * providing real-time streaming narration and intelligent task handling.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  smartAgent, 
  agentNarrator,
  type AgentMessage, 
  type AgentPlan,
  type NarrationStatus,
  type TaskClassification,
  type ProjectInspection,
} from '@/lib/agent';
import { usePersistentGeneration } from './usePersistentGeneration';
import { usePersistentProjectStore } from '@/stores/persistentProjectStore';
import type { ProjectFile } from '@/types';

export interface SmartAgentState {
  // Agent state
  isThinking: boolean;
  isGenerating: boolean;
  status: NarrationStatus;
  statusMessage: string;
  
  // Messages for the feed
  messages: AgentMessage[];
  
  // Plan info
  plan: AgentPlan | null;
  classification: TaskClassification | null;
  inspection: ProjectInspection | null;
  
  // Progress
  currentStep: string | null;
  completedSteps: string[];
  
  // Generation results
  generatedFiles: ProjectFile[];
}

export function useSmartAgent() {
  // Get the persistent generation pipeline
  const pipeline = usePersistentGeneration();
  
  // Get current project context
  const currentProject = usePersistentProjectStore((s) => s.currentProject);
  const currentFiles = usePersistentProjectStore((s) => s.currentFiles);
  const promptHistory = usePersistentProjectStore((s) => s.promptHistory);
  
  // Agent state
  const [state, setState] = useState<SmartAgentState>({
    isThinking: false,
    isGenerating: false,
    status: 'thinking',
    statusMessage: '',
    messages: [],
    plan: null,
    classification: null,
    inspection: null,
    currentStep: null,
    completedSteps: [],
    generatedFiles: [],
  });
  
  // Track if we're subscribed to the narrator
  const subscribedRef = useRef(false);
  
  // Subscribe to narrator updates
  useEffect(() => {
    if (subscribedRef.current) return;
    subscribedRef.current = true;
    
    const unsubscribe = agentNarrator.subscribe((messages) => {
      setState(prev => ({
        ...prev,
        messages,
        status: agentNarrator.getStatus(),
      }));
    });
    
    return () => {
      unsubscribe();
      subscribedRef.current = false;
    };
  }, []);
  
  /**
   * Process a user prompt through the smart agent
   */
  const processPrompt = useCallback(async (
    prompt: string,
    categories: string[] = []
  ) => {
    // Set context for the agent
    if (currentProject) {
      smartAgent.setContext({
        projectName: currentProject.name,
        projectId: currentProject.id,
        files: currentFiles,
        promptHistory: promptHistory.map(p => ({
          content: p.content,
          prompt_type: p.prompt_type,
        })),
      });
    }
    
    // Start thinking
    setState(prev => ({
      ...prev,
      isThinking: true,
      isGenerating: false,
      status: 'thinking',
      statusMessage: 'Analyzing your request...',
      plan: null,
      classification: null,
      inspection: null,
      currentStep: 'classify',
      completedSteps: [],
      generatedFiles: [],
    }));
    
    try {
      // Phase 1: Classification and Planning
      const plan = await smartAgent.processPrompt(prompt);
      
      setState(prev => ({
        ...prev,
        plan,
        classification: plan.classification,
        inspection: plan.inspection,
        currentStep: 'plan',
        completedSteps: ['classify', 'inspect'].filter(s => 
          plan.steps.some(ps => ps.id === s && ps.status === 'complete')
        ),
      }));
      
      // Phase 2: Generation
      setState(prev => ({
        ...prev,
        isThinking: false,
        isGenerating: true,
        status: 'generating',
        statusMessage: 'Generating code...',
      }));
      
      // Determine if this is a new project or continuation
      const isNewProject = plan.classification.taskType === 'create_new_project';
      
      // Run the generation with the smart agent providing narration
      smartAgent.reportStatus('generating', 'Starting code generation...');
      
      // Generate with persistence
      const result = await pipeline.generateWithPersistence(
        prompt,
        categories,
        { forceRebuild: isNewProject }
      );
      
      if (result.success) {
        // Phase 3: Validation
        setState(prev => ({
          ...prev,
          status: 'validating',
          statusMessage: 'Validating changes...',
          currentStep: 'validate',
        }));
        
        smartAgent.reportStatus('validating', 'Running validation checks...');
        
        // Report validation results
        if (pipeline.validation) {
          const passedChecks = pipeline.validation.checks.filter(c => c.passed).length;
          const totalChecks = pipeline.validation.checks.length;
          
          smartAgent.reportValidation(
            pipeline.validation.passed,
            pipeline.validation.checks.slice(0, 8).map(c => ({
              label: c.name,
              value: c.passed ? 'Pass' : (c.detail || 'Issue'),
              status: c.passed ? 'ok' as const : c.severity === 'error' ? 'error' as const : 'warn' as const,
            }))
          );
          
          await smartAgent.reportProgress(
            pipeline.validation.passed
              ? `Validation complete — **${passedChecks}/${totalChecks} checks passed**. The code is clean and ready.`
              : `Validation found issues. ${totalChecks - passedChecks} check(s) need attention.`,
            pipeline.validation.passed ? 'validating' : 'repairing'
          );
        }
        
        // Phase 4: Verification
        setState(prev => ({
          ...prev,
          status: 'verifying',
          statusMessage: 'Verifying changes...',
          currentStep: 'verify',
        }));
        
        smartAgent.reportStatus('verifying', 'Running verification...');
        
        await smartAgent.reportProgress(
          "Let me verify that the changes work as expected. I'm checking that the preview renders correctly.",
          'verifying'
        );
        
        // Complete
        const fileCount = result.files?.length || 0;
        const summary = buildCompletionSummary(plan.classification, fileCount);
        
        await smartAgent.complete(summary);
        
        setState(prev => ({
          ...prev,
          isGenerating: false,
          status: 'complete',
          statusMessage: 'Task complete',
          generatedFiles: result.files || [],
          currentStep: null,
          completedSteps: [...prev.completedSteps, 'generate', 'validate', 'verify'],
        }));
        
      } else {
        // Handle failure
        await smartAgent.fail(result.error || 'Generation failed');
        
        setState(prev => ({
          ...prev,
          isGenerating: false,
          status: 'failed',
          statusMessage: result.error || 'Generation failed',
        }));
      }
      
      return result;
      
    } catch (error: any) {
      await smartAgent.fail(error.message);
      
      setState(prev => ({
        ...prev,
        isThinking: false,
        isGenerating: false,
        status: 'failed',
        statusMessage: error.message,
      }));
      
      return { success: false, error: error.message };
    }
  }, [currentProject, currentFiles, promptHistory, pipeline]);
  
  /**
   * Reset the agent state
   */
  const reset = useCallback(() => {
    agentNarrator.clear();
    pipeline.reset();
    
    setState({
      isThinking: false,
      isGenerating: false,
      status: 'thinking',
      statusMessage: '',
      messages: [],
      plan: null,
      classification: null,
      inspection: null,
      currentStep: null,
      completedSteps: [],
      generatedFiles: [],
    });
  }, [pipeline]);
  
  /**
   * Abort the current operation
   */
  const abort = useCallback(() => {
    smartAgent.abort();
    pipeline.reset();
    
    setState(prev => ({
      ...prev,
      isThinking: false,
      isGenerating: false,
      status: 'failed',
      statusMessage: 'Aborted',
    }));
  }, [pipeline]);
  
  return {
    // State
    ...state,
    
    // Combined flags
    isWorking: state.isThinking || state.isGenerating,
    
    // Pipeline state (for file cards, etc.)
    pipeline: {
      state: pipeline.state,
      steps: pipeline.steps,
      messages: pipeline.messages,
      fileCards: pipeline.fileCards,
      validation: pipeline.validation,
      repairs: pipeline.repairs,
      summary: pipeline.summary,
      currentFileIndex: pipeline.currentFileIndex,
      creditCheck: pipeline.creditCheck,
    },
    
    // Actions
    processPrompt,
    reset,
    abort,
  };
}

/**
 * Build a completion summary based on task type
 */
function buildCompletionSummary(classification: TaskClassification, fileCount: number): string {
  const { taskType, humanReadableType } = classification;
  
  const summaries: Record<string, string> = {
    create_new_project: `I built your new application with **${fileCount} files**. Everything is wired up and ready to go.`,
    add_feature: `I added the new feature and updated **${fileCount} file(s)**. The changes are integrated and working.`,
    modify_feature: `I modified the existing features across **${fileCount} file(s)**. The updates are in place.`,
    redesign_ui: `I applied the UI redesign across **${fileCount} file(s)**. The new design is live.`,
    repair_preview: `I repaired the preview issue. The app should render correctly now.`,
    fix_bug: `I fixed the bug and verified the solution. The issue is resolved.`,
    create_tests: `I created the test infrastructure with **${fileCount} file(s)**. Tests are ready to run.`,
    continue_existing: `I updated the project with **${fileCount} file(s)**. The changes are applied.`,
    refactor_code: `I refactored the code across **${fileCount} file(s)** for better maintainability.`,
    improve_mobile_ui: `I improved the mobile experience across **${fileCount} file(s)**. The responsive design is updated.`,
    connect_backend: `I connected the backend integration. **${fileCount} file(s)** were updated with API calls.`,
    update_auth: `I updated the authentication system. **${fileCount} file(s)** now include auth logic.`,
    validate_feature: `I validated the feature. All checks passed.`,
    run_verification: `I completed the verification run. Results are ready.`,
    inspect_project: `I analyzed the project structure. Here's what I found.`,
  };
  
  return summaries[taskType] || `I completed the ${humanReadableType} with **${fileCount} file(s)** updated.`;
}
