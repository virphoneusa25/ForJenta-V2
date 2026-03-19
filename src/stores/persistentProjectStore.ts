/**
 * ForJenta Persistent Project Store
 * Manages project state, history, and continuation behavior.
 */

import { create } from 'zustand';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

export type PromptType = 'create_initial' | 'add_feature' | 'refine_feature' | 'redesign_ui' | 'repair_bug' | 'refactor_code' | 'connect_backend' | 'replace_file' | 'full_rebuild' | 'other';

export type GenerationStatus = 'pending' | 'analyzing' | 'generating' | 'validating' | 'complete' | 'failed' | 'cancelled';

export interface PersistentProject {
  project_id: string;
  name: string;
  description: string | null;
  initial_prompt: string;
  status: 'active' | 'archived' | 'deleted';
  current_file_count: number;
  architecture_summary: string | null;
  tech_stack: string[];
  main_features: string[];
  total_prompts: number;
  total_generations: number;
  created_at: string;
  updated_at: string;
  last_generation_at: string | null;
}

export interface ProjectPrompt {
  prompt_id: string;
  project_id: string;
  content: string;
  prompt_type: PromptType;
  is_continuation: boolean;
  change_summary: string | null;
  files_created: number;
  files_updated: number;
  files_deleted: number;
  sequence_number: number;
  created_at: string;
  completed_at: string | null;
}

export interface ProjectFile {
  file_id: string;
  path: string;
  content: string;
  language: string;
  size_bytes: number;
  line_count: number;
  version_number: number;
  updated_at: string;
}

export interface GenerationRun {
  run_id: string;
  project_id: string;
  prompt_id: string;
  prompt_classification: PromptType;
  is_full_rebuild: boolean;
  is_repair: boolean;
  status: GenerationStatus;
  files_created: string[];
  files_updated: string[];
  files_deleted: string[];
  ai_plan_summary: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface ProjectActivity {
  activity_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  success: boolean;
  created_at: string;
}

export interface FileVersion {
  version_id: string;
  path: string;
  content: string;
  version_number: number;
  change_type: string;
  change_reason: string | null;
  created_at: string;
}

export interface PromptClassification {
  prompt_type: PromptType;
  is_full_rebuild: boolean;
  is_continuation: boolean;
  targeted_files: string[];
}

// ═══════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════

interface PersistentProjectState {
  // Current project
  currentProject: PersistentProject | null;
  currentFiles: ProjectFile[];
  promptHistory: ProjectPrompt[];
  generationHistory: GenerationRun[];
  activityTimeline: ProjectActivity[];
  
  // All user's projects
  projects: PersistentProject[];
  
  // Loading states
  loading: boolean;
  loadingProject: boolean;
  savingFiles: boolean;
  
  // Current generation
  currentRun: GenerationRun | null;
  lastClassification: PromptClassification | null;
  
  // Actions
  fetchProjects: () => Promise<void>;
  createProject: (name: string, prompt: string, description?: string) => Promise<PersistentProject | null>;
  loadProject: (projectId: string) => Promise<void>;
  loadProjectContext: (projectId: string) => Promise<any>;
  
  // Continuation
  continueProject: (prompt: string, forceRebuild?: boolean) => Promise<{
    prompt: ProjectPrompt;
    run: GenerationRun;
    classification: PromptClassification;
  } | null>;
  
  // Files
  saveFiles: (files: Array<{path: string; content: string; language: string}>, runId: string, promptId: string, changeReason?: string) => Promise<void>;
  refreshFiles: () => Promise<void>;
  getFileVersions: (path: string) => Promise<FileVersion[]>;
  
  // Generation
  updateGenerationRun: (runId: string, updates: Partial<GenerationRun> & {change_summary?: string; prompt_id?: string}) => Promise<void>;
  updateArchitecture: (updates: {architecture_summary?: string; tech_stack?: string[]; main_features?: string[]}) => Promise<void>;
  
  // History
  refreshPromptHistory: () => Promise<void>;
  refreshActivity: () => Promise<void>;
  
