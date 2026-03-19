import { supabase } from '@/lib/supabase';
import type {
  BuildStep,
  BuildSummary,
  GeneratedFileCard,
} from '@/types/generation';

/**
 * Persist a complete generation run to the database.
 * Returns the run ID for future reference.
 */
export async function persistBuildLog(params: {
  userId: string;
  projectId: string;
  prompt: string;
  steps: BuildStep[];
  fileCards: GeneratedFileCard[];
  summary: BuildSummary | null;
  error?: string;
}): Promise<string | null> {
  const { userId, projectId, prompt, steps, fileCards, summary, error } = params;

  try {
    // 1. Insert the generation run
    const { data: run, error: runErr } = await supabase
      .from('generation_runs')
      .insert({
        user_id: userId,
        project_id: projectId,
        prompt,
        status: summary ? 'complete' : error ? 'failed' : 'running',
        completed_at: summary ? new Date().toISOString() : null,
        duration_ms: summary?.duration || null,
        total_files: summary?.filesCreated ? summary.filesCreated + summary.filesUpdated : fileCards.length,
        total_lines: summary?.totalLines || 0,
        app_type: summary?.appType || null,
        stack: summary?.stack || [],
        validation_result: summary?.validationResult || null,
        repair_count: summary?.repairCount || 0,
        preview_status: summary?.previewStatus || null,
        error_message: error || null,
      })
      .select('id')
      .single();

    if (runErr || !run) {
      console.error('[BuildLogs] Failed to insert run:', runErr);
      return null;
    }

    const runId = run.id;

    // 2. Insert steps
    if (steps.length > 0) {
      const stepRows = steps.map((s) => ({
        run_id: runId,
        step_name: s.name,
        step_index: s.index,
        status: s.status,
        detail: s.detail || null,
        error_message: s.errorMessage || null,
        started_at: s.startedAt || null,
        completed_at: s.completedAt || null,
      }));

      const { error: stepsErr } = await supabase
        .from('generation_steps')
        .insert(stepRows);

      if (stepsErr) {
        console.error('[BuildLogs] Failed to insert steps:', stepsErr);
      }
    }

    // 3. Insert generated files (without content to stay under 1MB limit)
    if (fileCards.length > 0) {
      const fileRows = fileCards.map((f) => ({
        run_id: runId,
        file_path: f.path,
        file_purpose: f.purpose,
        language: f.language,
        line_count: f.lineCount,
        is_new: f.isNew,
        status: f.status,
      }));

      const { error: filesErr } = await supabase
        .from('generated_files')
        .insert(fileRows);

      if (filesErr) {
        console.error('[BuildLogs] Failed to insert files:', filesErr);
      }
    }

    console.log('[BuildLogs] Persisted run:', runId);
    return runId;
  } catch (err) {
    console.error('[BuildLogs] Unexpected error:', err);
    return null;
  }
}

/**
 * Fetch build history for a project.
 */
export async function fetchBuildHistory(projectId: string) {
  const { data, error } = await supabase
    .from('generation_runs')
    .select(`
      *,
      generation_steps (*),
      generated_files (*)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('[BuildLogs] Failed to fetch history:', error);
    return [];
  }

  return data || [];
}

/**
 * Fetch all runs for a user (for dashboard).
 */
export async function fetchUserBuildRuns(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('generation_runs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[BuildLogs] Failed to fetch user runs:', error);
    return [];
  }

  return data || [];
}
