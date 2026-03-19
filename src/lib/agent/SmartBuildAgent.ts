/**
 * SmartBuildAgent - Goal-driven, conversational AI Build Agent
 * 
 * The main orchestrator that combines task classification, project inspection,
 * and streaming narration to create a smart, autonomous build experience.
 */

import { classifyTask, getTaskIntroduction, type TaskClassification, type TaskType } from './TaskClassifier';
import { inspectProject, findRelevantFiles, getInspectionNarration, type ProjectInspection } from './ProjectInspector';
import { AgentNarrator, agentNarrator, type NarrationStatus, type FileAction } from './AgentNarrator';
import type { ProjectFile } from '@/types';

export interface AgentContext {
  projectName: string;
  projectId: string;
  files: ProjectFile[];
  promptHistory: Array<{ content: string; prompt_type: string }>;
}

export interface AgentStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'complete' | 'failed' | 'skipped';
  detail?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface AgentPlan {
  classification: TaskClassification;
  inspection: ProjectInspection | null;
  steps: AgentStep[];
  targetFiles: string[];
  preserveFiles: string[];
  estimatedActions: number;
}

/**
 * SmartBuildAgent class
 */
export class SmartBuildAgent {
  private narrator: AgentNarrator;
  private context: AgentContext | null = null;
  private plan: AgentPlan | null = null;
  private isRunning: boolean = false;
  private aborted: boolean = false;
  
  constructor() {
    this.narrator = agentNarrator;
  }
  
  /**
   * Set the agent context
   */
  setContext(context: AgentContext): void {
    this.context = context;
  }
  
  /**
   * Get the narrator for subscribing to updates
   */
  getNarrator(): AgentNarrator {
    return this.narrator;
  }
  
