/**
 * usePersistentGeneration - Generation hook integrated with persistent projects
 * 
 * This hook wraps useGenerationPipeline to:
 * 1. Load project context before generation
 * 2. Classify prompts as continuation vs rebuild
 * 3. Preserve existing files when continuing
 * 4. Save files with version history
 * 5. Update project architecture after generation
 */

import { useCallback, useRef } from 'react';
import { useGenerationPipeline } from './useGenerationPipeline';
import { usePersistentProjectStore, PromptType } from '@/stores/persistentProjectStore';
import { useToast } from '@/hooks/use-toast';

interface GenerationOptions {
  forceRebuild?: boolean;
  targetedFiles?: string[];
}

export function usePersistentGeneration() {
  const pipeline = useGenerationPipeline();
  const { toast } = useToast();
  
  // Persistent project store
  const currentProject = usePersistentProjectStore((s) => s.currentProject);
  const currentFiles = usePersistentProjectStore((s) => s.currentFiles);
  const loadProjectContext = usePersistentProjectStore((s) => s.loadProjectContext);
  const continueProject = usePersistentProjectStore((s) => s.continueProject);
  const saveFiles = usePersistentProjectStore((s) => s.saveFiles);
  const updateGenerationRun = usePersistentProjectStore((s) => s.updateGenerationRun);
  const updateArchitecture = usePersistentProjectStore((s) => s.updateArchitecture);
  const refreshFiles = usePersistentProjectStore((s) => s.refreshFiles);
  const lastClassification = usePersistentProjectStore((s) => s.lastClassification);

  // Track current generation context
  const generationContextRef = useRef<{
    runId: string;
    promptId: string;
    isRebuild: boolean;
    preservedPaths: string[];
  } | null>(null);

  /**
   * Generate with persistence and continuation support
   */
  const generateWithPersistence = useCallback(
    async (
      prompt: string,
      categories: string[],
      options: GenerationOptions = {}
    ) => {
      if (!currentProject) {
        toast({
          title: 'No project selected',
          description: 'Please create or select a project first.',
          variant: 'destructive',
        });
        return { success: false, error: 'No project selected' };
      }

      // 1. Continue the project (creates prompt record and run)
      const continuation = await continueProject(prompt, options.forceRebuild || false);
      
      if (!continuation) {
        toast({
          title: 'Failed to continue project',
          description: 'Could not create continuation record.',
          variant: 'destructive',
        });
        return { success: false, error: 'Failed to continue project' };
      }

      const { prompt: promptRecord, run, classification } = continuation;

      // Store context for later use
      generationContextRef.current = {
        runId: run.run_id,
        promptId: promptRecord.prompt_id,
        isRebuild: classification.is_full_rebuild,
        preservedPaths: [],
      };

      // 2. Build context for generation
      let context = '';
      let existingFilePaths: string[] = [];

      if (!classification.is_full_rebuild && currentFiles.length > 0) {
        // CONTINUATION MODE: Include existing project context
        existingFilePaths = currentFiles.map(f => f.path);
        
        // Build context summary for the AI
        const fileList = currentFiles
          .map(f => `- ${f.path} (${f.line_count} lines)`)
          .join('\n');
        
        const architectureSummary = currentProject.architecture_summary || 
          `Project with ${currentFiles.length} files`;
        
        const lastPrompts = await getRecentPromptContext();
        
        context = `
=== EXISTING PROJECT CONTEXT ===
Project: ${currentProject.name}
Architecture: ${architectureSummary}
Tech Stack: ${currentProject.tech_stack.join(', ') || 'React, TypeScript, Tailwind'}
Main Features: ${currentProject.main_features.join(', ') || 'TBD'}

=== CURRENT FILES ===
${fileList}

=== RECENT BUILD HISTORY ===
${lastPrompts}

=== CONTINUATION INSTRUCTIONS ===
This is a CONTINUATION request. The user wants to modify/extend the existing project.
- Prompt Type: ${classification.prompt_type}
- Targeted Files: ${classification.targeted_files.length > 0 ? classification.targeted_files.join(', ') : 'Auto-detect'}

IMPORTANT:
1. Only modify files that need to change for this request
2. Preserve all other existing files unchanged
3. Maintain existing architecture and patterns
4. Add new files only if necessary
5. Do NOT rebuild the entire project

USER REQUEST:
${prompt}
`.trim();

        // Mark preserved files
        if (!classification.targeted_files.length) {
          // Auto-detect: preserve all files unless they clearly need changes
          generationContextRef.current.preservedPaths = existingFilePaths;
        }
      } else {
        // FULL REBUILD MODE: Fresh generation
        context = `
=== NEW PROJECT GENERATION ===
Project Name: ${currentProject.name}
Initial Prompt: ${currentProject.initial_prompt}

${options.forceRebuild ? '(User explicitly requested full rebuild)' : ''}

USER REQUEST:
${prompt}
`.trim();
      }

      // 3. Update run status to analyzing
      await updateGenerationRun(run.run_id, {
        status: 'analyzing',
        loaded_file_count: currentFiles.length,
        loaded_context_summary: context.slice(0, 500),
      });

      // 4. Run the generation pipeline
      const result = await pipeline.generate(
        prompt,
        categories,
        context,
        existingFilePaths,
        (generatedFiles) => {
          // This callback is called to apply files
          // We'll handle persistence after generation completes
          const existingSet = new Set(existingFilePaths);
          let createdCount = 0;
          let updatedCount = 0;

          for (const file of generatedFiles) {
            if (existingSet.has(file.path)) {
              updatedCount++;
            } else {
              createdCount++;
            }
          }

          return { createdCount, updatedCount };
        }
      );

      // 5. Handle generation result
      if (result.success && result.files) {
        // Save files with version history
        await saveFiles(
          result.files.map(f => ({
            path: f.path,
            content: f.content,
            language: f.language || 'text',
          })),
          run.run_id,
          promptRecord.prompt_id,
          buildChangeSummary(classification.prompt_type, result)
        );

        // Update run with results
        const filesCreated = result.files.filter(f => !existingFilePaths.includes(f.path)).map(f => f.path);
        const filesUpdated = result.files.filter(f => existingFilePaths.includes(f.path)).map(f => f.path);

        await updateGenerationRun(run.run_id, {
          status: 'complete',
          files_created: filesCreated,
          files_updated: filesUpdated,
          ai_plan_summary: result.summary?.headline || null,
          completed_at: new Date().toISOString(),
          prompt_id: promptRecord.prompt_id,
          change_summary: buildChangeSummary(classification.prompt_type, result),
        });

        // Update project architecture based on generated files
        await updateProjectArchitecture(result.files);

        // Refresh files in store
        await refreshFiles();

        toast({
          title: classification.is_full_rebuild ? 'Project Rebuilt' : 'Project Updated',
          description: buildChangeSummary(classification.prompt_type, result),
        });
      } else {
        // Generation failed
        await updateGenerationRun(run.run_id, {
          status: 'failed',
          error_message: result.error || 'Generation failed',
          completed_at: new Date().toISOString(),
        });

        toast({
          title: 'Generation Failed',
          description: result.error || 'An error occurred during generation.',
          variant: 'destructive',
        });
      }

      generationContextRef.current = null;
      return result;
    },
    [
      currentProject,
      currentFiles,
      continueProject,
      pipeline,
      saveFiles,
      updateGenerationRun,
      refreshFiles,
      toast,
    ]
  );

  /**
   * Get recent prompt context for AI
   */
  const getRecentPromptContext = async (): Promise<string> => {
    const prompts = usePersistentProjectStore.getState().promptHistory;
    if (prompts.length === 0) return 'No previous prompts.';

    return prompts
      .slice(-5)
      .map((p, i) => `${i + 1}. [${p.prompt_type}] ${p.content.slice(0, 100)}${p.content.length > 100 ? '...' : ''} → ${p.change_summary || 'Completed'}`)
      .join('\n');
  };

  /**
   * Build a human-readable change summary
   */
  const buildChangeSummary = (promptType: PromptType, result: any): string => {
    const fileCount = result.files?.length || 0;
    
    const typeDescriptions: Record<PromptType, string> = {
      create_initial: `Created initial project with ${fileCount} files`,
      add_feature: `Added new feature with ${fileCount} files affected`,
      refine_feature: `Refined existing features, ${fileCount} files updated`,
      redesign_ui: `Redesigned UI, ${fileCount} files modified`,
      repair_bug: `Fixed bugs in ${fileCount} files`,
      refactor_code: `Refactored code across ${fileCount} files`,
      connect_backend: `Connected backend, ${fileCount} files updated`,
      replace_file: `Replaced ${fileCount} files`,
      full_rebuild: `Complete rebuild with ${fileCount} files`,
      other: `Updated ${fileCount} files`,
    };

    return typeDescriptions[promptType] || `Modified ${fileCount} files`;
  };

  /**
   * Update project architecture based on generated files
   */
  const updateProjectArchitecture = async (files: Array<{path: string; content: string}>) => {
    // Extract tech stack from files
    const techStack: string[] = ['React', 'TypeScript'];
    
    const hasCSS = files.some(f => f.path.endsWith('.css'));
    const hasTailwind = files.some(f => f.content.includes('tailwind') || f.content.includes('className='));
    const hasReactQuery = files.some(f => f.content.includes('@tanstack/react-query') || f.content.includes('useQuery'));
    const hasZustand = files.some(f => f.content.includes('zustand') || f.content.includes('create('));
    const hasRouter = files.some(f => f.content.includes('react-router'));

    if (hasTailwind) techStack.push('Tailwind CSS');
    if (hasCSS && !hasTailwind) techStack.push('CSS');
    if (hasReactQuery) techStack.push('React Query');
    if (hasZustand) techStack.push('Zustand');
    if (hasRouter) techStack.push('React Router');

    // Extract features from file structure
    const mainFeatures: string[] = [];
    
    const pages = files.filter(f => f.path.includes('/pages/'));
    const components = files.filter(f => f.path.includes('/components/'));
    
    if (pages.length > 0) {
      mainFeatures.push(`${pages.length} pages`);
    }
    if (components.length > 0) {
      mainFeatures.push(`${components.length} components`);
    }

    // Build architecture summary
    const architectureSummary = `${techStack.slice(0, 4).join(' + ')} application with ${files.length} files`;

    await updateArchitecture({
      architecture_summary: architectureSummary,
      tech_stack: [...new Set(techStack)],
      main_features: mainFeatures,
    });
  };

  return {
    // All pipeline state and methods
    ...pipeline,
    
    // Persistent generation method
    generateWithPersistence,
    
    // Current classification
    lastClassification,
    
    // Is this a continuation?
    isContinuation: lastClassification?.is_continuation ?? false,
  };
}