  // Cleanup
  deleteProject: (projectId: string) => Promise<boolean>;
  clearCurrentProject: () => void;
}

export const usePersistentProjectStore = create<PersistentProjectState>((set, get) => ({
  currentProject: null,
  currentFiles: [],
  promptHistory: [],
  generationHistory: [],
  activityTimeline: [],
  projects: [],
  loading: false,
  loadingProject: false,
  savingFiles: false,
  currentRun: null,
  lastClassification: null,

  // Fetch all user's projects
  fetchProjects: async () => {
    set({ loading: true });
    try {
      const response = await fetch(`${API_URL}/api/projects`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        set({ projects: data.projects });
      }
    } catch (error) {
      console.error('[Projects] Failed to fetch projects:', error);
    } finally {
      set({ loading: false });
    }
  },

  // Create a new project
  createProject: async (name: string, prompt: string, description?: string) => {
    try {
      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, prompt, description }),
      });

      if (!response.ok) {
        console.error('[Projects] Failed to create project');
        return null;
      }

      const data = await response.json();
      const project = data.project as PersistentProject;
      
      // Add to projects list
      set(state => ({
        projects: [project, ...state.projects],
        currentProject: project,
        currentFiles: [],
        promptHistory: [],
        generationHistory: [],
        activityTimeline: [],
      }));

      return project;
    } catch (error) {
      console.error('[Projects] Error creating project:', error);
      return null;
    }
  },

  // Load a project with all its data
  loadProject: async (projectId: string) => {
    set({ loadingProject: true });
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        console.error('[Projects] Failed to load project');
        return;
      }

      const data = await response.json();
      
      set({
        currentProject: data.project,
        currentFiles: data.files || [],
        promptHistory: data.prompts || [],
        activityTimeline: data.activity || [],
      });

      // Also fetch generation history
      const genResponse = await fetch(`${API_URL}/api/projects/${projectId}/generations`, {
        credentials: 'include',
      });
      
      if (genResponse.ok) {
        const genData = await genResponse.json();
        set({ generationHistory: genData.generations || [] });
      }
    } catch (error) {
      console.error('[Projects] Error loading project:', error);
    } finally {
      set({ loadingProject: false });
    }
  },

  // Load full project context for continuation
  loadProjectContext: async (projectId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/context`, {
        credentials: 'include',
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[Projects] Error loading context:', error);
      return null;
    }
  },

  // Continue building the project
  continueProject: async (prompt: string, forceRebuild = false) => {
    const { currentProject } = get();
    
    if (!currentProject) {
      console.error('[Projects] No current project');
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/api/projects/${currentProject.project_id}/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt, force_rebuild: forceRebuild }),
      });

      if (!response.ok) {
        console.error('[Projects] Failed to continue project');
        return null;
      }

      const data = await response.json();
      
      // Update state
      set(state => ({
        promptHistory: [...state.promptHistory, data.prompt],
        currentRun: data.run,
        lastClassification: data.classification,
      }));

      return {
        prompt: data.prompt,
        run: data.run,
        classification: data.classification,
      };
    } catch (error) {
      console.error('[Projects] Error continuing project:', error);
      return null;
    }
  },

  // Save files with version history
  saveFiles: async (files, runId, promptId, changeReason) => {
    const { currentProject } = get();
    
    if (!currentProject) return;

    set({ savingFiles: true });
    try {
      const response = await fetch(`${API_URL}/api/projects/${currentProject.project_id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          files,
          run_id: runId,
          prompt_id: promptId,
          change_reason: changeReason,
        }),
      });

      if (response.ok) {
        // Refresh files
        await get().refreshFiles();
      }
    } catch (error) {
      console.error('[Projects] Error saving files:', error);
    } finally {
      set({ savingFiles: false });
    }
  },

  // Refresh current files
  refreshFiles: async () => {
    const { currentProject } = get();
    
    if (!currentProject) return;

    try {
      const response = await fetch(`${API_URL}/api/projects/${currentProject.project_id}/files`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        set({ currentFiles: data.files });
      }
    } catch (error) {
      console.error('[Projects] Error refreshing files:', error);
    }
  },

  // Get file version history
  getFileVersions: async (path: string) => {
    const { currentProject } = get();
    
    if (!currentProject) return [];

    try {
      const response = await fetch(
        `${API_URL}/api/projects/${currentProject.project_id}/files/${encodeURIComponent(path)}/versions`,
        { credentials: 'include' }
      );

      if (response.ok) {
        const data = await response.json();
        return data.versions;
      }
    } catch (error) {
      console.error('[Projects] Error fetching versions:', error);
    }
    
    return [];
  },

  // Update generation run
  updateGenerationRun: async (runId, updates) => {
    const { currentProject } = get();
    
    if (!currentProject) return;

    try {
      await fetch(`${API_URL}/api/projects/${currentProject.project_id}/generations/${runId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      // Update local state if status changed to complete
      if (updates.status === 'complete') {
        set(state => ({
          currentRun: state.currentRun?.run_id === runId
            ? { ...state.currentRun, ...updates } as GenerationRun
            : state.currentRun,
        }));
      }
    } catch (error) {
      console.error('[Projects] Error updating run:', error);
    }
  },

  // Update project architecture
  updateArchitecture: async (updates) => {
    const { currentProject } = get();
    
    if (!currentProject) return;

    try {
      const response = await fetch(`${API_URL}/api/projects/${currentProject.project_id}/architecture`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        const data = await response.json();
        set({ currentProject: data.project });
      }
    } catch (error) {
      console.error('[Projects] Error updating architecture:', error);
    }
  },

  // Refresh prompt history
  refreshPromptHistory: async () => {
    const { currentProject } = get();
    
    if (!currentProject) return;

    try {
      const response = await fetch(`${API_URL}/api/projects/${currentProject.project_id}/prompts`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        set({ promptHistory: data.prompts });
      }
    } catch (error) {
      console.error('[Projects] Error refreshing history:', error);
    }
  },

  // Refresh activity
  refreshActivity: async () => {
    const { currentProject } = get();
    
    if (!currentProject) return;

    try {
      const response = await fetch(`${API_URL}/api/projects/${currentProject.project_id}/activity`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        set({ activityTimeline: data.activity });
      }
    } catch (error) {
      console.error('[Projects] Error refreshing activity:', error);
    }
  },

  // Delete project
  deleteProject: async (projectId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        set(state => ({
          projects: state.projects.filter(p => p.project_id !== projectId),
          currentProject: state.currentProject?.project_id === projectId ? null : state.currentProject,
        }));
        return true;
      }
    } catch (error) {
      console.error('[Projects] Error deleting project:', error);
    }
    return false;
  },

  // Clear current project
  clearCurrentProject: () => {
    set({
      currentProject: null,
      currentFiles: [],
      promptHistory: [],
      generationHistory: [],
      activityTimeline: [],
      currentRun: null,
      lastClassification: null,
    });
  },

  // Revert file to a specific version
  revertFileToVersion: async (path: string, versionId: string) => {
    const { currentProject, currentFiles } = get();
    if (!currentProject) return false;

    try {
      // Get the version content
      const versions = await get().getFileVersions(path);
      const targetVersion = versions.find(v => v.version_id === versionId);
      
      if (!targetVersion) {
        console.error('[Projects] Version not found');
        return false;
      }

      // Create a "revert" generation run
      const runResponse = await fetch(`${API_URL}/api/projects/${currentProject.project_id}/prompts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          prompt: `Revert ${path} to version ${targetVersion.version_number}`,
          force_rebuild: false
        }),
      });

      if (!runResponse.ok) return false;
      const runData = await runResponse.json();

      // Save the reverted content
      const saveResponse = await fetch(`${API_URL}/api/projects/${currentProject.project_id}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          files: [{
            path: targetVersion.path,
            content: targetVersion.content,
            language: currentFiles.find(f => f.path === path)?.language || 'text',
          }],
          run_id: runData.run.run_id,
          prompt_id: runData.prompt.prompt_id,
          change_reason: `Reverted to version ${targetVersion.version_number}`,
        }),
      });

      if (saveResponse.ok) {
        await get().refreshFiles();
        await get().refreshPromptHistory();
        return true;
      }
    } catch (error) {
      console.error('[Projects] Error reverting file:', error);
    }
    return false;
  },
}));
