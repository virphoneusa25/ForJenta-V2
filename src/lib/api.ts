// ─── Types ─────────────────────────────────────────────────────────

export type RouterTask =
  | "plan"
  | "architect"
  | "manifest"
  | "ui"
  | "backend"
  | "wiring"
  | "debug"
  | "repair"
  | "docs";

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface GenerateCodeResult {
  success: boolean;
  projectName: string;
  explanation: string;
  files: GeneratedFile[];
  error?: string;
  pipeline?: {
    blueprint?: any;
    architecture?: any;
    manifest?: any;
  };
}

export interface SingleTaskResult {
  success: boolean;
  task: RouterTask;
  data: any;
  error?: string;
}

export interface PipelineProgress {
  stage: RouterTask | "pipeline" | "complete";
  label: string;
  step: number;
  totalSteps: number;
}

export type OnProgressCallback = (progress: PipelineProgress) => void;

// ─── Router Labels ─────────────────────────────────────────────────

const ROUTER_LABELS: Record<RouterTask | "pipeline" | "complete", string> = {
  pipeline: "Initializing pipeline...",
  plan: "Planning build brief...",
  architect: "Designing architecture...",
  manifest: "Building file manifest...",
  ui: "Generating frontend UI...",
  backend: "Generating backend code...",
  wiring: "Wiring imports & exports...",
  debug: "Diagnosing errors...",
  repair: "Repairing broken files...",
  docs: "Writing documentation...",
  complete: "Generation complete!",
};

// ─── API URL ─────────────────────────────────────────────────────
const API_URL = import.meta.env.VITE_BACKEND_URL || '';

// ─── Backend API Invoker ─────────────────────────────────────────

async function invokeGenerateAPI(body: Record<string, any>): Promise<any> {
  const response = await fetch(`${API_URL}/api/generate-code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Generation failed (${response.status})`;
    try {
      const parsed = JSON.parse(errorText);
      errorMessage = parsed.error || parsed.detail || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();

  if (!data || data.success === false) {
    throw new Error(data?.error || "Generation request failed");
  }

  return data;
}

// ─── Full Pipeline Generation ──────────────────────────────────────

export async function generateCode(
  prompt: string,
  categories: string[] = ["Web"],
  context?: string,
  onProgress?: OnProgressCallback
): Promise<GenerateCodeResult> {
  console.log("=== CALLING GENERATE-CODE PIPELINE ===");
  console.log("Prompt:", prompt.substring(0, 80));
  console.log("Categories:", categories);

  onProgress?.({
    stage: "pipeline",
    label: ROUTER_LABELS.pipeline,
    step: 0,
    totalSteps: 7,
  });

  try {
    // Notify progress that pipeline is starting
    onProgress?.({
      stage: "plan",
      label: ROUTER_LABELS.plan,
      step: 1,
      totalSteps: 7,
    });

    const data = await invokeGenerateAPI({
      prompt,
      categories,
      context: context || "",
      mode: context ? "continuation" : "full",
    });

    onProgress?.({
      stage: "complete",
      label: ROUTER_LABELS.complete,
      step: 7,
      totalSteps: 7,
    });

    console.log(
      "Pipeline result:",
      data?.projectName,
      "files:",
      data?.files?.length
    );

    return {
      success: true,
      projectName: data.projectName || "generated-app",
      explanation: data.explanation || "AI-generated project",
      files: data.files || [],
      pipeline: data.pipeline,
    };
  } catch (err: any) {
    console.error("Pipeline error:", err);
    return {
      success: false,
      projectName: "",
      explanation: "",
      files: [],
      error: err.message || "Generation failed",
    };
  }
}

// ─── Single Router Task ────────────────────────────────────────────

export async function callRouterTask(
  task: RouterTask,
  prompt: string,
  context?: string
): Promise<SingleTaskResult> {
  console.log(`=== CALLING ROUTER TASK: ${task} ===`);

  try {
    const data = await invokeGenerateAPI({
      prompt,
      context: context || "",
      categories: [],
      mode: task,
    });

    return {
      success: true,
      task,
      data: data.data || data,
    };
  } catch (err: any) {
    console.error(`Router task ${task} error:`, err);
    return {
      success: false,
      task,
      data: null,
      error: err.message || `${task} failed`,
    };
  }
}

// ─── Debug + Repair Flow ───────────────────────────────────────────

export async function debugAndRepair(
  errorLogs: string,
  currentFiles: { path: string; content: string }[]
): Promise<GenerateCodeResult> {
  console.log("=== DEBUG + REPAIR FLOW ===");

  try {
    // Step 1: Diagnose with debug-router
    const fileContext = currentFiles
      .map((f) => `--- ${f.path} ---\n${f.content}`)
      .join("\n\n")
      .substring(0, 3000);

    const debugResult = await callRouterTask(
      "debug",
      `Error logs:\n${errorLogs}\n\nCurrent files:\n${fileContext}`
    );

    if (!debugResult.success) {
      return {
        success: false,
        projectName: "",
        explanation: "",
        files: [],
        error: `Debug failed: ${debugResult.error}`,
      };
    }

    const repairPlan = debugResult.data?.repairPlan || [];
    const diagnosis = debugResult.data?.diagnosis;

    if (repairPlan.length === 0) {
      return {
        success: true,
        projectName: "",
        explanation: diagnosis?.rootCause || "No issues found",
        files: [],
      };
    }

    // Step 2: Repair with repair-router
    const failingFiles = currentFiles.filter((f) =>
      (diagnosis?.failingFiles || []).includes(f.path)
    );
    const failingContext = failingFiles
      .map((f) => `--- ${f.path} ---\n${f.content}`)
      .join("\n\n");

    const repairResult = await callRouterTask(
      "repair",
      `Repair plan:\n${JSON.stringify(repairPlan, null, 2)}\n\nFailing files:\n${failingContext}\n\nDiagnosis: ${diagnosis?.rootCause || "Unknown"}`
    );

    if (!repairResult.success) {
      return {
        success: false,
        projectName: "",
        explanation: "",
        files: [],
        error: `Repair failed: ${repairResult.error}`,
      };
    }

    const repairedFiles = repairResult.data?.repairedFiles || [];

    return {
      success: true,
      projectName: "",
      explanation: `Diagnosed: ${diagnosis?.rootCause || "Error found"}. Repaired ${repairedFiles.length} file(s).`,
      files: repairedFiles.map((f: any) => ({
        path: f.path,
        content: f.content,
        language: f.language || "text",
      })),
    };
  } catch (err: any) {
    console.error("Debug+Repair error:", err);
    return {
      success: false,
      projectName: "",
      explanation: "",
      files: [],
      error: err.message || "Debug and repair failed",
    };
  }
}

// ─── Convenience: Get Router Label ─────────────────────────────────

export function getRouterLabel(
  stage: RouterTask | "pipeline" | "complete"
): string {
  return ROUTER_LABELS[stage] || "Processing...";
}