  /**
   * Process a user prompt and begin the build process
   */
  async processPrompt(prompt: string): Promise<AgentPlan> {
    if (this.isRunning) {
      throw new Error('Agent is already running');
    }
    
    this.isRunning = true;
    this.aborted = false;
    this.narrator.clear();
    
    try {
      // ══════════════════════════════════════════════════════════════
      // STEP 1: Task Classification
      // ══════════════════════════════════════════════════════════════
      this.narrator.status('thinking', 'Analyzing your request...');
      
      const hasExistingProject = (this.context?.files.length || 0) > 0;
      const existingFileCount = this.context?.files.length || 0;
      
      const classification = classifyTask(prompt, hasExistingProject, existingFileCount);
      
      // Stream the task identification
      const intro = getTaskIntroduction(classification);
      await this.narrator.think(
        `${classification.reasoning} ${intro}`,
        'thinking'
      );
      
      // ══════════════════════════════════════════════════════════════
      // STEP 2: Project Inspection (if needed)
      // ══════════════════════════════════════════════════════════════
      let inspection: ProjectInspection | null = null;
      
      if (classification.requiresInspection && this.context?.files.length) {
        this.narrator.status('inspecting', 'Inspecting current project...');
        
        await this.narrator.think(
          this.narrator.template('inspectingProject'),
          'inspecting'
        );
        
        inspection = inspectProject(this.context.files);
        
        await this.narrator.think(
          getInspectionNarration(inspection),
          'inspecting'
        );
        
        // Report file structure
        this.narrator.fileActions(
          this.context.files.slice(0, 10).map(f => ({
            path: f.path,
            action: 'viewed' as const,
          })),
          `Viewed ${this.context.files.length} files`
        );
      }
      
      // ══════════════════════════════════════════════════════════════
      // STEP 3: Plan the Work
      // ══════════════════════════════════════════════════════════════
      this.narrator.status('planning', 'Planning the changes...');
      
      // Determine target files
      const targetFiles = inspection && this.context?.files
        ? findRelevantFiles(this.context.files, prompt, classification.targetedAreas)
        : [];
      
      // Determine files to preserve
      const preserveFiles = classification.taskType !== 'create_new_project'
        ? (this.context?.files.map(f => f.path) || []).filter(p => !targetFiles.includes(p))
        : [];
      
      // Build the step plan
      const steps = this.buildStepPlan(classification, !!inspection);
      
      // Create the plan
      this.plan = {
        classification,
        inspection,
        steps,
        targetFiles,
        preserveFiles,
        estimatedActions: this.estimateActions(classification, targetFiles.length),
      };
      
      // Narrate the plan
      await this.narrator.think(
        this.buildPlanNarration(this.plan),
        'planning'
      );
      
      return this.plan;
      
    } catch (error: any) {
      this.narrator.status('failed', error.message);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Build the step plan based on task type
   */
  private buildStepPlan(classification: TaskClassification, hasInspection: boolean): AgentStep[] {
    const steps: AgentStep[] = [];
    const now = new Date().toISOString();
    
    // Classification step (already done)
    steps.push({
      id: 'classify',
      name: 'Analyze Request',
      status: 'complete',
      detail: classification.humanReadableType,
      completedAt: now,
    });
    
    // Inspection step (if applicable)
    if (hasInspection) {
      steps.push({
        id: 'inspect',
        name: 'Inspect Project',
        status: 'complete',
        completedAt: now,
      });
    }
    
    // Planning step
    steps.push({
      id: 'plan',
      name: 'Plan Changes',
      status: 'complete',
      completedAt: now,
    });
    
    // Generation steps based on task type
    switch (classification.taskType) {
      case 'create_new_project':
        steps.push(
          { id: 'architecture', name: 'Design Architecture', status: 'pending' },
          { id: 'boot', name: 'Create Boot Files', status: 'pending' },
          { id: 'features', name: 'Generate Features', status: 'pending' },
          { id: 'wiring', name: 'Wire Components', status: 'pending' },
        );
        break;
      
      case 'add_feature':
      case 'modify_feature':
        steps.push(
          { id: 'identify', name: 'Identify Affected Files', status: 'pending' },
          { id: 'generate', name: 'Generate Changes', status: 'pending' },
        );
        break;
      
      case 'redesign_ui':
        steps.push(
          { id: 'analyze', name: 'Analyze Current UI', status: 'pending' },
          { id: 'redesign', name: 'Apply Design Changes', status: 'pending' },
        );
        break;
      
      case 'fix_bug':
      case 'repair_preview':
        steps.push(
          { id: 'diagnose', name: 'Diagnose Issue', status: 'pending' },
          { id: 'repair', name: 'Apply Fix', status: 'pending' },
        );
        break;
      
      case 'create_tests':
        steps.push(
          { id: 'setup', name: 'Setup Test Infrastructure', status: 'pending' },
          { id: 'write', name: 'Write Test Specs', status: 'pending' },
        );
        break;
      
      default:
        steps.push(
          { id: 'execute', name: 'Execute Changes', status: 'pending' },
        );
    }
    
    // Always add validation and verification
    steps.push(
      { id: 'validate', name: 'Validate Code', status: 'pending' },
      { id: 'verify', name: 'Verify Changes', status: 'pending' },
    );
    
    return steps;
  }
  
  /**
   * Estimate the number of actions
   */
  private estimateActions(classification: TaskClassification, targetFileCount: number): number {
    const base = {
      create_new_project: 15,
      add_feature: 5,
      modify_feature: 3,
      redesign_ui: 8,
      repair_preview: 2,
      fix_bug: 2,
      create_tests: 4,
      continue_existing: 5,
      validate_feature: 2,
      refactor_code: 6,
      improve_mobile_ui: 5,
      connect_backend: 6,
      update_auth: 5,
      run_verification: 3,
      inspect_project: 1,
    };
    
    return Math.max(base[classification.taskType] || 5, targetFileCount + 2);
  }
  
  /**
   * Build the plan narration
   */
  private buildPlanNarration(plan: AgentPlan): string {
    const { classification, targetFiles, preserveFiles } = plan;
    
    let narration = '';
    
    if (classification.taskType === 'create_new_project') {
      narration = `I'll design the architecture first, then create the boot files, followed by the feature components. Finally, I'll wire everything together and validate the result.`;
    } else if (targetFiles.length > 0) {
      narration = `I identified **${targetFiles.length} file(s)** that need changes. `;
      if (preserveFiles.length > 0) {
        narration += `I'll preserve the other ${preserveFiles.length} existing files. `;
      }
      narration += `Let me start working on the modifications.`;
    } else {
      narration = `I'll analyze the requirements and make the necessary changes. Let me begin.`;
    }
    
    return narration;
  }
  
  /**
   * Report a file action during generation
   */
  reportFileAction(
    path: string,
    action: FileAction['action'],
    description?: string
  ): void {
    this.narrator.fileAction(path, action, description);
  }
  
  /**
   * Report progress during generation
   */
  async reportProgress(message: string, status: NarrationStatus = 'working'): Promise<void> {
    await this.narrator.think(message, status);
  }
  
  /**
   * Report a quick status update
   */
  reportStatus(status: NarrationStatus, message?: string): void {
    this.narrator.status(status, message);
  }
  
  /**
   * Update a step's status
   */
  updateStep(stepId: string, status: AgentStep['status'], detail?: string): void {
    if (!this.plan) return;
    
    const step = this.plan.steps.find(s => s.id === stepId);
    if (step) {
      step.status = status;
      if (detail) step.detail = detail;
      if (status === 'running') step.startedAt = new Date().toISOString();
      if (status === 'complete' || status === 'failed') {
        step.completedAt = new Date().toISOString();
      }
    }
  }
  
  /**
   * Report validation results
   */
  reportValidation(
    passed: boolean,
    checks: { label: string; value: string; status?: 'ok' | 'warn' | 'error' }[]
  ): void {
    this.narrator.verification(passed, checks);
  }
  
  /**
   * Complete the agent run
   */
  async complete(summary: string): Promise<void> {
    this.narrator.status('complete', 'Task complete');
    await this.narrator.think(
      `${summary} ${this.narrator.template('continuePrompt')}`,
      'complete'
    );
    this.isRunning = false;
  }
  
  /**
   * Report a failure
   */
  async fail(error: string): Promise<void> {
    this.narrator.status('failed', error);
    await this.narrator.think(
      this.narrator.template('errorOccurred', error),
      'failed'
    );
    this.isRunning = false;
  }
  
  /**
   * Abort the current run
   */
  abort(): void {
    this.aborted = true;
    this.isRunning = false;
  }
  
  /**
   * Check if agent is running
   */
  isAgentRunning(): boolean {
    return this.isRunning;
  }
  
  /**
   * Check if agent was aborted
   */
  wasAborted(): boolean {
    return this.aborted;
  }
  
  /**
   * Get current plan
   */
  getPlan(): AgentPlan | null {
    return this.plan;
  }
}

// Export singleton agent instance
export const smartAgent = new SmartBuildAgent();

// Export types
export type { TaskClassification, TaskType, ProjectInspection };
